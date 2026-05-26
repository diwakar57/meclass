/**
 * GET /api/teacher/students
 * List all students taught by the current teacher
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getTeacherStudents, getStudentPerformance } from '@/lib/services/teacher-analytics-service';
import { query } from '@/lib/db';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('TeacherStudents');

export const GET = withRole(['teacher', 'principal'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '25'));
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const search = searchParams.get('search')?.toLowerCase() || '';
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const className = searchParams.get('className') || '';
    const section = searchParams.get('section') || '';
    const status = searchParams.get('status') || '';
    const riskLevel = searchParams.get('riskLevel') || '';

    const school_id = auth.schoolId;

    // Get school metadata for UI table compatibility
    const schoolMeta = await query(`SELECT name FROM schools WHERE id = $1`, [school_id]).catch(() => ({
      rows: [] as any[],
    }));
    const schoolName = schoolMeta.rows[0]?.name || null;

    // Teachers see their own students; principals see all active students in school.
    const studentIds =
      auth.role === 'principal'
        ? (
            await query(
              `SELECT id
               FROM users
               WHERE school_id = $1 AND role = 'student' AND is_active = true`,
              [school_id]
            )
          ).rows.map((row: any) => row.id)
        : await getTeacherStudents(auth.userId, school_id);

    // Get performance + table metadata for each student
    let students: Array<Record<string, any>> = [];
    for (const studentId of studentIds) {
      const performance = await getStudentPerformance(studentId, school_id);
      if (performance) {
        const [classResult, attendanceResult, recentQuizResult, parentResult] = await Promise.all([
          query(
            `SELECT c.name, c.grade_level
             FROM class_enrollments ce
             INNER JOIN classes c ON c.id = ce.class_id
             WHERE ce.student_id = $1 AND c.school_id = $2
             ORDER BY ce.enrolled_at DESC
             LIMIT 1`,
            [studentId, school_id]
          ).catch(() => ({ rows: [] as any[] })),
          query(
            `SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'present')::int AS present
             FROM attendance_records
             WHERE student_id = $1 AND school_id = $2`,
            [studentId, school_id]
          ).catch(() => ({ rows: [{ total: 0, present: 0 }] as any[] })),
          query(
            `SELECT score
             FROM quiz_attempts
             WHERE student_id = $1 AND school_id = $2 AND score IS NOT NULL
             ORDER BY completed_at DESC NULLS LAST
             LIMIT 1`,
            [studentId, school_id]
          ).catch(() => ({ rows: [] as any[] })),
          query(
            `SELECT COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS parent_name
             FROM parent_student_links psl
             INNER JOIN users u ON u.id = psl.parent_id
             WHERE psl.student_id = $1 AND psl.school_id = $2
             ORDER BY psl.created_at DESC
             LIMIT 1`,
            [studentId, school_id]
          ).catch(() => ({ rows: [] as any[] })),
        ]);

        const classRow = classResult.rows[0] || {};
        const attendanceRow = attendanceResult.rows[0] || { total: 0, present: 0 };
        const totalAttendance = Number(attendanceRow.total || 0);
        const attendanceRate =
          totalAttendance > 0
            ? Math.round((Number(attendanceRow.present || 0) / totalAttendance) * 100)
            : 0;

        students.push({
          ...performance,
          gradeLevel: classRow.grade_level || null,
          className: classRow.name || null,
          section: null,
          enrollmentStatus: 'active',
          attendanceRate,
          recentQuizScore:
            recentQuizResult.rows.length > 0 ? Number(recentQuizResult.rows[0].score || 0) : null,
          lastActiveAt: performance.lastActivityAt,
          parentName: parentResult.rows[0]?.parent_name || null,
          schoolName,
        });
      }
    }

    // Apply filters
    students = students.filter((student) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          student.studentName?.toLowerCase().includes(searchLower) ||
          student.studentId?.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Grade level filter
      if (gradeLevel && student.gradeLevel !== gradeLevel) return false;

      // Class filter
      if (className && student.className !== className) return false;

      // Section filter
      if (section && student.section !== section) return false;

      // Status filter
      if (status && student.enrollmentStatus !== status) return false;

      // Risk level filter
      if (riskLevel && student.riskLevel !== riskLevel) return false;

      return true;
    });

    // Apply sorting
    const sortKey = sortBy.toLowerCase();
    students.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortKey) {
        case 'name':
          aValue = a.studentName || '';
          bValue = b.studentName || '';
          break;
        case 'studentid':
          aValue = a.studentId || '';
          bValue = b.studentId || '';
          break;
        case 'grade':
          aValue = a.gradeLevel || '';
          bValue = b.gradeLevel || '';
          break;
        case 'classname':
          aValue = a.className || '';
          bValue = b.className || '';
          break;
        case 'enrollment':
          aValue = a.enrollmentStatus || '';
          bValue = b.enrollmentStatus || '';
          break;
        case 'mastery':
          aValue = a.overallMastery || 0;
          bValue = b.overallMastery || 0;
          break;
        case 'attendance':
          aValue = a.attendanceRate || 0;
          bValue = b.attendanceRate || 0;
          break;
        case 'score':
          aValue = a.recentQuizScore || 0;
          bValue = b.recentQuizScore || 0;
          break;
        case 'risk':
          const riskOrder: Record<'high' | 'medium' | 'low', number> = {
            high: 0,
            medium: 1,
            low: 2,
          };
          aValue = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 3;
          bValue = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 3;
          break;
        case 'active':
          aValue = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
          bValue = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
          break;
        default:
          aValue = a.studentName || '';
          bValue = b.studentName || '';
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      // Handle numeric comparison
      if (aValue === bValue) return 0;
      const comparison = aValue < bValue ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const totalCount = students.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedStudents = students.slice(startIdx, endIdx);

    // Transform to match expected format
    const transformedStudents = paginatedStudents.map((student) => ({
      id: student.studentId,
      studentId: student.studentId,
      name: student.studentName,
      email: student.email,
      gradeLevel: student.gradeLevel,
      className: student.className,
      section: student.section,
      enrollmentStatus: student.enrollmentStatus,
      overallMastery: student.overallMastery,
      attendanceRate: student.attendanceRate,
      recentQuizScore: student.recentQuizScore,
      riskLevel: student.riskLevel,
      lastActivityAt: student.lastActiveAt,
      parentName: student.parentName,
      schoolName: student.schoolName,
    }));

    return NextResponse.json(
      {
        students: transformedStudents,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to get students', { error });
    return NextResponse.json({ error: 'Failed to get students' }, { status: 500 });
  }
});
