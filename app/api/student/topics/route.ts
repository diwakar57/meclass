import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentTopicsAPI');

type TopicRow = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  estimated_duration_minutes: number | null;
  instructor_name: string | null;
  mastery_score: number | null;
  last_accessed_at: string | null;
  enrollment_date: string | null;
};

function toDifficulty(estimatedMinutes: number): 'beginner' | 'intermediate' | 'advanced' {
  if (estimatedMinutes <= 45) return 'beginner';
  if (estimatedMinutes <= 90) return 'intermediate';
  return 'advanced';
}

export const GET = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const schoolId = auth.schoolId;
    const studentId = auth.userId;

    const topicsResult = await query<TopicRow>(
      `SELECT
         t.id,
         t.title,
         t.description,
         COALESCE(c.subject, 'General') AS subject,
         COALESCE(t.estimated_duration_minutes, 60)::int AS estimated_duration_minutes,
         TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS instructor_name,
         COALESCE(tm.mastery_score, 0)::float AS mastery_score,
         tm.updated_at::text AS last_accessed_at,
         tm.created_at::text AS enrollment_date
       FROM topics t
       LEFT JOIN curriculum c ON c.id = t.curriculum_id
       LEFT JOIN users u ON u.id = c.created_by_teacher_id
       LEFT JOIN topic_mastery tm
         ON tm.topic_id = t.id
        AND tm.student_id = $2
        AND tm.school_id = $1
       WHERE t.school_id = $1
       ORDER BY COALESCE(t.order_index, 9999), t.created_at`,
      [schoolId, studentId]
    );

    const topicRows = topicsResult.rows || [];

    const allTopics = topicRows.map((row) => {
      const estimatedHours = Math.max(1, Math.round(Number(row.estimated_duration_minutes || 60) / 60));
      const lessonsTotal = Math.max(1, Math.round(Number(row.estimated_duration_minutes || 60) / 30));
      const completionPercentage = Math.max(0, Math.min(100, Math.round(Number(row.mastery_score || 0))));
      const lessonsCompleted = Math.min(lessonsTotal, Math.round((lessonsTotal * completionPercentage) / 100));
      const status =
        completionPercentage >= 90 ? 'completed' : completionPercentage > 0 ? 'in-progress' : 'not-started';

      return {
        id: String(row.id),
        title: String(row.title || 'Topic'),
        description: String(row.description || 'No description available.'),
        subject: String(row.subject || 'General'),
        difficulty: toDifficulty(Number(row.estimated_duration_minutes || 60)),
        completionPercentage,
        lessonsTotal,
        lessonsCompleted,
        estimatedHours,
        instructor: (row.instructor_name || '').trim() || 'Instructor',
        enrollmentDate: row.enrollment_date || new Date().toISOString(),
        status,
        lastAccessedDate: row.last_accessed_at || undefined,
      };
    });

    const trendResult = await query<{ week: string; progress: number }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', qa.completed_at), 'Mon DD') AS week,
         COALESCE(AVG(qa.score), 0)::float AS progress
       FROM quiz_attempts qa
       WHERE qa.school_id = $1
         AND qa.student_id = $2
         AND qa.completed_at >= NOW() - INTERVAL '8 weeks'
       GROUP BY DATE_TRUNC('week', qa.completed_at)
       ORDER BY DATE_TRUNC('week', qa.completed_at)`,
      [schoolId, studentId]
    ).catch(() => ({ rows: [] as { week: string; progress: number }[] }));

    const progressTrend = (trendResult.rows || []).map((row) => ({
      week: String(row.week),
      progress: Math.max(0, Math.min(100, Math.round(Number(row.progress || 0)))),
    }));

    const totalTopics = allTopics.length;
    const completedTopics = allTopics.filter((topic) => topic.status === 'completed').length;
    const inProgressTopics = allTopics.filter((topic) => topic.status === 'in-progress').length;
    const notStartedTopics = allTopics.filter((topic) => topic.status === 'not-started').length;

    const averageProgress =
      totalTopics > 0
        ? Math.round(allTopics.reduce((sum, topic) => sum + Number(topic.completionPercentage || 0), 0) / totalTopics)
        : 0;

    const totalHoursLearned = allTopics.reduce(
      (sum, topic) => sum + Math.round((topic.estimatedHours * topic.completionPercentage) / 100),
      0
    );

    const estimatedRemainingHours = Math.max(
      0,
      allTopics.reduce((sum, topic) => sum + topic.estimatedHours, 0) - totalHoursLearned
    );

    const topicsByDifficulty = [
      {
        difficulty: 'beginner',
        count: allTopics.filter((topic) => topic.difficulty === 'beginner').length,
      },
      {
        difficulty: 'intermediate',
        count: allTopics.filter((topic) => topic.difficulty === 'intermediate').length,
      },
      {
        difficulty: 'advanced',
        count: allTopics.filter((topic) => topic.difficulty === 'advanced').length,
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        totalTopics,
        completedTopics,
        inProgressTopics,
        notStartedTopics,
        averageProgress,
        totalHoursLearned,
        estimatedRemainingHours,
        topicsByDifficulty,
        progressTrend,
        allTopics,
      },
    });
  } catch (error) {
    log.error('Failed to fetch student topics', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch student topics' }, { status: 500 });
  }
});
