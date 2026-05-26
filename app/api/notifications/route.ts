import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { notificationService } from '@/lib/services/notification-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('NotificationsAPI');

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const category = request.nextUrl.searchParams.get('category') || undefined;
    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';
    const limit = Number(request.nextUrl.searchParams.get('limit') || 50);
    const offset = Number(request.nextUrl.searchParams.get('offset') || 0);

    const notifications = await notificationService.listForUser(auth.userId, {
      category: category === 'all' ? undefined : category,
      unreadOnly,
      limit,
      offset,
    });
    const unreadCount = await notificationService.getUnreadCount(auth.userId);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length,
      },
    });
  } catch (error) {
    log.error('Failed to list notifications', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list notifications' },
      { status: 500 }
    );
  }
}
