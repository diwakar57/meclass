import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

export const POST = withRole(
  ['principal', 'school_admin'],
  async (request: NextRequest, auth: AuthContext) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const body = await request.json();
    const studentId = typeof body?.studentId === 'string' ? body.studentId : '';
    const status = typeof body?.status === 'string' ? body.status : '';
    const date = typeof body?.date === 'string' ? body.date : undefined;
    const classId = typeof body?.classId === 'string' ? body.classId : undefined;
    const remarks = typeof body?.remarks === 'string' ? body.remarks : undefined;

    if (!studentId || !status) {
      return NextResponse.json(
        { success: false, error: 'studentId and status are required' },
        { status: 400 }
      );
    }

    const result = await lmsPhase2Service.markPrincipalAttendance({
      schoolId: auth.schoolId,
      markerId: auth.userId,
      studentId,
      status: status as 'present' | 'absent' | 'late' | 'excused',
      date: date || new Date().toISOString().slice(0, 10),
      classId,
      remarks,
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance submitted successfully',
      ...result,
    });
  }
);
