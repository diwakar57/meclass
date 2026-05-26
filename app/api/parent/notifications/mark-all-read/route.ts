import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { notificationService } from '@/lib/services/notification-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ParentMarkAllNotificationsReadAPI');

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updatedCount = await notificationService.markAllRead(session.id);

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount },
    });
  } catch (error) {
    log.error('Error marking all notifications as read', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
