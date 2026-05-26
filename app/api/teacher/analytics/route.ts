import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { safeMonthlySeries } from '@/lib/analytics/query-utils';
import type { AuthContext } from '@/lib/types/auth';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

function isDatabaseFailure(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  return (
    message.includes('econnrefused') ||
    message.includes('database_url') ||
    message.includes('connect') ||
    message.includes('postgres') ||
    message.includes('127.0.0.1:5432')
  );
}

const EMPTY_ANALYTICS = {
  studentProgressTrend: [] as Array<{ label: string; value: number }>,
  topicMasteryChart: [] as Array<{ label: string; value: number }>,
  quizPerformanceDistribution: [
    { label: 'Low', value: 0 },
    { label: 'Medium', value: 0 },
    { label: 'High', value: 0 },
  ],
  weakTopicHeatmap: [] as Array<{ label: string; value: number }>,
  assignmentCompletion: { completed: 0, total: 0 },
  learningPlanProgress: { active: 0, total: 0 },
};

export const GET = withRole(['teacher'], async (_req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
    }

    const teacherId = auth.userId;
    const schoolId = auth.schoolId;

  const studentProgressTrend = await safeMonthlySeries(
    'quiz_attempts',
    'completed_at',
    6,
    `WHERE school_id = $1 AND student_id IN (
      SELECT ce.student_id FROM class_enrollments ce
      INNER JOIN classes c ON c.id = ce.class_id
      WHERE c.teacher_id = $2
    )`,
    [schoolId, teacherId]
  ).catch(() => [] as Array<{ label: string; value: number }>);

  const topicMastery = await query(
    `SELECT COALESCE(t.title, 'Topic') AS topic,
            COALESCE(AVG(tm.mastery_score), 0)::float AS mastery
     FROM topic_mastery tm
     LEFT JOIN topics t ON t.id = tm.topic_id
     WHERE tm.school_id = $1
       AND tm.student_id IN (
         SELECT ce.student_id FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         WHERE c.teacher_id = $2
       )
     GROUP BY topic
     ORDER BY mastery DESC
     LIMIT 10`,
    [schoolId, teacherId]
  ).catch(() => ({ rows: [] as any[] }));

  const quizPerformanceDistribution = await query(
    `SELECT
      COUNT(*) FILTER (WHERE score < 40)::int AS low,
      COUNT(*) FILTER (WHERE score >= 40 AND score < 70)::int AS medium,
      COUNT(*) FILTER (WHERE score >= 70)::int AS high
     FROM quiz_attempts
     WHERE school_id = $1
       AND student_id IN (
         SELECT ce.student_id FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         WHERE c.teacher_id = $2
       )`,
    [schoolId, teacherId]
  ).catch(() => ({ rows: [{ low: 0, medium: 0, high: 0 }] }));

  const weakTopicHeatmap = await query(
    `SELECT COALESCE(t.title, 'Topic') AS topic,
            LEAST(100, GREATEST(0, 100 - COALESCE(AVG(tm.mastery_score), 0)))::float AS weakness
     FROM topic_mastery tm
     LEFT JOIN topics t ON t.id = tm.topic_id
     WHERE tm.school_id = $1
       AND tm.student_id IN (
         SELECT ce.student_id FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         WHERE c.teacher_id = $2
       )
     GROUP BY topic
     ORDER BY weakness DESC
     LIMIT 12`,
    [schoolId, teacherId]
  ).catch(() => ({ rows: [] as any[] }));

  const assignmentCompletion = await query(
    `SELECT
      COUNT(*)::int AS total_attempts,
      COUNT(*) FILTER (WHERE score >= 60)::int AS completed
     FROM quiz_attempts
     WHERE school_id = $1
       AND student_id IN (
         SELECT ce.student_id FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         WHERE c.teacher_id = $2
       )`,
    [schoolId, teacherId]
  ).catch(() => ({ rows: [{ total_attempts: 0, completed: 0 }] }));

  const learningPlanProgress = await query(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE current_topic_id IS NOT NULL)::int AS active
     FROM learning_plans
     WHERE school_id = $1
       AND student_id IN (
         SELECT ce.student_id FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         WHERE c.teacher_id = $2
       )`,
    [schoolId, teacherId]
  ).catch(() => ({ rows: [{ total: 0, active: 0 }] }));

    return NextResponse.json({
      success: true,
      data: {
        studentProgressTrend,
        topicMasteryChart: (topicMastery.rows || []).map((r: any) => ({
          label: String(r.topic),
          value: Number(r.mastery || 0),
        })),
        quizPerformanceDistribution: [
          { label: 'Low', value: Number(quizPerformanceDistribution.rows[0]?.low || 0) },
          { label: 'Medium', value: Number(quizPerformanceDistribution.rows[0]?.medium || 0) },
          { label: 'High', value: Number(quizPerformanceDistribution.rows[0]?.high || 0) },
        ],
        weakTopicHeatmap: (weakTopicHeatmap.rows || []).map((r: any) => ({
          label: String(r.topic),
          value: Number(r.weakness || 0),
        })),
        assignmentCompletion: {
          completed: Number(assignmentCompletion.rows[0]?.completed || 0),
          total: Number(assignmentCompletion.rows[0]?.total_attempts || 0),
        },
        learningPlanProgress: {
          active: Number(learningPlanProgress.rows[0]?.active || 0),
          total: Number(learningPlanProgress.rows[0]?.total || 0),
        },
      },
    });
  } catch (error) {
    if (isDevAuthFallbackEnabled() && isDatabaseFailure(error)) {
      return NextResponse.json({
        success: true,
        data: EMPTY_ANALYTICS,
        warning: 'Database unavailable. Returning empty analytics in development fallback mode.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch teacher analytics' },
      { status: 500 }
    );
  }
});
