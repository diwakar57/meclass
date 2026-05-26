import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

export const POST = withRole(['teacher'], async (req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
  }

  const body = await req.json();

  const studentId = typeof body?.studentId === 'string' ? body.studentId : '';
  const assignmentTitle = typeof body?.assignment === 'string' ? body.assignment : '';
  const classId = typeof body?.classId === 'string' ? body.classId : undefined;
  const scoreValue =
    typeof body?.score === 'number'
      ? body.score
      : typeof body?.score === 'string'
        ? Number(body.score)
        : NaN;

  if (!studentId || !assignmentTitle || !Number.isFinite(scoreValue)) {
    return NextResponse.json(
      { success: false, error: 'studentId, assignment, and numeric score are required' },
      { status: 400 }
    );
  }

  const result = await lmsPhase2Service.upsertGrade({
    schoolId: auth.schoolId,
    teacherId: auth.userId,
    studentId,
    assignmentTitle,
    score: scoreValue,
    classId,
  });

  return NextResponse.json({ success: true, data: result });
});
