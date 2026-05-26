/**
 * GET /api/teacher/students/[id]/performance
 * Get detailed performance for a specific student
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getStudentPerformance } from '@/lib/services/teacher-analytics-service';
import { query } from '@/lib/db';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('StudentPerformance');

export const GET = withRole(
  ['teacher', 'principal'],
  async (
    _req: NextRequest,
    auth: AuthContext,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    const { id: studentId } = await params;
    const school_id = auth.schoolId;

    // Teachers can only access their enrolled students. Principals can access all students.
    if (auth.role !== 'principal') {
      const accessResult = await query(
        `SELECT 1
         FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         WHERE c.teacher_id = $1 AND c.school_id = $2 AND ce.student_id = $3
         LIMIT 1`,
        [auth.userId, school_id, studentId]
      );

      if (accessResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Not authorized to view this student' },
          { status: 403 }
        );
      }
    }

    const performance = await getStudentPerformance(studentId, school_id);

    if (!performance) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(performance, { status: 200 });
  } catch (error) {
    logger.error('Failed to get student performance', { error });
    return NextResponse.json({ error: 'Failed to get performance' }, { status: 500 });
  }
});
