import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

export const POST = withRole(['teacher'], async (request: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
  }

  const body = await request.json();
  const classId = typeof body?.classId === 'string' ? body.classId : '';
  const date = typeof body?.date === 'string' ? body.date : undefined;
  const attendance = (body?.attendance || {}) as Record<string, 'present' | 'absent' | 'late' | 'excused'>;
  const remarks = (body?.remarks || {}) as Record<string, string>;

  if (!classId) {
    return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 });
  }

  const result = await lmsPhase2Service.submitTeacherAttendance({
    schoolId: auth.schoolId,
    teacherId: auth.userId,
    classId,
    date: date || new Date().toISOString().slice(0, 10),
    attendance,
    remarks,
  });

  return NextResponse.json({
    success: true,
    message: 'Attendance submitted successfully',
    ...result,
  });
});
