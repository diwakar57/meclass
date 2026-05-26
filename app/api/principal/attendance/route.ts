import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

export const GET = withRole(
  ['principal', 'school_admin'],
  async (request: NextRequest, auth: AuthContext) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const date =
      request.nextUrl.searchParams.get('date') ||
      request.nextUrl.searchParams.get('startDate') ||
      undefined;
    const classId =
      request.nextUrl.searchParams.get('class') ||
      request.nextUrl.searchParams.get('classId') ||
      undefined;

    const data = await lmsPhase2Service.getPrincipalAttendanceAnalytics(auth.schoolId, date, classId);
    return NextResponse.json({ success: true, data });
  }
);
