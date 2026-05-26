import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { sendTransactionalEmail } from '@/lib/utils/email';

const log = createLogger('NotificationService');

type NotificationPriority = 'high' | 'medium' | 'low';
type NotificationChannel = 'in_app' | 'email';
type PreferenceCategoryKey =
  | 'quizCompletion'
  | 'parentUpdates'
  | 'teacherAlerts'
  | 'paymentReceipts'
  | 'milestoneCompletions';

export interface NotificationRecord {
  id: string;
  schoolId?: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  priority: NotificationPriority;
  read: boolean;
  channels: NotificationChannel[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string | null;
}

export interface CreateNotificationInput {
  schoolId?: string | null;
  userId: string;
  title: string;
  content: string;
  category?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  metadata?: Record<string, unknown>;
  email?: string | null;
}

export interface BillingLifecycleNotificationInput {
  schoolId: string;
  status: string;
  planCode?: string;
  reason?: string;
  changedByUserId?: string;
}

export interface NotificationPreferences {
  userId: string;
  schoolId?: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  categories: Record<PreferenceCategoryKey, boolean>;
  updatedAt?: string;
}

export interface UpdateNotificationPreferencesInput {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  categories?: Partial<Record<PreferenceCategoryKey, boolean>>;
}

let schemaEnsured = false;

async function ensureNotificationSchema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }

  await query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      school_id TEXT,
      user_id TEXT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'general',
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      is_read BOOLEAN NOT NULL DEFAULT false,
      channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
      delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      email_status VARCHAR(30),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP
    )`
  );

  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON notifications(school_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`);
  await query(
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      user_id TEXT NOT NULL UNIQUE,
      school_id TEXT,
      in_app_enabled BOOLEAN NOT NULL DEFAULT true,
      email_enabled BOOLEAN NOT NULL DEFAULT true,
      quiz_completion BOOLEAN NOT NULL DEFAULT true,
      parent_updates BOOLEAN NOT NULL DEFAULT true,
      teacher_alerts BOOLEAN NOT NULL DEFAULT true,
      payment_receipts BOOLEAN NOT NULL DEFAULT true,
      milestone_completions BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_notification_prefs_school_id ON notification_preferences(school_id)`
  );

  schemaEnsured = true;
}

function normalizeChannels(input?: NotificationChannel[]): NotificationChannel[] {
  if (!input || input.length === 0) {
    return ['in_app'];
  }

  const unique = new Set<NotificationChannel>();
  for (const channel of input) {
    if (channel === 'in_app' || channel === 'email') {
      unique.add(channel);
    }
  }

  if (unique.size === 0) {
    unique.add('in_app');
  }

  return [...unique];
}

function getDefaultPreferences(userId: string, schoolId?: string | null): NotificationPreferences {
  return {
    userId,
    schoolId: schoolId || undefined,
    inAppEnabled: true,
    emailEnabled: true,
    categories: {
      quizCompletion: true,
      parentUpdates: true,
      teacherAlerts: true,
      paymentReceipts: true,
      milestoneCompletions: true,
    },
  };
}

function mapCategoryToPreferenceKey(category: string): PreferenceCategoryKey | null {
  const normalized = category.trim().toLowerCase();

  if (normalized === 'assessment' || normalized === 'quiz' || normalized === 'quiz_completion') {
    return 'quizCompletion';
  }
  if (normalized === 'parent_update' || normalized === 'parent_updates') {
    return 'parentUpdates';
  }
  if (normalized === 'teacher_alert' || normalized === 'teacher_alerts' || normalized === 'alert') {
    return 'teacherAlerts';
  }
  if (
    normalized === 'billing' ||
    normalized === 'payment' ||
    normalized === 'payment_receipt' ||
    normalized === 'payment_receipts'
  ) {
    return 'paymentReceipts';
  }
  if (
    normalized === 'milestone' ||
    normalized === 'milestones' ||
    normalized === 'learning' ||
    normalized === 'achievement'
  ) {
    return 'milestoneCompletions';
  }

  return null;
}

function mapRowToPreferences(
  userId: string,
  schoolId: string | null | undefined,
  row?: Record<string, unknown>
): NotificationPreferences {
  if (!row) {
    return getDefaultPreferences(userId, schoolId);
  }

  const defaults = getDefaultPreferences(userId, schoolId);
  return {
    userId,
    schoolId: row.school_id ? String(row.school_id) : defaults.schoolId,
    inAppEnabled:
      typeof row.in_app_enabled === 'boolean' ? row.in_app_enabled : defaults.inAppEnabled,
    emailEnabled:
      typeof row.email_enabled === 'boolean' ? row.email_enabled : defaults.emailEnabled,
    categories: {
      quizCompletion:
        typeof row.quiz_completion === 'boolean'
          ? row.quiz_completion
          : defaults.categories.quizCompletion,
      parentUpdates:
        typeof row.parent_updates === 'boolean'
          ? row.parent_updates
          : defaults.categories.parentUpdates,
      teacherAlerts:
        typeof row.teacher_alerts === 'boolean'
          ? row.teacher_alerts
          : defaults.categories.teacherAlerts,
      paymentReceipts:
        typeof row.payment_receipts === 'boolean'
          ? row.payment_receipts
          : defaults.categories.paymentReceipts,
      milestoneCompletions:
        typeof row.milestone_completions === 'boolean'
          ? row.milestone_completions
          : defaults.categories.milestoneCompletions,
    },
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapRowToNotification(row: Record<string, unknown>): NotificationRecord {
  let channels: NotificationChannel[] = ['in_app'];
  try {
    const parsed = row.channels;
    if (Array.isArray(parsed)) {
      channels = parsed
        .map((channel) => String(channel))
        .filter((channel): channel is NotificationChannel => channel === 'in_app' || channel === 'email');
    } else if (typeof parsed === 'string') {
      const fromString = JSON.parse(parsed);
      if (Array.isArray(fromString)) {
        channels = fromString
          .map((channel) => String(channel))
          .filter((channel): channel is NotificationChannel => channel === 'in_app' || channel === 'email');
      }
    }
  } catch {
    channels = ['in_app'];
  }

  return {
    id: String(row.id || ''),
    schoolId: row.school_id ? String(row.school_id) : undefined,
    userId: String(row.user_id || ''),
    title: String(row.title || ''),
    content: String(row.content || ''),
    category: String(row.category || 'general'),
    priority: (String(row.priority || 'medium') as NotificationPriority),
    read: Boolean(row.is_read),
    channels,
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    readAt: row.read_at ? String(row.read_at) : null,
  };
}

class NotificationService {
  async getPreferences(userId: string, schoolId?: string | null): Promise<NotificationPreferences> {
    await ensureNotificationSchema();

    const result = await query(
      `SELECT
         user_id,
         school_id,
         in_app_enabled,
         email_enabled,
         quiz_completion,
         parent_updates,
         teacher_alerts,
         payment_receipts,
         milestone_completions,
         updated_at
       FROM notification_preferences
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    return mapRowToPreferences(
      userId,
      schoolId,
      result.rows[0] as Record<string, unknown> | undefined
    );
  }

  async updatePreferences(
    userId: string,
    schoolId: string | null | undefined,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    await ensureNotificationSchema();
    const current = await this.getPreferences(userId, schoolId);

    const next: NotificationPreferences = {
      userId,
      schoolId: schoolId || current.schoolId,
      inAppEnabled:
        typeof input.inAppEnabled === 'boolean' ? input.inAppEnabled : current.inAppEnabled,
      emailEnabled:
        typeof input.emailEnabled === 'boolean' ? input.emailEnabled : current.emailEnabled,
      categories: {
        quizCompletion:
          typeof input.categories?.quizCompletion === 'boolean'
            ? input.categories.quizCompletion
            : current.categories.quizCompletion,
        parentUpdates:
          typeof input.categories?.parentUpdates === 'boolean'
            ? input.categories.parentUpdates
            : current.categories.parentUpdates,
        teacherAlerts:
          typeof input.categories?.teacherAlerts === 'boolean'
            ? input.categories.teacherAlerts
            : current.categories.teacherAlerts,
        paymentReceipts:
          typeof input.categories?.paymentReceipts === 'boolean'
            ? input.categories.paymentReceipts
            : current.categories.paymentReceipts,
        milestoneCompletions:
          typeof input.categories?.milestoneCompletions === 'boolean'
            ? input.categories.milestoneCompletions
            : current.categories.milestoneCompletions,
      },
    };

    const result = await query(
      `INSERT INTO notification_preferences (
         user_id,
         school_id,
         in_app_enabled,
         email_enabled,
         quiz_completion,
         parent_updates,
         teacher_alerts,
         payment_receipts,
         milestone_completions,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE
       SET school_id = EXCLUDED.school_id,
           in_app_enabled = EXCLUDED.in_app_enabled,
           email_enabled = EXCLUDED.email_enabled,
           quiz_completion = EXCLUDED.quiz_completion,
           parent_updates = EXCLUDED.parent_updates,
           teacher_alerts = EXCLUDED.teacher_alerts,
           payment_receipts = EXCLUDED.payment_receipts,
           milestone_completions = EXCLUDED.milestone_completions,
           updated_at = CURRENT_TIMESTAMP
       RETURNING
         user_id,
         school_id,
         in_app_enabled,
         email_enabled,
         quiz_completion,
         parent_updates,
         teacher_alerts,
         payment_receipts,
         milestone_completions,
         updated_at`,
      [
        userId,
        next.schoolId || null,
        next.inAppEnabled,
        next.emailEnabled,
        next.categories.quizCompletion,
        next.categories.parentUpdates,
        next.categories.teacherAlerts,
        next.categories.paymentReceipts,
        next.categories.milestoneCompletions,
      ]
    );

    return mapRowToPreferences(
      userId,
      schoolId,
      result.rows[0] as Record<string, unknown> | undefined
    );
  }

  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    await ensureNotificationSchema();

    const preferences = await this.getPreferences(input.userId, input.schoolId || null);
    const category = input.category || 'general';
    const preferenceCategory = mapCategoryToPreferenceKey(category);
    const categoryEnabled =
      !preferenceCategory || Boolean(preferences.categories[preferenceCategory]);

    const channels = normalizeChannels(input.channels);
    const filteredChannels = channels.filter((channel) => {
      if (channel === 'in_app') {
        return preferences.inAppEnabled && categoryEnabled;
      }
      if (channel === 'email') {
        return preferences.emailEnabled && categoryEnabled;
      }
      return false;
    });

    const wantsEmail = filteredChannels.includes('email');
    let emailStatus = 'skipped';
    let deliveryStatus = filteredChannels.length > 0 ? 'delivered' : 'suppressed';

    if (!categoryEnabled) {
      emailStatus = 'suppressed';
      deliveryStatus = 'suppressed';
    }

    if (wantsEmail) {
      if (input.email) {
        const emailResult = await sendTransactionalEmail({
          to: input.email,
          subject: input.title,
          text: input.content,
        });
        emailStatus = emailResult.success ? 'sent' : 'failed';
        deliveryStatus = emailResult.success ? 'delivered' : 'partial';
      } else {
        emailStatus = 'missing_recipient';
        deliveryStatus = 'partial';
      }
    }

    const result = await query(
      `INSERT INTO notifications
       (school_id, user_id, title, content, category, priority, is_read, channels, delivery_status, email_status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7::jsonb, $8, $9, $10::jsonb)
       RETURNING id, school_id, user_id, title, content, category, priority, is_read, channels, metadata, created_at, read_at`,
      [
        input.schoolId || null,
        input.userId,
        input.title,
        input.content,
        category,
        input.priority || 'medium',
        JSON.stringify(filteredChannels),
        deliveryStatus,
        emailStatus,
        JSON.stringify({
          ...(input.metadata || {}),
          preferenceCategory,
          categorySuppressed: !categoryEnabled,
        }),
      ]
    );

    const row = result.rows[0] || {
      id: `notification-${Date.now()}`,
      school_id: input.schoolId || null,
      user_id: input.userId,
      title: input.title,
      content: input.content,
      category,
      priority: input.priority || 'medium',
      is_read: false,
      channels: filteredChannels,
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
      read_at: null,
    };

    return mapRowToNotification(row);
  }

  async listForUser(
    userId: string,
    opts: { category?: string; unreadOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<NotificationRecord[]> {
    await ensureNotificationSchema();

    const conditions = ['user_id = $1', `channels ? 'in_app'`];
    const params: unknown[] = [userId];
    let idx = 2;

    if (opts.category) {
      conditions.push(`category = $${idx++}`);
      params.push(opts.category);
    }
    if (opts.unreadOnly) {
      conditions.push('is_read = false');
    }

    const limit = Math.min(Math.max(Number(opts.limit || 50), 1), 200);
    const offset = Math.max(Number(opts.offset || 0), 0);

    params.push(limit);
    params.push(offset);

    const result = await query(
      `SELECT id, school_id, user_id, title, content, category, priority, is_read, channels, metadata, created_at, read_at
       FROM notifications
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    return result.rows.map((row) => mapRowToNotification(row as Record<string, unknown>));
  }

  async markRead(userId: string, notificationId: string): Promise<boolean> {
    await ensureNotificationSchema();
    const result = await query(
      `UPDATE notifications
       SET is_read = true, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return Number(result.rowCount || 0) > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    await ensureNotificationSchema();
    const result = await query(
      `UPDATE notifications
       SET is_read = true, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE user_id = $1
         AND is_read = false
         AND channels ? 'in_app'`,
      [userId]
    );
    return Number(result.rowCount || 0);
  }

  async getUnreadCount(userId: string): Promise<number> {
    await ensureNotificationSchema();
    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return Number(result.rows[0]?.count || 0);
  }

  async notifyBillingLifecycle(input: BillingLifecycleNotificationInput): Promise<void> {
    await ensureNotificationSchema();

    const recipients = await query(
      `SELECT id, email, role
       FROM users
       WHERE school_id = $1
         AND role IN ('principal', 'school_admin', 'accountant')
         AND is_active = true`,
      [input.schoolId]
    );

    const title = `Billing Status Updated: ${input.status}`;
    const content = input.reason
      ? `School billing lifecycle changed to "${input.status}". Reason: ${input.reason}`
      : `School billing lifecycle changed to "${input.status}".`;

    for (const row of recipients.rows as Array<Record<string, unknown>>) {
      try {
        await this.create({
          schoolId: input.schoolId,
          userId: String(row.id),
          title,
          content,
          category: 'billing',
          priority: input.status === 'suspended' || input.status === 'cancelled' ? 'high' : 'medium',
          channels: ['in_app', 'email'],
          email: row.email ? String(row.email) : null,
          metadata: {
            status: input.status,
            planCode: input.planCode || null,
            reason: input.reason || null,
            changedByUserId: input.changedByUserId || null,
            recipientRole: row.role ? String(row.role) : null,
          },
        });
      } catch (error) {
        log.warn('Failed to create billing lifecycle notification', {
          schoolId: input.schoolId,
          recipientId: row.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

export const notificationService = new NotificationService();
