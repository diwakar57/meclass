import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { notificationService } from '@/lib/services/notification-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ParentMarkNotificationReadAPI');

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await context.params;

    const updated = await notificationService.markRead(session.id, notificationId);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
      notificationId,
    });
  } catch (error) {
    log.error('Error marking notification as read', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
