import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || !['admin', 'saas_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const status = searchParams.get('status');
    const user = searchParams.get('user');

    // Mock activity log data
    const activityData = {
      totalActivities: 1250,
      todayActivities: 145,
      successRate: 98.5,
      recentActivities: Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `activity-${i}`,
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
          user: `User ${Math.floor(Math.random() * 100)}`,
          action: ['Login', 'Created', 'Updated', 'Deleted', 'Viewed'][Math.floor(Math.random() * 5)],
          resource: ['Grade', 'Assignment', 'Student', 'Class', 'Report'][Math.floor(Math.random() * 5)],
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          status: ['success', 'failure', 'warning'][Math.floor(Math.random() * 3)],
          userAgent: 'Mozilla/5.0',
        })),
      activityByType: [
        { type: 'Login', count: 450 },
        { type: 'Data Update', count: 380 },
        { type: 'Report Generated', count: 250 },
        { type: 'File Download', count: 170 },
      ],
      activityByUser: [
        { user: 'admin@school.com', count: 320 },
        { user: 'principal@school.com', count: 280 },
        { user: 'teacher1@school.com', count: 210 },
        { user: 'teacher2@school.com', count: 180 },
      ],
    };

    return NextResponse.json({ data: activityData });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
