import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { appendAuditLog } from '@/lib/services/audit-service';

export const POST = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const classId =
    typeof body?.classId === 'string'
      ? body.classId
      : typeof body?.courseId === 'string'
        ? body.courseId
        : '';

  if (!classId) {
    return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 });
  }

  const classResult = await query(
    `SELECT id, name
     FROM classes
     WHERE id = $1 AND school_id = $2
     LIMIT 1`,
    [classId, auth.schoolId]
  );

  if ((classResult.rowCount || 0) === 0) {
    return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  }

  const insertResult = await query(
    `INSERT INTO class_enrollments (id, class_id, student_id, enrolled_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (class_id, student_id) DO NOTHING
     RETURNING class_id`,
    [randomUUID(), classId, auth.userId]
  );

  await appendAuditLog({
    schoolId: auth.schoolId,
    userId: auth.userId,
    action: 'student_course_enroll',
    resourceType: 'class_enrollment',
    resourceId: classId,
    changes: {
      classId,
      inserted: (insertResult.rowCount || 0) > 0,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      classId,
      enrolled: true,
      alreadyEnrolled: (insertResult.rowCount || 0) === 0,
    },
  });
});
