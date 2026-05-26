import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SchoolService } from '@/lib/services/school';
import { createLogger } from '@/lib/logger';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('SchoolMembersAPI');

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

    // Get approved members
    const members = await SchoolService.getSchoolMembers(schoolId);

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    log.error('Failed to get members:', error);

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
        warning: 'Database unavailable. Returning empty members list in development fallback mode.',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: isDbDown
          ? 'Database unavailable. Please configure and start PostgreSQL, then retry.'
          : 'Failed to fetch members',
      },
      { status: isDbDown ? 503 : 500 }
    );
  }
}
