import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId } = params;

    // Mock: Delete exam
    console.log('Exam deleted:', examId);

    return NextResponse.json({
      success: true,
      message: 'Exam deleted successfully',
      examId,
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
