import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { LearningDNAService } from '@/lib/services/learning-dna';

type TopicScore = { area: string; score: number };

function toLabelMonth(input: Date): string {
  return input.toLocaleString('en-US', { month: 'short' });
}

export const GET = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
  }

  const studentId = auth.userId;
  const schoolId = auth.schoolId;

  const [dna, topicScoresResult, trendResult, attemptsResult, scheduleResult] = await Promise.all([
    LearningDNAService.getLearningDNA(studentId).catch(() => null),
    query(
      `SELECT COALESCE(t.title, 'Topic') AS topic_title,
              COALESCE(tm.mastery_score, tm.mastery_level, 0)::float AS mastery_score
       FROM topic_mastery tm
       LEFT JOIN topics t ON t.id = tm.topic_id
       WHERE tm.student_id = $1 AND tm.school_id = $2
       ORDER BY mastery_score DESC`,
      [studentId, schoolId]
    ).catch(() => ({ rows: [] as any[] })),
    query(
      `SELECT DATE_TRUNC('month', completed_at) AS month_bucket,
              COALESCE(AVG(score), 0)::float AS avg_score
       FROM quiz_attempts
       WHERE student_id = $1 AND school_id = $2 AND completed_at IS NOT NULL
       GROUP BY month_bucket
       ORDER BY month_bucket DESC
       LIMIT 6`,
      [studentId, schoolId]
    ).catch(() => ({ rows: [] as any[] })),
    query(
      `SELECT completed_at
       FROM quiz_attempts
       WHERE student_id = $1 AND school_id = $2 AND completed_at IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT 200`,
      [studentId, schoolId]
    ).catch(() => ({ rows: [] as any[] })),
    query(
      `SELECT t.title
       FROM scheduled_classes sc
       INNER JOIN learning_plans lp ON lp.id = sc.learning_plan_id
       LEFT JOIN topics t ON t.id = sc.topic_id
       WHERE lp.student_id = $1
         AND lp.school_id = $2
         AND COALESCE(lp.status, 'active') = 'active'
         AND sc.status = 'scheduled'
       ORDER BY sc.scheduled_date ASC
       LIMIT 5`,
      [studentId, schoolId]
    ).catch(() => ({ rows: [] as any[] })),
  ]);

  const topicScores = topicScoresResult.rows.map((row: any) => ({
    area: String(row.topic_title || 'Topic'),
    score: Number(row.mastery_score || 0),
  }));

  const strengths: TopicScore[] = topicScores.slice(0, 5);
  const weaknesses: TopicScore[] = [...topicScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const dominantStyle = dna?.preferredStyle || 'interactive';
  const learningStyle = {
    visual: dominantStyle === 'visual' ? 80 : 45,
    auditory: dominantStyle === 'story' ? 72 : 40,
    kinesthetic: dominantStyle === 'interactive' ? 78 : 35,
    readingWriting: dominantStyle === 'text' ? 80 : 42,
    dominantStyle,
  };

  const paceLabel =
    dna?.paceType === 'fast' ? 'Accelerated' : dna?.paceType === 'slow' ? 'Guided' : 'Balanced';

  const trend = [...trendResult.rows]
    .reverse()
    .map((row: any) => ({
      month: toLabelMonth(new Date(row.month_bucket)),
      score: Math.round(Number(row.avg_score || 0)),
    }));

  const hourBuckets = {
    Morning: { total: 0, count: 0 },
    Afternoon: { total: 0, count: 0 },
    Evening: { total: 0, count: 0 },
  };

  attemptsResult.rows.forEach((row: any) => {
    if (!row.completed_at) return;
    const date = new Date(row.completed_at);
    const hour = date.getHours();
    const key = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    hourBuckets[key as keyof typeof hourBuckets].total += 1;
    hourBuckets[key as keyof typeof hourBuckets].count += 1;
  });

  const maxBucket = Math.max(
    ...Object.values(hourBuckets).map((bucket) => bucket.total),
    1
  );

  const timePreferences = Object.entries(hourBuckets).map(([timeSlot, bucket]) => ({
    timeSlot,
    effectiveness: Math.round((bucket.total / maxBucket) * 100),
  }));

  const learningPathSuggestion =
    scheduleResult.rows.length > 0
      ? scheduleResult.rows.map((row: any, idx: number) => ({
          topic: String(row.title || `Scheduled Topic ${idx + 1}`),
          readiness: Math.max(35, 85 - idx * 10),
        }))
      : weaknesses.slice(0, 3).map((topic, idx) => ({
          topic: topic.area,
          readiness: Math.max(30, 70 - idx * 8),
        }));

  const avgMastery =
    topicScores.length > 0
      ? topicScores.reduce((sum, topic) => sum + topic.score, 0) / topicScores.length
      : 0;
  const focusScore = Math.round(
    Math.max(35, Math.min(95, (dna?.attentionSpanScore || 50) * 0.8 + avgMastery * 0.2))
  );

  const recommendations = [
    {
      category: 'Targeted Reinforcement',
      suggestion:
        weaknesses.length > 0
          ? `Review ${weaknesses[0].area} with guided examples before your next quiz.`
          : 'Keep practicing core topics to maintain momentum.',
      urgency: weaknesses.length > 0 && weaknesses[0].score < 50 ? 'high' : 'medium',
    },
    {
      category: 'Study Rhythm',
      suggestion: `Follow a ${paceLabel.toLowerCase()} pace and complete short daily sessions for better retention.`,
      urgency: 'low',
    },
    {
      category: 'Confidence Calibration',
      suggestion:
        dna?.mistakeType === 'careless'
          ? 'Use a final answer-check routine before submitting each attempt.'
          : 'Write a short explanation for each answer to improve confidence accuracy.',
      urgency: 'medium',
    },
  ];

  return NextResponse.json({
    success: true,
    data: {
      learningStyle,
      strengths,
      weaknesses,
      recommendations,
      paceAnalysis: {
        recommendedPace: paceLabel,
        currentPace: paceLabel,
        efficiency: Math.round(Math.max(40, Math.min(95, dna?.recoveryRate || 55))),
      },
      timePreferences,
      learningPathSuggestion,
      academicTrendline: trend,
      engagementMetrics: {
        timeSpentPerWeek: Math.min(20, Math.max(2, Math.round(attemptsResult.rows.length / 5))),
        averageSessionDuration: 22,
        consistencyScore: Math.round(Math.max(35, Math.min(95, (dna?.recoveryRate || 50)))),
        focusScore,
      },
    },
  });
});
