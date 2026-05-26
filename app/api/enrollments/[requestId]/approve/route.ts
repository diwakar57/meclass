import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session || !['admin', 'principal'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = params;

    // Mock: Approve enrollment
    console.log('Enrollment request approved:', requestId);

    return NextResponse.json({
      success: true,
      message: 'Enrollment request approved successfully',
      requestId,
      newStudentId: `student-${Date.now()}`,
    });
  } catch (error) {
    console.error('Error approving enrollment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
