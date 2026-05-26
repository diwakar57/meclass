import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '3M';

    // Mock supervisor reports data
    const reportsData = {
      schoolPerformance: [
        { name: 'School A', passRate: 88, failRate: 12, students: 450 },
        { name: 'School B', passRate: 92, failRate: 8, students: 380 },
        { name: 'School C', passRate: 76, failRate: 24, students: 320 },
        { name: 'School D', passRate: 85, failRate: 15, students: 410 },
      ],
      topPerformers: [
        { name: 'School B', passRate: 92, improvement: 5 },
        { name: 'School A', passRate: 88, improvement: 3 },
        { name: 'School D', passRate: 85, improvement: 2 },
      ],
      improvingSchools: [
        { name: 'School C', passRate: 76, improvement: 8 },
        { name: 'School E', passRate: 78, improvement: 6 },
      ],
      concernSchools: [
        { name: 'School F', passRate: 65, improvement: -5 },
        { name: 'School G', passRate: 68, improvement: -3 },
      ],
      subjectPerformance: [
        { subject: 'Mathematics', avgScore: 78 },
        { subject: 'Science', avgScore: 82 },
        { subject: 'English', avgScore: 75 },
        { subject: 'Social Studies', avgScore: 80 },
      ],
    };

    return NextResponse.json({ data: reportsData });
  } catch (error) {
    console.error('Error fetching supervisor reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
