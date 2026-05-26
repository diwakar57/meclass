/**
 * GET /api/student/learning-plan
 * GET /api/student/learning-plan/schedule
 * Student learning plan and schedule APIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * GET /api/student/learning-plan
 * Get student's current learning plan
 */
export const GET = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    // Get student's active learning plan
    const result = await db.query(
      `SELECT lp.*, c.title as course_title, ld.learning_profile
       FROM learning_plans lp
       LEFT JOIN courses c ON lp.course_id = c.id
       LEFT JOIN learning_dna ld ON lp.learning_dna_id = ld.id
       WHERE lp.student_id = $1
         AND lp.school_id = $2
         AND COALESCE(lp.status, 'active') = 'active'
       ORDER BY lp.created_at DESC
       LIMIT 1`,
      [auth.userId, auth.schoolId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        plan: null,
        message: 'No active learning plan found',
      });
    }

    const row = result.rows[0];
    const plan = {
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title || 'Learning Plan',
      status: row.status || 'active',
      startDate: row.start_date ? new Date(row.start_date) : null,
      projectedCompletionDate: row.projected_completion_date
        ? new Date(row.projected_completion_date)
        : null,
      originalSyllabus: parseJson(row.original_syllabus, []),
      personalizedSyllabus: parseJson(row.personalized_syllabus, {
        remediationTopics: [],
        mainTopics: [],
      }),
      learningProfile: parseJson(row.learning_profile, {
        paceType: 'medium',
        preferredStyle: 'interactive',
        recommendedTeachingStyle: 'friendly_tutor',
        mistakeType: 'mixed',
      }),
    };

    // Get next scheduled class
    const nextClassResult = await db.query(
      `SELECT * FROM scheduled_classes
       WHERE learning_plan_id = $1 AND scheduled_date >= CURRENT_DATE
       AND status = 'scheduled'
       ORDER BY scheduled_date ASC
       LIMIT 1`,
      [row.id]
    );

    let nextClass = null;
    if (nextClassResult.rows.length > 0) {
      const nextRow = nextClassResult.rows[0];
      nextClass = {
        id: nextRow.id,
        topicId: nextRow.topic_id,
        scheduledDate: new Date(nextRow.scheduled_date),
        status: nextRow.status,
      };
    }

    // Calculate progress
    const progressResult = await db.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM scheduled_classes
       WHERE learning_plan_id = $1`,
      [row.id]
    );

    const progress = progressResult.rows[0] || { total: 0, completed: 0 };
    const totalTopics = Number(progress.total || 0);
    const completedTopics = Number(progress.completed || 0);

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        nextClass,
        progress: {
          totalTopics,
          completedTopics,
          percentComplete: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Get learning plan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
