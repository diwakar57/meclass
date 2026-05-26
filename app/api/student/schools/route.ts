import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SchoolService } from '@/lib/services/school';
import { createLogger } from '@/lib/logger';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('StudentSchoolsAPI');

export async function GET(request: NextRequest) {
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

    const studentId = payload.userId;

    // Get student's school memberships
    const memberships = await SchoolService.getStudentSchools(studentId);

    return NextResponse.json({
      success: true,
      data: memberships,
    });
  } catch (error) {
    log.error('Failed to get student schools:', error);

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
        warning: 'Database unavailable. Returning empty memberships in development fallback mode.',
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
