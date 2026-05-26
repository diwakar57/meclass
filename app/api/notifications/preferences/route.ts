import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import {
  notificationService,
  type UpdateNotificationPreferencesInput,
} from '@/lib/services/notification-service';
import { appendRequestAuditLog } from '@/lib/services/audit-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('NotificationPreferencesAPI');

function parseOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await notificationService.getPreferences(auth.userId, auth.schoolId || null);

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    log.error('Failed to fetch notification preferences', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const updatePayload: UpdateNotificationPreferencesInput = {
      inAppEnabled: parseOptionalBoolean(body.inAppEnabled),
      emailEnabled: parseOptionalBoolean(body.emailEnabled),
      categories: {
        quizCompletion: parseOptionalBoolean(
          body?.categories?.quizCompletion ?? body?.categories?.quiz_completion
        ),
        parentUpdates: parseOptionalBoolean(
          body?.categories?.parentUpdates ?? body?.categories?.parent_updates
        ),
        teacherAlerts: parseOptionalBoolean(
          body?.categories?.teacherAlerts ?? body?.categories?.teacher_alerts
        ),
        paymentReceipts: parseOptionalBoolean(
          body?.categories?.paymentReceipts ?? body?.categories?.payment_receipts
        ),
        milestoneCompletions: parseOptionalBoolean(
          body?.categories?.milestoneCompletions ?? body?.categories?.milestone_completions
        ),
      },
    };

    const preferences = await notificationService.updatePreferences(
      auth.userId,
      auth.schoolId || null,
      updatePayload
    );

    if (auth.schoolId) {
      await appendRequestAuditLog(request, {
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'notification_preferences_updated',
        resourceType: 'notification_preferences',
        resourceId: auth.userId,
        changes: updatePayload,
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    log.error('Failed to update notification preferences', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
