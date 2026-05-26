import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('SaaSBillingService');

type SchoolLifecycleStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'suspended';

interface SchoolBillingSnapshot {
  id: string;
  name?: string;
  status?: SchoolLifecycleStatus;
  subscriptionStatus?: string;
  nextBillingDate?: Date | null;
  lastPaymentDate?: Date | null;
}

interface EvaluationResult {
  schoolId: string;
  schoolName?: string;
  previousStatus?: string;
  previousSubscriptionStatus?: string;
  newStatus?: string;
  newSubscriptionStatus?: string;
  suspended: boolean;
  reason: string;
  overdueInvoices: number;
  changed: boolean;
}

type BillingLifecycleAction = 'start_trial' | 'activate' | 'pause' | 'resume' | 'cancel';

interface BillingLifecycleTransitionOptions {
  reason?: string;
  planCode?: string;
  monthlyPrice?: number;
  studentLimit?: number;
}

interface BillingLifecycleTransitionResult {
  schoolId: string;
  schoolName?: string;
  action: BillingLifecycleAction;
  lifecycleStatus: string;
  subscriptionStatus: string;
  previousLifecycleStatus?: string;
  previousSubscriptionStatus?: string;
  reason?: string;
  planCode?: string;
  monthlyPrice?: number;
  studentLimit?: number;
  nextBillingDate?: Date | null;
  lastPaymentDate?: Date | null;
  auditId?: string | null;
  changed: boolean;
}

function quoteIdentifier(input: string): string {
  return `"${input.replace(/"/g, '""')}"`;
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );

  return Boolean(result.rows[0]?.exists);
}

async function getColumns(tableName: string): Promise<Set<string>> {
  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );

  return new Set<string>(result.rows.map((row: any) => row.column_name));
}

async function loadSchoolSnapshot(schoolId: string): Promise<SchoolBillingSnapshot | null> {
  const columns = await getColumns('schools');
  const selectParts: string[] = ['id'];

  if (columns.has('name')) selectParts.push('name');
  if (columns.has('status')) selectParts.push('status');
  if (columns.has('subscription_status')) selectParts.push('subscription_status');
  if (columns.has('next_billing_date')) selectParts.push('next_billing_date');
  if (columns.has('last_payment_date')) selectParts.push('last_payment_date');

  const sql = `SELECT ${selectParts.map((part) => quoteIdentifier(part)).join(', ')} FROM schools WHERE id = $1`;
  const result = await query(sql, [schoolId]);

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    subscriptionStatus: row.subscription_status,
    nextBillingDate: row.next_billing_date,
    lastPaymentDate: row.last_payment_date,
  };
}

async function getOverdueInvoiceCount(schoolId: string): Promise<number> {
  const hasInvoicesTable = await tableExists('invoices');
  if (!hasInvoicesTable) {
    return 0;
  }

  const invoiceColumns = await getColumns('invoices');
  if (!invoiceColumns.has('school_id') || !invoiceColumns.has('status')) {
    return 0;
  }

  const hasDueDate = invoiceColumns.has('due_date');

  const result = await query(
    `SELECT COUNT(*)::int AS count
     FROM invoices
     WHERE school_id = $1
       AND LOWER(status) IN ('pending', 'overdue', 'past_due')
       ${hasDueDate ? 'AND due_date IS NOT NULL AND due_date < NOW()' : ''}`,
    [schoolId]
  );

  return Number(result.rows[0]?.count || 0);
}

async function applyStatusUpdate(
  schoolId: string,
  update: { status?: string; subscriptionStatus?: string }
): Promise<void> {
  const columns = await getColumns('schools');
  const updates: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (update.status !== undefined && columns.has('status')) {
    updates.push(`status = $${index++}`);
    values.push(update.status);
  }

  if (update.subscriptionStatus !== undefined && columns.has('subscription_status')) {
    updates.push(`subscription_status = $${index++}`);
    values.push(update.subscriptionStatus);
  }

  if (updates.length === 0) {
    return;
  }

  if (columns.has('updated_at')) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
  }

  values.push(schoolId);

  await query(`UPDATE schools SET ${updates.join(', ')} WHERE id = $${index}`, values);
}

