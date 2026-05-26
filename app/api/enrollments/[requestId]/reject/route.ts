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

    // Mock: Reject enrollment
    console.log('Enrollment request rejected:', requestId);

    return NextResponse.json({
      success: true,
      message: 'Enrollment request rejected successfully',
      requestId,
    });
  } catch (error) {
    console.error('Error rejecting enrollment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
