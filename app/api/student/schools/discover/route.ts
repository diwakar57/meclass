import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SchoolService } from '@/lib/services/school';
import { createLogger } from '@/lib/logger';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('StudentSchoolDiscoveryAPI');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

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

    // Get approved schools
    const schools = await SchoolService.getApprovedSchools(limit, offset, search || undefined);

    return NextResponse.json({
      success: true,
      data: schools,
      pagination: {
        limit,
        offset,
        total: schools.length,
      },
    });
  } catch (error) {
    log.error('Failed to get schools:', error);

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
        pagination: {
          limit,
          offset,
          total: 0,
        },
        warning: 'Database unavailable. Returning empty school discovery list in development fallback mode.',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: isDbDown
          ? 'Database unavailable. Please configure and start PostgreSQL, then retry.'
          : 'Failed to fetch schools',
      },
      { status: isDbDown ? 503 : 500 }
    );
  }
}