async function applyLifecycleTransitionUpdate(
  schoolId: string,
  update: {
    status: string;
    subscriptionStatus: string;
    planCode?: string;
    monthlyPrice?: number;
    studentLimit?: number;
    nextBillingDate?: Date | null;
    lastPaymentDate?: Date | null;
  }
): Promise<void> {
  const columns = await getColumns('schools');
  const updates: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (columns.has('status')) {
    updates.push(`status = $${index++}`);
    values.push(update.status);
  }

  if (columns.has('subscription_status')) {
    updates.push(`subscription_status = $${index++}`);
    values.push(update.subscriptionStatus);
  }

  if (update.planCode !== undefined && columns.has('subscription_tier')) {
    updates.push(`subscription_tier = $${index++}`);
    values.push(update.planCode);
  }

  if (update.monthlyPrice !== undefined && columns.has('monthly_price')) {
    updates.push(`monthly_price = $${index++}`);
    values.push(update.monthlyPrice);
  }

  if (update.studentLimit !== undefined && columns.has('student_limit')) {
    updates.push(`student_limit = $${index++}`);
    values.push(update.studentLimit);
  }

  if (update.nextBillingDate !== undefined && columns.has('next_billing_date')) {
    updates.push(`next_billing_date = $${index++}`);
    values.push(update.nextBillingDate);
  }

  if (update.lastPaymentDate !== undefined && columns.has('last_payment_date')) {
    updates.push(`last_payment_date = $${index++}`);
    values.push(update.lastPaymentDate);
  }

  if (updates.length === 0) {
    return;
  }

  if (columns.has('updated_at')) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
  }

  values.push(schoolId);
  await query(`UPDATE schools SET ${updates.join(', ')} WHERE id = $${index}`, values);
}

async function addAuditLog(
  schoolId: string,
  action: string,
  actorId: string | null,
  payload: unknown
): Promise<string | null> {
  const hasAuditTable = await tableExists('audit_logs');
  if (!hasAuditTable) {
    return null;
  }

  const columns = await getColumns('audit_logs');
  if (!columns.has('school_id') || !columns.has('action')) {
    return null;
  }

  const insertColumns = ['school_id', 'action'];
  const insertValues: unknown[] = [schoolId, action];

  if (columns.has('user_id')) {
    insertColumns.push('user_id');
    insertValues.push(actorId);
  }

  if (columns.has('resource_type')) {
    insertColumns.push('resource_type');
    insertValues.push('school_subscription');
  }

  if (columns.has('resource_id')) {
    insertColumns.push('resource_id');
    insertValues.push(schoolId);
  }

  if (columns.has('changes')) {
    insertColumns.push('changes');
    insertValues.push(JSON.stringify(payload));
  } else if (columns.has('details')) {
    insertColumns.push('details');
    insertValues.push(JSON.stringify(payload));
  }

  const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');

  const returningClause = columns.has('id') ? ' RETURNING id' : '';
  const result = await query(
    `INSERT INTO audit_logs (${insertColumns.map((c) => quoteIdentifier(c)).join(', ')}) VALUES (${placeholders})${returningClause}`,
    insertValues
  );

  return columns.has('id') ? (result.rows[0]?.id ? String(result.rows[0].id) : null) : null;
}

