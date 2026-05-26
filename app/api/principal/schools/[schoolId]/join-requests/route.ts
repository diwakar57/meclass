import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SchoolService } from '@/lib/services/school';
import { createLogger } from '@/lib/logger';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('JoinRequestsAPI');

export async function GET(
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
    if (!payload || !['principal', 'saas_admin'].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { schoolId } = await params;

    // Get pending join requests
    const requests = await SchoolService.getPendingJoinRequests(schoolId);

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    log.error('Failed to get join requests:', error);

    const message = error instanceof Error ? error.message : String(error);
    const err = error as any;
    const errorCode = err?.code || err?.cause?.code;
    const isDbDown =
      errorCode === 'ECONNREFUSED' ||
      message.includes('ECONNREFUSED') ||
      message.includes('connect ECONNREFUSED');

    if (isDbDown && isDevAuthFallbackEnabled()) {
      return NextResponse.json({
        success: true,
        data: [],
        warning: 'Database unavailable. Returning empty join requests in development fallback mode.',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: isDbDown
          ? 'Database unavailable. Please configure and start PostgreSQL, then retry.'
          : 'Failed to fetch requests',
      },
      { status: isDbDown ? 503 : 500 }
    );
  }
}
