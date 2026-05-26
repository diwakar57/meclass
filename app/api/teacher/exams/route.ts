import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    // Mock exam data
    const examData = {
      exams: Array(15)
        .fill(null)
        .map((_, i) => ({
          id: `exam-${i}`,
          title: `${['Mathematics', 'Science', 'English', 'History', 'PE'][i % 5]} Exam ${Math.floor(i / 5) + 1}`,
          subject: ['Mathematics', 'Science', 'English', 'History', 'PE'][i % 5],
          class: `Class ${10 + Math.floor(i / 3)}-${['A', 'B', 'C'][i % 3]}`,
          scheduleDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduleTime: `${9 + (i % 4)}:00 AM`,
          duration: 60 + (i % 3) * 30,
          totalMarks: 100,
          passingMarks: 40,
          notificationsSent: Math.floor(Math.random() * 100),
          responseRate: 75 + Math.random() * 20,
          status: ['draft', 'published', 'ongoing', 'completed'][i % 4],
        })),
      totalExams: 15,
      completedExams: 4,
      upcomingExams: 6,
      averageScore: 72.5,
      scoreDistribution: [
        { range: '90-100', students: 5 },
        { range: '80-89', students: 12 },
        { range: '70-79', students: 18 },
        { range: '60-69', students: 9 },
        { range: 'Below 60', students: 6 },
      ],
      questionBank: Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `question-${i}`,
          text: `Question ${i + 1}?`,
          type: ['mcq', 'short', 'long', 'numeric'][i % 4],
          marks: [1, 2, 5, 10][i % 4],
          difficulty: ['easy', 'medium', 'hard'][i % 3],
        })),
    };

    return NextResponse.json({ data: examData });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
