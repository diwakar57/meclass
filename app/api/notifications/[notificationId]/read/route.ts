import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { notificationService } from '@/lib/services/notification-service';
import { appendRequestAuditLog } from '@/lib/services/audit-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('NotificationMarkReadAPI');

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await context.params;
    const updated = await notificationService.markRead(auth.userId, notificationId);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (auth.schoolId) {
      await appendRequestAuditLog(request, {
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'notification_mark_read',
        resourceType: 'notification',
        resourceId: notificationId,
        changes: {},
      });
    }

    return NextResponse.json({
      success: true,
      data: { notificationId },
      message: 'Notification marked as read',
    });
  } catch (error) {
    log.error('Failed to mark notification as read', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
