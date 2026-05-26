import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { notificationService } from '@/lib/services/notification-service';
import { appendRequestAuditLog } from '@/lib/services/audit-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('NotificationsMarkAllReadAPI');

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const updatedCount = await notificationService.markAllRead(auth.userId);

    if (auth.schoolId && updatedCount > 0) {
      await appendRequestAuditLog(request, {
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'notifications_mark_all_read',
        resourceType: 'notification',
        resourceId: auth.userId,
        changes: { updatedCount },
      });
    }

    return NextResponse.json({
      success: true,
      data: { updatedCount },
      message: 'All notifications marked as read',
    });
  } catch (error) {
    log.error('Failed to mark all notifications as read', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
