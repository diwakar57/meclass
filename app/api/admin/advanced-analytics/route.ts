import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || !['admin', 'saas_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '3M';

    // Mock advanced analytics data
    const analyticsData = {
      revenue: {
        trend: Array(30)
          .fill(null)
          .map((_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            revenue: 50000 + Math.random() * 30000,
            expenses: 20000 + Math.random() * 10000,
          })),
        total: 1250000,
        growth: 12.5,
        comparison: 8.3,
      },
      engagement: {
        daily: Array(30)
          .fill(null)
          .map((_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            logins: 450 + Math.random() * 200,
            activities: 1200 + Math.random() * 500,
            assignments: 280 + Math.random() * 150,
          })),
        avgSessionDuration: 45.5,
        returnRate: 78.5,
        retentionRate: 85.2,
      },
      learningOutcomes: {
        passRate: [
          { month: 'January', passRate: 78, failRate: 22 },
          { month: 'February', passRate: 80, failRate: 20 },
          { month: 'March', passRate: 82, failRate: 18 },
        ],
        averageGPA: 3.42,
        improvementRate: 15.3,
        completionRate: 92.5,
      },
      demographics: {
        byRole: [
          { role: 'Student', count: 2500 },
          { role: 'Teacher', count: 180 },
          { role: 'Principal', count: 45 },
          { role: 'Parent', count: 3200 },
        ],
        byGrade: [
          { grade: 'Grade 1', count: 350 },
          { grade: 'Grade 2', count: 340 },
          { grade: 'Grade 3', count: 360 },
          { grade: 'Grade 4', count: 380 },
        ],
        growth: [
          { month: 'January', students: 2300, teachers: 170 },
          { month: 'February', students: 2380, teachers: 175 },
          { month: 'March', students: 2500, teachers: 180 },
        ],
      },
      performance: {
        topPerformers: [
          { name: 'School A', score: 92 },
          { name: 'School B', score: 88 },
          { name: 'School C', score: 85 },
        ],
        lowestPerformers: [
          { name: 'School D', score: 62 },
          { name: 'School E', score: 58 },
        ],
        subjectPerformance: [
          { subject: 'Mathematics', avgScore: 78 },
          { subject: 'Science', avgScore: 82 },
          { subject: 'English', avgScore: 75 },
          { subject: 'History', avgScore: 80 },
        ],
      },
    };

    return NextResponse.json({ data: analyticsData });
  } catch (error) {
    console.error('Error fetching advanced analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
