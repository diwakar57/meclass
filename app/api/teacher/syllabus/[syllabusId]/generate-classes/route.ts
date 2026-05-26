/**
 * POST /api/teacher/syllabus/[syllabusId]/generate-classes
 * Generate adaptive classes from teacher's syllabus for enrolled students
 * Converts syllabus topics into personalized learning classes based on student pace
 */

import { NextRequest } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { generateClassesFromSyllabus, getStudentGeneratedClasses } from '@/lib/services/syllabus-class-generator';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { AuthContext } from '@/lib/types/auth';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('SyllabusGenerateClassesAPI');

export const maxDuration = 60;

interface GenerateClassesRequest {
  studentIds?: string[]; // If not provided, generate for all enrolled students
  planType?: 'simple' | 'core' | 'harsh';
  allowDefaultPlan?: boolean;
}

export const POST = withRole(['teacher', 'principal'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const pathname = req.nextUrl.pathname;
    const syllabusId = pathname.match(/\/syllabus\/([^/]+)\//)?.[1];

    if (!syllabusId) {
      return apiError('INVALID_REQUEST', 400, 'Syllabus ID is required in path');
    }

    if (!auth.schoolId) {
      return apiError('UNAUTHORIZED', 401, 'Invalid auth context');
    }

    const body: GenerateClassesRequest = await req.json().catch(() => ({}));

    // Verify teacher owns the syllabus
    const syllabusCheck = await db.query(
      `SELECT id FROM teacher_syllabi 
       WHERE id = $1 AND teacher_id = $2 AND school_id = $3`,
      [syllabusId, auth.userId, auth.schoolId]
    );

    if (!syllabusCheck.rows[0]) {
      return apiError('NOT_FOUND', 404, 'Syllabus not found or unauthorized');
    }

    // Get enrolled students or use provided list
    let studentIds = body.studentIds;
    if (!studentIds || studentIds.length === 0) {
      log.info('No specific students provided, fetching all enrolled students');

      // Get all students in school who might be taking this syllabus's subject
      const enrolledResult = await db.query(
        `SELECT DISTINCT u.id 
         FROM users u
         JOIN school_enrollments se ON u.id = se.user_id
         WHERE se.school_id = $1 AND u.role = 'student'
         LIMIT 500`,
        [auth.schoolId]
      );

      studentIds = enrolledResult.rows.map((row) => row.id);
      log.info(`Found ${studentIds.length} enrolled students`);
    }

    if (studentIds.length === 0) {
      return apiSuccess(
        {
          success: true,
          message: 'No students to generate classes for',
          studentsProcessed: 0,
          totalSessionsCreated: 0,
          classCollections: [],
          errors: [],
        },
        200
      );
    }

    // Generate classes
    log.info(
      `Starting class generation for syllabus ${syllabusId} with ${studentIds.length} students`
    );

    const result = await generateClassesFromSyllabus({
      syllabusId,
      teacherId: auth.userId,
      schoolId: auth.schoolId,
      studentIds,
      planType: body.planType,
      allowDefaultPlan: body.allowDefaultPlan,
    });

    if (!result.success) {
      log.error('Class generation encountered errors:', result.errors);
      return apiSuccess({ ...result, warning: 'Some students failed to process' }, 200);
    }

    log.info(`Successfully generated classes for ${result.studentsProcessed} students`);
    return apiSuccess(result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to generate classes from syllabus:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to generate classes', message);
  }
});

/**
 * GET /api/teacher/syllabus/[syllabusId]/generate-classes/status
 * Get status of generated classes for a specific student
 */
export const GET = withRole(['teacher', 'student', 'principal'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const pathname = req.nextUrl.pathname;
    const syllabusId = pathname.match(/\/syllabus\/([^/]+)\//)?.[1];
    const studentId = req.nextUrl.searchParams.get('studentId');

    if (!syllabusId || !studentId) {
      return apiError('INVALID_REQUEST', 400, 'Syllabus ID and student ID are required');
    }

    if (!auth.schoolId) {
      return apiError('UNAUTHORIZED', 401, 'Invalid auth context');
    }

    // Verify authorization
    if (auth.role === 'student' && auth.userId !== studentId) {
      return apiError('FORBIDDEN', 403, 'Cannot access other student classes');
    }

    // Get generated classes for student
    const classes = await getStudentGeneratedClasses(studentId, auth.schoolId);

    const summary = {
      totalClasses: classes.length,
      completed: classes.filter((c) => c.status === 'completed').length,
      pending: classes.filter((c) => c.status === 'pending').length,
      estimatedTotalMinutes: classes.reduce((sum, c) => sum + (c.estimatedDurationMinutes || 0), 0),
    };

    return apiSuccess(
      {
        syllabusId,
        studentId,
        classes,
        summary,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to get generated classes status:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to retrieve class status', message);
  }
});
