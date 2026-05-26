import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, subject, class: className, scheduleDate, scheduleTime, duration, totalMarks, passingMarks } = body;

    // Mock: Create exam
    console.log('Exam created:', { title, subject, className, scheduleDate, scheduleTime });

    return NextResponse.json({
      success: true,
      message: 'Exam created successfully',
      examId: `exam-${Date.now()}`,
      status: 'draft',
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
