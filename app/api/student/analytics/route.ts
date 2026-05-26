import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { safeMonthlySeries } from '@/lib/analytics/query-utils';
import type { AuthContext } from '@/lib/types/auth';
import { LearningDNAService } from '@/lib/services/learning-dna';

const tableColumnCache = new Map<string, Set<string>>();

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const cached = tableColumnCache.get(tableName);
  if (cached) {
    return cached;
  }

  const result = await query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1`,
    [tableName]
  );

  const columns = new Set((result.rows || []).map((row) => String(row.column_name || '').toLowerCase()));
  tableColumnCache.set(tableName, columns);
  return columns;
}

export const GET = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
  }

  const studentId = auth.userId;
  const schoolId = auth.schoolId;

  const personalProgressOverTime = await safeMonthlySeries(
    'quiz_attempts',
    'completed_at',
    6,
    'WHERE school_id = $1 AND student_id = $2',
    [schoolId, studentId]
  );

  const masteryByTopicResult = await query(
    `SELECT COALESCE(t.title, 'Topic') AS topic,
            COALESCE(tm.mastery_score, 0)::float AS mastery
     FROM topic_mastery tm
     LEFT JOIN topics t ON t.id = tm.topic_id
     WHERE tm.school_id = $1 AND tm.student_id = $2
     ORDER BY tm.updated_at DESC
     LIMIT 10`,
    [schoolId, studentId]
  ).catch(() => ({ rows: [] as any[] }));

  const completedVsPending = await query(
    `SELECT
      COUNT(*) FILTER (WHERE score >= 60)::int AS completed,
      COUNT(*) FILTER (WHERE score < 60)::int AS pending
     FROM quiz_attempts
     WHERE school_id = $1 AND student_id = $2`,
    [schoolId, studentId]
  ).catch(() => ({ rows: [{ completed: 0, pending: 0 }] }));

  const quizScoreHistoryResult = await query(
    `SELECT COALESCE(score, 0)::float AS score,
            completed_at
     FROM quiz_attempts
     WHERE school_id = $1 AND student_id = $2
     ORDER BY completed_at DESC
     LIMIT 12`,
    [schoolId, studentId]
  ).catch(() => ({ rows: [] as any[] }));

  const confidenceVsPerformance = await query(
    `SELECT
      COALESCE(AVG(tm.confidence_level), 0)::float AS confidence,
      COALESCE(AVG(tm.mastery_score), 0)::float AS performance
     FROM topic_mastery tm
     WHERE tm.school_id = $1 AND tm.student_id = $2`,
    [schoolId, studentId]
  ).catch(() => ({ rows: [{ confidence: 0, performance: 0 }] }));

  const activitySummary = await query(
    `SELECT
      COUNT(*)::int AS attempts,
      COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '7 days')::int AS recent_attempts
     FROM quiz_attempts
     WHERE school_id = $1 AND student_id = $2`,
    [schoolId, studentId]
  ).catch(() => ({ rows: [{ attempts: 0, recent_attempts: 0 }] }));

  const learningDNA = await LearningDNAService.getLearningDNA(studentId).catch(() => null);

  const membershipColumns = await getTableColumns('school_memberships').catch(() => new Set<string>());
  const membershipCountResult = membershipColumns.has('student_id')
    ? await query(
        `SELECT COUNT(*)::int AS count
         FROM school_memberships
         WHERE student_id = $1
           ${membershipColumns.has('status') ? "AND status::text IN ('approved', 'active')" : ''}`,
        [studentId]
      ).catch(() => ({ rows: [{ count: 1 }] }))
    : ({ rows: [{ count: 1 }] } as { rows: Array<{ count: number }> });

  const masteryByTopic = (masteryByTopicResult.rows || []).map((r: any) => ({
    label: String(r.topic),
    value: Number(r.mastery || 0),
  }));

  const quizScoreHistory = (quizScoreHistoryResult.rows || [])
    .reverse()
    .map((r: any, idx: number) => ({ label: `Q${idx + 1}`, value: Number(r.score || 0) }));

  const completedVsPendingLessons = {
    completed: Number(completedVsPending.rows[0]?.completed || 0),
    pending: Number(completedVsPending.rows[0]?.pending || 0),
  };

  const avgMastery =
    masteryByTopic.length > 0
      ? masteryByTopic.reduce((sum, item) => sum + Number(item.value || 0), 0) / masteryByTopic.length
      : 0;

  const avgQuizScore =
    quizScoreHistory.length > 0
      ? quizScoreHistory.reduce((sum, item) => sum + Number(item.value || 0), 0) / quizScoreHistory.length
      : 0;

  const overallProgress = Math.round(avgMastery > 0 ? avgMastery : avgQuizScore);
  const schoolCount = Math.max(1, Number(membershipCountResult.rows[0]?.count || 1));

  const totalAttempts = Number(activitySummary.rows[0]?.attempts || 0);
  const recentAttempts = Number(activitySummary.rows[0]?.recent_attempts || 0);
  const currentStreak = Math.min(recentAttempts, 7);
  const bestStreak = Math.max(currentStreak, Math.min(totalAttempts, 14));

  const confidenceScore =
    learningDNA && Number.isFinite(Number(learningDNA.attentionSpanScore))
      ? Math.round((Number(learningDNA.attentionSpanScore || 0) + Number(learningDNA.recoveryRate || 0)) / 2)
      : Math.round(Number(confidenceVsPerformance.rows[0]?.confidence || 0));

  const learningDNAData = {
    paceType: learningDNA?.paceType || 'medium',
    mistakeType: learningDNA?.mistakeType || 'mixed',
    preferredStyle: learningDNA?.preferredStyle || 'interactive',
    confidenceScore,
    attentionSpanScore: Number(learningDNA?.attentionSpanScore || 0),
    recoveryRate: Number(learningDNA?.recoveryRate || 0),
  };

  return NextResponse.json({
    success: true,
    data: {
      overallProgress,
      schoolCount,
      personalProgressOverTime,
      masteryByTopic,
      completedVsPendingLessons,
      quizScoreHistory,
      confidenceVsPerformance: {
        confidence: Number(confidenceVsPerformance.rows[0]?.confidence || 0),
        performance: Number(confidenceVsPerformance.rows[0]?.performance || 0),
      },
      streakAndActivity: {
        totalAttempts,
        recentAttempts,
      },
      streakStatus: {
        currentStreak,
        bestStreak,
      },
      learningDNA: learningDNAData,
    },
  });
});
