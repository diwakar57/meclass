import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SchoolService } from '@/lib/services/school';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentSchoolJoinAPI');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    // Verify auth
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Students only' },
        { status: 403 }
      );
    }

    const { schoolId } = await params;
    const studentId = payload.userId;

    // Request to join school
    const membership = await SchoolService.requestToJoinSchool(studentId, schoolId);

    return NextResponse.json({
      success: true,
      data: membership,
      message: 'Join request sent successfully. Awaiting school approval.',
    });
  } catch (error) {
    log.error('Failed to process join request:', error);
    let message = 'Failed to process join request';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('already a member')) {
        message = 'You are already a member of this school';
        statusCode = 400;
      } else if (error.message.includes('not found')) {
        message = 'School not found';
        statusCode = 404;
      }
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: statusCode }
    );
  }
}
