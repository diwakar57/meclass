import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentCoursesAPI');

type CourseRow = {
  id: string;
  name: string;
  grade_level: string | null;
  description: string | null;
  teacher_name: string | null;
  student_count: number | null;
  enrolled: number | null;
  enrolled_at: string | null;
};

export const GET = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const coursesResult = await query<CourseRow>(
      `SELECT
         c.id,
         c.name,
         c.grade_level,
         c.description,
         TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS teacher_name,
         COUNT(ce_all.student_id)::int AS student_count,
         MAX(CASE WHEN ce_me.student_id IS NOT NULL THEN 1 ELSE 0 END)::int AS enrolled,
         MAX(ce_me.enrolled_at)::text AS enrolled_at
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       LEFT JOIN class_enrollments ce_all ON ce_all.class_id = c.id
       LEFT JOIN class_enrollments ce_me ON ce_me.class_id = c.id AND ce_me.student_id = $2
       WHERE c.school_id = $1
       GROUP BY c.id, c.name, c.grade_level, c.description, u.first_name, u.last_name
       ORDER BY c.created_at DESC`,
      [auth.schoolId, auth.userId]
    );

    const allCourses = (coursesResult.rows || []).map((row) => ({
      id: String(row.id),
      name: String(row.name || 'Course'),
      gradeLevel: String(row.grade_level || 'General'),
      description: String(row.description || 'Course details are not available yet.'),
      teacherName: (row.teacher_name || '').trim() || 'Instructor',
      studentCount: Number(row.student_count || 0),
      enrolled: Number(row.enrolled || 0) === 1,
      enrolledAt: row.enrolled_at || null,
    }));

    const enrolledCourses = allCourses.filter((course) => course.enrolled);
    const availableCourses = allCourses.filter((course) => !course.enrolled);

    return NextResponse.json({
      success: true,
      data: {
        enrolledCourses,
        availableCourses,
        summary: {
          totalCourses: allCourses.length,
          enrolledCount: enrolledCourses.length,
          availableCount: availableCourses.length,
        },
      },
    });
  } catch (error) {
    log.error('Failed to fetch courses', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch courses' }, { status: 500 });
  }
});
