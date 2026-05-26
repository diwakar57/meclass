import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SchoolService } from '@/lib/services/school';
import { createLogger } from '@/lib/logger';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('RejectJoinRequestAPI');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
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
    if (!payload || !['principal', 'saas_admin'].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { requestId } = await params;

    // Reject the join request
    const membership = await SchoolService.rejectStudentJoinRequest(requestId);

    return NextResponse.json({
      success: true,
      data: membership,
      message: 'Join request rejected',
    });
  } catch (error) {
    log.error('Failed to reject request:', error);

    const message = error instanceof Error ? error.message : String(error);
    const err = error as any;
    const errorCode = err?.code || err?.cause?.code;
    const isDbDown =
      errorCode === 'ECONNREFUSED' ||
      message.includes('ECONNREFUSED') ||
      message.includes('connect ECONNREFUSED');

    if (isDbDown && isDevAuthFallbackEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot reject requests while database is unavailable in development mode.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to reject request' },
      { status: 500 }
    );
  }
}
