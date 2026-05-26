// app/api/students/progress/route.ts - Get student progress and mastery data

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

export const GET = withRole(['student', 'teacher'], async (req: NextRequest, auth: AuthContext) => {
  try {
    // Get student ID from query or use current user
    const studentId = req.nextUrl.searchParams.get('studentId') || auth.userId;

    // Permission check: students can only view their own progress
    if (auth.role === 'student' && studentId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Teachers can only access student progress within their own school tenant.
    if (auth.role === 'teacher') {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
      }

      const studentResult = await query(
        `SELECT school_id FROM users WHERE id = $1 AND role = 'student'`,
        [studentId]
      );

      if (studentResult.rowCount === 0) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      if (studentResult.rows[0].school_id !== auth.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const topicMasteryResult = await query(
      `SELECT
         COALESCE(tm.mastery_score, 0)::float AS mastery_score,
         COALESCE(c.subject, 'General') AS subject
       FROM topic_mastery tm
       LEFT JOIN topics t ON t.id = tm.topic_id
       LEFT JOIN curriculum c ON c.id = t.curriculum_id
       WHERE tm.student_id = $1
       ORDER BY tm.updated_at DESC`,
      [studentId]
    ).catch(() => ({ rows: [] as any[] }));

    const quizAttemptsResult = await query(
      `SELECT
         COALESCE(t.title, 'Quiz Attempt') AS topic_title,
         COALESCE(qa.score, 0)::float AS score,
         COALESCE(qa.max_score, 100)::float AS max_score,
         qa.completed_at
       FROM quiz_attempts qa
       LEFT JOIN topics t ON t.id = qa.topic_id
       WHERE qa.student_id = $1
       ORDER BY qa.completed_at DESC
       LIMIT 12`,
      [studentId]
    ).catch(() => ({ rows: [] as any[] }));

    const monthlyTrendResult = await query(
      `SELECT
         DATE_TRUNC('month', qa.completed_at) AS month_bucket,
         COALESCE(AVG((qa.score * 100.0) / NULLIF(qa.max_score, 0)), 0)::float AS avg_score
       FROM quiz_attempts qa
       WHERE qa.student_id = $1
         AND qa.completed_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', qa.completed_at)
       ORDER BY DATE_TRUNC('month', qa.completed_at) ASC`,
      [studentId]
    ).catch(() => ({ rows: [] as any[] }));

    const attemptsSummaryResult = await query(
      `SELECT
         COUNT(*)::int AS attempts,
         COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '7 days')::int AS recent_attempts
       FROM quiz_attempts
       WHERE student_id = $1`,
      [studentId]
    ).catch(() => ({ rows: [{ attempts: 0, recent_attempts: 0 }] as any[] }));

    const topicRows = topicMasteryResult.rows || [];
    const attemptRows = quizAttemptsResult.rows || [];
    const trendRows = monthlyTrendResult.rows || [];

    const masteryScores = topicRows.map((row: any) => Number(row.mastery_score || 0));
    const avgMastery =
      masteryScores.length > 0
        ? masteryScores.reduce((sum: number, value: number) => sum + value, 0) / masteryScores.length
        : 0;

    const quizPercentages = attemptRows.map((row: any) => {
      const maxScore = Math.max(Number(row.max_score || 0), 1);
      return Math.round((Number(row.score || 0) * 100) / maxScore);
    });
    const avgQuiz =
      quizPercentages.length > 0
        ? quizPercentages.reduce((sum: number, value: number) => sum + value, 0) / quizPercentages.length
        : 0;

    const overallProgress = Math.round(avgMastery > 0 ? avgMastery : avgQuiz);
    const totalModules = Math.max(topicRows.length, 1);
    const totalModulesCompleted = topicRows.filter((row: any) => Number(row.mastery_score || 0) >= 80).length;

    const subjects = new Map<string, { total: number; count: number }>();
    for (const row of topicRows) {
      const subject = String(row.subject || 'General');
      const existing = subjects.get(subject) || { total: 0, count: 0 };
      existing.total += Number(row.mastery_score || 0);
      existing.count += 1;
      subjects.set(subject, existing);
    }

    const progressBySubject = Array.from(subjects.entries()).map(([subject, values]) => ({
      label: subject,
      value: values.count > 0 ? Math.round(values.total / values.count) : 0,
    }));

    const recentActivity = attemptRows.slice(0, 6).map((row: any) => {
      const maxScore = Math.max(Number(row.max_score || 0), 1);
      return {
        date: row.completed_at,
        activity: `Quiz: ${String(row.topic_title || 'Assessment')}`,
        score: Math.round((Number(row.score || 0) * 100) / maxScore),
      };
    });

    const learningPathTimeline = trendRows.map((row: any) => {
      const date = new Date(row.month_bucket);
      return {
        label: date.toLocaleString('en-US', { month: 'short' }),
        value: Math.round(Number(row.avg_score || 0)),
      };
    });

    const summaryRow = attemptsSummaryResult.rows[0] || { attempts: 0, recent_attempts: 0 };
    const currentStreak = Math.min(Number(summaryRow.recent_attempts || 0), 7);

    const estimatedCompletionDate =
      overallProgress > 0
        ? new Date(
            Date.now() +
              Math.max(7, Math.round((100 - overallProgress) * 2)) * 24 * 60 * 60 * 1000
          ).toISOString()
        : undefined;

    return NextResponse.json({
      success: true,
      data: {
        overallProgress,
        totalModulesCompleted,
        totalModules,
        progressBySubject,
        recentActivity,
        estimatedCompletionDate,
        currentStreak,
        learningPathTimeline,
      },
    });
  } catch (error) {
    console.error('Progress fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
});