export class SaaSBillingService {
  static async transitionSchoolBillingLifecycle(
    schoolId: string,
    action: BillingLifecycleAction,
    actorId: string | null,
    options: BillingLifecycleTransitionOptions = {}
  ): Promise<BillingLifecycleTransitionResult> {
    const snapshot = await loadSchoolSnapshot(schoolId);
    if (!snapshot) {
      throw new Error('School not found');
    }

    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    let lifecycleStatus = snapshot.status || 'active';
    let subscriptionStatus = snapshot.subscriptionStatus || 'active';
    let nextBillingDate: Date | null | undefined;
    let lastPaymentDate: Date | null | undefined;

    switch (action) {
      case 'start_trial':
        lifecycleStatus = 'approved';
        subscriptionStatus = 'trial';
        nextBillingDate = next14Days;
        break;
      case 'activate':
        lifecycleStatus = 'active';
        subscriptionStatus = 'active';
        lastPaymentDate = now;
        nextBillingDate = next30Days;
        break;
      case 'pause':
        lifecycleStatus = 'suspended';
        subscriptionStatus = 'suspended';
        break;
      case 'resume':
        lifecycleStatus = 'active';
        subscriptionStatus = 'active';
        nextBillingDate = next30Days;
        break;
      case 'cancel':
        lifecycleStatus = 'suspended';
        subscriptionStatus = 'cancelled';
        break;
      default:
        throw new Error(`Unsupported billing lifecycle action: ${action}`);
    }

    const changed =
      lifecycleStatus !== (snapshot.status || 'active') ||
      subscriptionStatus !== (snapshot.subscriptionStatus || 'active') ||
      options.planCode !== undefined ||
      options.monthlyPrice !== undefined ||
      options.studentLimit !== undefined;

    await applyLifecycleTransitionUpdate(schoolId, {
      status: lifecycleStatus,
      subscriptionStatus,
      planCode: options.planCode,
      monthlyPrice: options.monthlyPrice,
      studentLimit: options.studentLimit,
      nextBillingDate,
      lastPaymentDate,
    });

    const auditId = await addAuditLog(schoolId, 'school_subscription_lifecycle_transition', actorId, {
      action,
      reason: options.reason || null,
      previousStatus: snapshot.status || null,
      previousSubscriptionStatus: snapshot.subscriptionStatus || null,
      newStatus: lifecycleStatus,
      newSubscriptionStatus: subscriptionStatus,
      planCode: options.planCode || null,
      monthlyPrice: options.monthlyPrice ?? null,
      studentLimit: options.studentLimit ?? null,
    });

    return {
      schoolId,
      schoolName: snapshot.name,
      action,
      lifecycleStatus,
      subscriptionStatus,
      previousLifecycleStatus: snapshot.status,
      previousSubscriptionStatus: snapshot.subscriptionStatus,
      reason: options.reason,
      planCode: options.planCode,
      monthlyPrice: options.monthlyPrice,
      studentLimit: options.studentLimit,
      nextBillingDate: nextBillingDate ?? snapshot.nextBillingDate ?? null,
      lastPaymentDate: lastPaymentDate ?? snapshot.lastPaymentDate ?? null,
      auditId,
      changed,
    };
  }

  static async evaluateSchoolPaymentStatus(
    schoolId: string,
    actorId: string | null = null
  ): Promise<EvaluationResult> {
    const snapshot = await loadSchoolSnapshot(schoolId);
    if (!snapshot) {
      throw new Error('School not found');
    }

    const overdueInvoices = await getOverdueInvoiceCount(schoolId);

    const billingDatePastDue = Boolean(
      snapshot.nextBillingDate && new Date(snapshot.nextBillingDate).getTime() < Date.now()
    );

    const shouldSuspend = overdueInvoices > 0 || billingDatePastDue;

    const nextStatus = shouldSuspend ? 'suspended' : 'active';
    const nextSubscriptionStatus = shouldSuspend ? 'overdue' : 'active';

    // Keep non-operational states untouched unless school is active/suspended.
    const mutableStatuses = new Set(['active', 'suspended', 'approved']);
    const canMutateLifecycle = !snapshot.status || mutableStatuses.has(snapshot.status);

    const nextLifecycleStatus = canMutateLifecycle ? nextStatus : snapshot.status;
    const changed =
      snapshot.status !== nextLifecycleStatus ||
      (snapshot.subscriptionStatus !== undefined && snapshot.subscriptionStatus !== nextSubscriptionStatus);

    if (changed) {
      await applyStatusUpdate(schoolId, {
        status: nextLifecycleStatus,
        subscriptionStatus: nextSubscriptionStatus,
      });

      await addAuditLog(schoolId, 'school_subscription_status_sync', actorId, {
        previousStatus: snapshot.status,
        previousSubscriptionStatus: snapshot.subscriptionStatus,
        newStatus: nextLifecycleStatus,
        newSubscriptionStatus: nextSubscriptionStatus,
        overdueInvoices,
        billingDatePastDue,
      });
    }

    return {
      schoolId,
      schoolName: snapshot.name,
      previousStatus: snapshot.status,
      previousSubscriptionStatus: snapshot.subscriptionStatus,
      newStatus: nextLifecycleStatus,
      newSubscriptionStatus: nextSubscriptionStatus,
      suspended: nextLifecycleStatus === 'suspended',
      reason: shouldSuspend
        ? `Payment overdue: ${overdueInvoices} overdue invoice(s)${billingDatePastDue ? ' and billing date passed' : ''}`
        : 'Payment is current',
      overdueInvoices,
      changed,
    };
  }

