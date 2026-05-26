import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock supervisor metrics data
    const metricsData = {
      metrics: {
        passRate: 82.5,
        engagementRate: 78.3,
        teacherPerformance: 85.7,
        averageGPA: 3.45,
      },
      schoolPerformance: [
        { schoolName: 'School A', passRate: 88, engagement: 82 },
        { schoolName: 'School B', passRate: 92, engagement: 85 },
        { schoolName: 'School C', passRate: 76, engagement: 70 },
        { schoolName: 'School D', passRate: 85, engagement: 80 },
        { schoolName: 'School E', passRate: 79, engagement: 75 },
      ],
      trend: Array(12)
        .fill(null)
        .map((_, i) => ({
          month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
          passRate: 75 + Math.random() * 15,
        })),
      subjectPerformance: [
        { subject: 'Mathematics', avgScore: 78 },
        { subject: 'Science', avgScore: 82 },
        { subject: 'English', avgScore: 75 },
        { subject: 'Social Studies', avgScore: 80 },
        { subject: 'Physical Education', avgScore: 88 },
      ],
    };

    return NextResponse.json({ data: metricsData });
  } catch (error) {
    console.error('Error fetching supervisor metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
