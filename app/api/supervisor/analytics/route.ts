import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { safeMonthlySeries } from '@/lib/analytics/query-utils';
import type { AuthContext } from '@/lib/types/auth';

const log = createLogger('SupervisorAnalyticsAPI');

export const GET = withRole(['supervisor'], async (request: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant scope' },
        { status: 401 }
      );
    }

    const schoolId = auth.schoolId;

    // Header-level totals remain useful in top cards.
    const usersResult = await query(
      `SELECT COUNT(*) as count FROM users WHERE school_id = $1`,
      [schoolId]
    );
    const totalUsers = Number(usersResult.rows[0]?.count) || 0;

    // School count is one in tenant scope.
    const schoolsResult = await query(
      `SELECT COUNT(*) as count FROM schools WHERE id = $1`
      , [schoolId]
    );
    const totalSchools = Number(schoolsResult.rows[0]?.count) || 0;

    const classesResult = await query(
      `SELECT COUNT(*) as count FROM classes WHERE school_id = $1`,
      [schoolId]
    );
    const totalClasses = Number(classesResult.rows[0]?.count) || 0;

    const lessonsResult = await query(
      `SELECT COUNT(*) as count FROM lessons WHERE school_id = $1`,
      [schoolId]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    const totalLessonsGenerated = Number(lessonsResult.rows[0]?.count) || 0;

    const mauResult = await query(
      `SELECT COUNT(DISTINCT student_id) as count
       FROM quiz_attempts
       WHERE school_id = $1
         AND completed_at > NOW() - INTERVAL '30 days'`,
      [schoolId]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    const monthlyActiveUsers = Number(mauResult.rows[0]?.count) || 0;

    const classPerformance = await query(
      `SELECT c.name AS label, COALESCE(AVG(qa.score), 0)::float AS value
       FROM classes c
       LEFT JOIN class_enrollments ce ON ce.class_id = c.id
       LEFT JOIN quiz_attempts qa ON qa.student_id = ce.student_id
       WHERE c.school_id = $1
       GROUP BY c.name
       ORDER BY value DESC
       LIMIT 10`,
      [schoolId]
    ).catch(() => ({ rows: [] as any[] }));

    const teacherPerformance = await query(
      `SELECT CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS teacher,
              COALESCE(AVG(qa.score), 0)::float AS avg_score
       FROM users u
       LEFT JOIN classes c ON c.teacher_id = u.id
       LEFT JOIN class_enrollments ce ON ce.class_id = c.id
       LEFT JOIN quiz_attempts qa ON qa.student_id = ce.student_id
       WHERE u.school_id = $1 AND u.role = 'teacher'
       GROUP BY teacher
       ORDER BY avg_score DESC
       LIMIT 10`,
      [schoolId]
    ).catch(() => ({ rows: [] as any[] }));

    const riskDistribution = await query(
      `SELECT
         COUNT(*) FILTER (WHERE mastery_score < 40)::int AS high,
         COUNT(*) FILTER (WHERE mastery_score >= 40 AND mastery_score < 70)::int AS medium,
         COUNT(*) FILTER (WHERE mastery_score >= 70)::int AS low
       FROM topic_mastery
       WHERE school_id = $1`,
      [schoolId]
    ).catch(() => ({ rows: [{ high: 0, medium: 0, low: 0 }] }));

    const engagementTrendAcrossClasses = await safeMonthlySeries(
      'quiz_attempts',
      'completed_at',
      6,
      'WHERE school_id = $1',
      [schoolId]
    );

    const syllabusCoverageResult = await query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'published')::int AS covered
       FROM syllabi
       WHERE school_id = $1`,
      [schoolId]
    ).catch(() => ({ rows: [{ total: 0, covered: 0 }] }));

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalSchools,
        totalClasses,
        totalLessonsGenerated,
        monthlyActiveUsers,
        systemHealth: 'healthy' as const,
        classPerformanceComparison: (classPerformance.rows || []).map((row: any) => ({
          label: String(row.label || 'Class'),
          value: Number(row.value || 0),
        })),
        teacherPerformanceComparison: (teacherPerformance.rows || []).map((row: any) => ({
          label: String(row.teacher || 'Teacher').trim() || 'Teacher',
          value: Number(row.avg_score || 0),
        })),
        studentRiskDistribution: [
          { label: 'High Risk', value: Number(riskDistribution.rows[0]?.high || 0) },
          { label: 'Medium Risk', value: Number(riskDistribution.rows[0]?.medium || 0) },
          { label: 'Low Risk', value: Number(riskDistribution.rows[0]?.low || 0) },
        ],
        engagementTrendAcrossClasses,
        syllabusCoverage: {
          covered: Number(syllabusCoverageResult.rows[0]?.covered || 0),
          total: Number(syllabusCoverageResult.rows[0]?.total || 0),
        },
      },
    });
  } catch (error) {
    log.error('Failed to get analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
});
