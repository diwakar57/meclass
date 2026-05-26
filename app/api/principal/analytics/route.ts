import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { safeMonthlySeries } from '@/lib/analytics/query-utils';
import type { AuthContext } from '@/lib/types/auth';

export const GET = withRole(['principal', 'school_admin'], async (_req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
  }

  const schoolId = auth.schoolId;

  const totalStudentsResult = await query(
    `SELECT COUNT(*)::int AS count FROM users WHERE school_id = $1 AND role = 'student'`,
    [schoolId]
  );
  const totalTeachersResult = await query(
    `SELECT COUNT(*)::int AS count FROM users WHERE school_id = $1 AND role = 'teacher'`,
    [schoolId]
  );

  const attendanceOrEngagementTrend = await safeMonthlySeries(
    'quiz_attempts',
    'completed_at',
    6,
    `WHERE school_id = $1`,
    [schoolId]
  );

  const subjectPerformanceResult = await query(
    `SELECT COALESCE(c.subject, 'general') AS subject,
            COALESCE(AVG(qa.score), 0)::float AS avg_score
     FROM quiz_attempts qa
     LEFT JOIN topics t ON t.id = qa.topic_id
     LEFT JOIN curriculum c ON c.id = t.curriculum_id
     WHERE qa.school_id = $1
     GROUP BY subject
     ORDER BY avg_score DESC
     LIMIT 8`,
    [schoolId]
  ).catch(() => ({ rows: [] as any[] }));

  const classPerformanceResult = await query(
    `SELECT c.name AS class_name,
            COALESCE(AVG(qa.score), 0)::float AS avg_score
     FROM classes c
     LEFT JOIN class_enrollments ce ON ce.class_id = c.id
     LEFT JOIN quiz_attempts qa ON qa.student_id = ce.student_id
     WHERE c.school_id = $1
     GROUP BY c.name
     ORDER BY avg_score DESC
     LIMIT 10`,
    [schoolId]
  ).catch(() => ({ rows: [] as any[] }));

  const feeCollectionSummaryResult = await query(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::float AS collected,
      COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0)::float AS outstanding
     FROM student_payments
     WHERE school_id = $1`,
    [schoolId]
  ).catch(() => ({ rows: [{ collected: 0, outstanding: 0 }] }));

  const syllabusCompletionResult = await query(
    `SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0)::int AS completed
     FROM syllabi
     WHERE school_id = $1`,
    [schoolId]
  ).catch(() => ({ rows: [{ total: 0, completed: 0 }] }));

  const attendanceTrend = attendanceOrEngagementTrend;
  const subjectPerformance = (subjectPerformanceResult.rows || []).map((r: any) => ({
    label: String(r.subject),
    value: Number(r.avg_score || 0),
  }));
  const classPerfComparison = (classPerformanceResult.rows || []).map((r: any) => ({
    label: String(r.class_name || 'Class'),
    value: Number(r.avg_score || 0),
  }));
  const feeCollection = {
    collected: Number(feeCollectionSummaryResult.rows[0]?.collected || 0),
    outstanding: Number(feeCollectionSummaryResult.rows[0]?.outstanding || 0),
  };
  const syllabusCompleted = Number(syllabusCompletionResult.rows[0]?.completed || 0);
  const syllabusTotal = Number(syllabusCompletionResult.rows[0]?.total || 0);
  const syllabusCompletion = syllabusTotal > 0 ? Math.round((syllabusCompleted / syllabusTotal) * 100) : 0;

  return NextResponse.json({
    success: true,
    data: {
      totalStudents: Number(totalStudentsResult.rows[0]?.count || 0),
      totalTeachers: Number(totalTeachersResult.rows[0]?.count || 0),
      attendanceTrend,
      subjectPerformance,
      classPerfComparison,
      feeCollection,
      syllabusCompletion,
      attendanceOrEngagementTrend,
      subjectPerformanceOverview: subjectPerformance,
      classPerformanceComparison: classPerfComparison,
      feeCollectionSummary: feeCollection,
      syllabusCompletionProgress: {
        completed: syllabusCompleted,
        total: syllabusTotal,
      },
    },
  });
});
