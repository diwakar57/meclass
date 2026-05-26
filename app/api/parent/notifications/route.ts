import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { notificationService } from '@/lib/services/notification-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ParentNotificationsAPI');

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoryParam = request.nextUrl.searchParams.get('category');
    const category = categoryParam && categoryParam !== 'all' ? categoryParam : undefined;

    const notifications = await notificationService.listForUser(session.id, {
      category,
      limit: 100,
    });
    const unreadCount = await notificationService.getUnreadCount(session.id);

    const categories = [
      { category: 'announcement', count: notifications.filter((n) => n.category === 'announcement').length },
      { category: 'alert', count: notifications.filter((n) => n.category === 'alert').length },
      { category: 'message', count: notifications.filter((n) => n.category === 'message').length },
      { category: 'event', count: notifications.filter((n) => n.category === 'event').length },
    ];

    return NextResponse.json({
      success: true,
      data: {
        totalNotifications: notifications.length,
        unreadCount,
        notifications: notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          content: notification.content,
          date: notification.createdAt,
          category: notification.category,
          priority: notification.priority,
          read: notification.read,
          relatedChild: undefined,
        })),
        categories,
        summary: {
          announcements: categories.find((entry) => entry.category === 'announcement')?.count || 0,
          alerts: categories.find((entry) => entry.category === 'alert')?.count || 0,
          messages: categories.find((entry) => entry.category === 'message')?.count || 0,
          events: categories.find((entry) => entry.category === 'event')?.count || 0,
        },
      },
    });
  } catch (error) {
    log.error('Error fetching parent notifications', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
