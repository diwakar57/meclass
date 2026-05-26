import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId } = params;

    // Mock: Publish exam
    console.log('Exam published:', examId);

    return NextResponse.json({
      success: true,
      message: 'Exam published successfully',
      examId,
    });
  } catch (error) {
    console.error('Error publishing exam:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
