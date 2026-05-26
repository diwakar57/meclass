import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';
import { notificationService } from '@/lib/services/notification-service';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAccuracy(session: any): number {
  const averageScore = Number(session?.interactionData?.quizData?.averageScore ?? NaN);
  if (Number.isFinite(averageScore)) {
    return clamp(averageScore / 100, 0, 1);
  }
  return session?.status === 'completed' ? 0.65 : 0.5;
}

export const POST = withRole(
  ['student', 'teacher', 'principal', 'school_admin'],
  async (
    _req: NextRequest,
    auth: AuthContext,
    context?: { params?: { id?: string } } | Promise<{ params?: { id?: string } }>
  ) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
    }

    const resolvedContext =
      context && typeof (context as Promise<any>).then === 'function'
        ? await (context as Promise<any>)
        : context;
    const sessionId = resolvedContext?.params?.id;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session id is required' }, { status: 400 });
    }

    const session = await LearnAIIntegrationService.getSession(sessionId, auth.schoolId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (
      session.studentId !== auth.userId &&
      !['teacher', 'principal', 'school_admin'].includes(auth.role)
    ) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const interactionResult = await query(
      `SELECT total_interactions, avg_response_time_ms, quiz_attempts, help_requests
       FROM session_interaction_logs
       WHERE session_id = $1 AND school_id = $2`,
      [sessionId, auth.schoolId]
    );

    const interaction = interactionResult.rows[0] || {
      total_interactions: 0,
      avg_response_time_ms: null,
      quiz_attempts: 0,
      help_requests: 0,
    };

    const totalInteractions = Number(interaction.total_interactions || 0);
    const quizAttempts = Number(interaction.quiz_attempts || 0);
    const helpRequests = Number(interaction.help_requests || 0);
    const responseTimeMs = interaction.avg_response_time_ms
      ? Number(interaction.avg_response_time_ms)
      : null;

    const accuracyRate = normalizeAccuracy(session);
    const engagementScore = clamp(
      totalInteractions * 2 + quizAttempts * 8 - Math.max(0, helpRequests - 1) * 7,
      0,
      100
    );
    const growthScore = clamp(accuracyRate * 100 * 0.6 + engagementScore * 0.4, 0, 100);
    const qualityScore = clamp(
      engagementScore * 0.3 + accuracyRate * 100 * 0.4 + growthScore * 0.3,
      0,
      100
    );

    const masteryDelta = Number((clamp((qualityScore - 50) / 300, -0.08, 0.15)).toFixed(3));
    const deltaPoints = masteryDelta * 100;

    let newMasteryScore: number | null = null;

    if (session.topicId) {
      const seedMastery = clamp(50 + deltaPoints, 0, 100);
      const masteryResult = await query(
        `INSERT INTO topic_mastery (
           student_id, topic_id, school_id, mastery_score, mastery_level,
           confidence_level, attempts, correct_attempts, last_attempted_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $4, $5, 1, CASE WHEN $6 >= 0.7 THEN 1 ELSE 0 END, NOW(), NOW())
         ON CONFLICT (student_id, topic_id) DO UPDATE
         SET mastery_score = LEAST(100, GREATEST(0, topic_mastery.mastery_score + $7)),
             mastery_level = LEAST(100, GREATEST(0, COALESCE(topic_mastery.mastery_level, topic_mastery.mastery_score) + $7)),
             confidence_level = LEAST(100, GREATEST(0, $5)),
             attempts = topic_mastery.attempts + 1,
             correct_attempts = topic_mastery.correct_attempts + CASE WHEN $6 >= 0.7 THEN 1 ELSE 0 END,
             last_attempted_at = NOW(),
             updated_at = NOW()
         RETURNING mastery_score`,
        [
          session.studentId,
          session.topicId,
          auth.schoolId,
          seedMastery,
          qualityScore,
          accuracyRate,
          deltaPoints,
        ]
      );
      newMasteryScore = Number(masteryResult.rows[0]?.mastery_score || seedMastery);

      const predictedMastery = clamp(
        (newMasteryScore || seedMastery) + (qualityScore - 50) * 0.25,
        0,
        100
      );
      const riskLevel =
        qualityScore < 50 ? 'high' : qualityScore < 70 ? 'medium' : 'low';
      const predictedOutcome =
        predictedMastery >= 80 ? 'on_track' : predictedMastery >= 60 ? 'watch' : 'at_risk';

      await query(
        `INSERT INTO learning_predictions (
           student_id, school_id, topic_id, predicted_mastery_score, confidence_level,
           predicted_outcome, risk_level, target_date, model_version, input_snapshot, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE + INTERVAL '30 days', 'rule_v1', $8::jsonb, NOW())`,
        [
          session.studentId,
          auth.schoolId,
          session.topicId,
          predictedMastery,
          qualityScore,
          predictedOutcome,
          riskLevel,
          JSON.stringify({
            sessionId,
            engagementScore,
            accuracyRate,
            qualityScore,
            masteryDelta,
          }),
        ]
      );
    }

    await query(
      `INSERT INTO ai_session_results (
         session_id, school_id, student_id, topic_id, accuracy_rate, response_time_ms,
         engagement_score, quality_score, mastery_delta, processed_at, metadata, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10::jsonb, NOW())
       ON CONFLICT (session_id) DO UPDATE
       SET accuracy_rate = EXCLUDED.accuracy_rate,
           response_time_ms = EXCLUDED.response_time_ms,
           engagement_score = EXCLUDED.engagement_score,
           quality_score = EXCLUDED.quality_score,
           mastery_delta = EXCLUDED.mastery_delta,
           processed_at = NOW(),
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
      [
        sessionId,
        auth.schoolId,
        session.studentId,
        session.topicId || null,
        Number((accuracyRate * 100).toFixed(2)),
        responseTimeMs,
        Number(engagementScore.toFixed(2)),
        Number(qualityScore.toFixed(2)),
        masteryDelta,
        JSON.stringify({
          totalInteractions,
          quizAttempts,
          helpRequests,
        }),
      ]
    );

    await notificationService
      .create({
        schoolId: auth.schoolId,
        userId: session.studentId,
        title: 'AI Session Processed',
        content: `Your AI session quality score is ${Math.round(qualityScore)}%.`,
        category: 'learning',
        priority: qualityScore < 55 ? 'high' : 'medium',
        channels: ['in_app'],
        metadata: {
          sessionId,
          qualityScore,
          masteryDelta,
          newMasteryScore,
        },
      })
      .catch(() => undefined);

    if (qualityScore < 50) {
      const staffResult = await query(
        `SELECT DISTINCT u.id
         FROM users u
         LEFT JOIN classes c ON c.teacher_id = u.id AND c.school_id = $2
         LEFT JOIN class_enrollments ce ON ce.class_id = c.id AND ce.student_id = $1
         WHERE u.school_id = $2
           AND u.role IN ('teacher', 'principal', 'school_admin')
           AND (u.role IN ('principal', 'school_admin') OR ce.student_id IS NOT NULL)`,
        [session.studentId, auth.schoolId]
      );

      await Promise.all(
        staffResult.rows.map((row: any) =>
          notificationService.create({
            schoolId: auth.schoolId,
            userId: String(row.id),
            title: 'At-Risk AI Session Alert',
            content: `Student session ${sessionId} has low engagement/performance (${Math.round(
              qualityScore
            )}%).`,
            category: 'teacher_alert',
            priority: 'high',
            channels: ['in_app'],
            metadata: {
              sessionId,
              studentId: session.studentId,
              qualityScore,
            },
          })
        )
      ).catch(() => undefined);
    }

    const parentLinks = await query(
      `SELECT parent_id FROM parent_student_links WHERE student_id = $1 AND school_id = $2`,
      [session.studentId, auth.schoolId]
    ).catch(() => ({ rows: [] as any[] }));

    await Promise.all(
      parentLinks.rows.map((row: any) =>
        notificationService.create({
          schoolId: auth.schoolId,
          userId: String(row.parent_id),
          title: 'Child AI Session Update',
          content: `A new AI session result is available with quality ${Math.round(qualityScore)}%.`,
          category: 'parent_update',
          priority: qualityScore < 50 ? 'high' : 'medium',
          channels: ['in_app'],
          metadata: {
            sessionId,
            studentId: session.studentId,
            qualityScore,
          },
        })
      )
    ).catch(() => undefined);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        accuracyRate: Number((accuracyRate * 100).toFixed(2)),
        responseTimeMs,
        engagementScore: Number(engagementScore.toFixed(2)),
        qualityScore: Number(qualityScore.toFixed(2)),
        masteryDelta,
        newMasteryScore,
      },
    });
  }
);
