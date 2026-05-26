import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

const ALLOWED_ROLES = [
  'teacher',
  'student',
  'parent',
  'principal',
  'school_admin',
  'accountant',
  'supervisor',
] as const;

export const GET = withRole([...ALLOWED_ROLES], async (request: NextRequest, auth: AuthContext) => {
  const date = request.nextUrl.searchParams.get('date') || undefined;

  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
  }

  const data = await lmsPhase2Service.getSchedule(auth, date);
  return NextResponse.json({ success: true, data });
});