  static async enforceAllSchools(actorId: string | null = null): Promise<{
    total: number;
    suspended: number;
    active: number;
    changed: number;
    results: EvaluationResult[];
  }> {
    const schoolColumns = await getColumns('schools');
    if (!schoolColumns.has('id')) {
      return { total: 0, suspended: 0, active: 0, changed: 0, results: [] };
    }

    const statusFilter = schoolColumns.has('status')
      ? `WHERE status IN ('active', 'suspended', 'approved')`
      : '';

    const schoolResult = await query(`SELECT id FROM schools ${statusFilter}`);

    const results: EvaluationResult[] = [];

    for (const row of schoolResult.rows) {
      try {
        const evaluation = await this.evaluateSchoolPaymentStatus(row.id, actorId);
        results.push(evaluation);
      } catch (error) {
        log.error('Failed to evaluate school subscription state', {
          schoolId: row.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      total: results.length,
      suspended: results.filter((r) => r.suspended).length,
      active: results.filter((r) => !r.suspended).length,
      changed: results.filter((r) => r.changed).length,
      results,
    };
  }

  static async setSchoolEnabled(
    schoolId: string,
    enabled: boolean,
    actorId: string,
    reason?: string
  ): Promise<EvaluationResult> {
    const snapshot = await loadSchoolSnapshot(schoolId);
    if (!snapshot) {
      throw new Error('School not found');
    }

    const nextStatus = enabled ? 'active' : 'suspended';
    const nextSubscriptionStatus = enabled ? 'active' : 'overdue';

    await applyStatusUpdate(schoolId, {
      status: nextStatus,
      subscriptionStatus: nextSubscriptionStatus,
    });

    await addAuditLog(schoolId, enabled ? 'school_enabled' : 'school_disabled', actorId, {
      previousStatus: snapshot.status,
      previousSubscriptionStatus: snapshot.subscriptionStatus,
      newStatus: nextStatus,
      newSubscriptionStatus: nextSubscriptionStatus,
      reason: reason || (enabled ? 'Manual enable by SaaS admin' : 'Manual disable by SaaS admin'),
    });

    return {
      schoolId,
      schoolName: snapshot.name,
      previousStatus: snapshot.status,
      previousSubscriptionStatus: snapshot.subscriptionStatus,
      newStatus: nextStatus,
      newSubscriptionStatus: nextSubscriptionStatus,
      suspended: !enabled,
      reason: reason || (enabled ? 'Manually enabled' : 'Manually disabled'),
      overdueInvoices: 0,
      changed: true,
    };
  }

  static async canUserLogin(userRole: string, schoolId?: string | null): Promise<{ allowed: boolean; reason?: string }> {
    // SaaS admins are never blocked by school billing state.
    if (userRole === 'saas_admin' || !schoolId) {
      return { allowed: true };
    }

    const snapshot = await loadSchoolSnapshot(schoolId);
    if (!snapshot) {
      return { allowed: false, reason: 'Associated school not found' };
    }

    if (snapshot.status === 'suspended') {
      return {
        allowed: false,
        reason: 'School access is suspended due to overdue payment. Please contact your SaaS administrator.',
      };
    }

    if (
      snapshot.subscriptionStatus &&
      ['overdue', 'past_due', 'suspended', 'cancelled'].includes(snapshot.subscriptionStatus)
    ) {
      return {
        allowed: false,
        reason: 'School subscription is overdue. Please complete payment to continue.',
      };
    }

    return { allowed: true };
  }
}
