import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || !['admin', 'saas_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock teacher performance data
    const performanceData = {
      distribution: {
        excellent: 15,
        good: 35,
        average: 32,
        needsImprovement: 18,
      },
      trend: Array(6)
        .fill(null)
        .map((_, i) => ({
          month: ['September', 'October', 'November', 'December', 'January', 'February'][i],
          avg: 3.4 + Math.random() * 0.5,
        })),
      topPerformers: [
        { name: 'Teacher A', score: 4.8, subject: 'Mathematics' },
        { name: 'Teacher B', score: 4.7, subject: 'Science' },
        { name: 'Teacher C', score: 4.6, subject: 'English' },
        { name: 'Teacher D', score: 4.5, subject: 'History' },
        { name: 'Teacher E', score: 4.4, subject: 'PE' },
      ],
      evaluations: [
        {
          id: '1',
          name: 'Teacher A',
          subject: 'Mathematics',
          overallRating: 4.8,
          studentSatisfaction: 4.7,
          studentGrowth: 4.8,
          classroomMgmt: 4.9,
          curriculum: 4.8,
          evaluator: 'Principal A',
          date: '2026-03-20',
        },
        {
          id: '2',
          name: 'Teacher B',
          subject: 'Science',
          overallRating: 4.7,
          studentSatisfaction: 4.6,
          studentGrowth: 4.7,
          classroomMgmt: 4.8,
          curriculum: 4.7,
          evaluator: 'Principal B',
          date: '2026-03-15',
        },
      ],
    };

    return NextResponse.json({ data: performanceData });
  } catch (error) {
    console.error('Error fetching teacher performance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
