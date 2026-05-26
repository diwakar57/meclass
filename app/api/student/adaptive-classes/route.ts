/**
 * GET /api/student/adaptive-classes
 * Fetch adaptive classes generated from teacher syllabus
 * Returns personalized class schedule based on student's learning pace
 */

import { NextRequest } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { AuthContext } from '@/lib/types/auth';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentAdaptiveClassesAPI');

interface AdaptiveClassResponse {
  id: string;
  learningPlanId: string;
  topicName: string;
  subtopics: string[];
  objectives: string[];
  difficulty: 'low' | 'medium' | 'high';
  estimatedDurationMinutes: number;
  orderIndex: number;
  paceMultiplier: number;
  scheduledDate: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface AdaptiveClassesSummary {
  totalClasses: number;
  completed: number;
  inProgress: number;
  pending: number;
  estimatedTotalMinutes: number;
  estimatedCompletionDate: string | null;
  currentPaceMultiplier: number;
  nextClass: AdaptiveClassResponse | null;
}

export const GET = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return apiError('UNAUTHORIZED', 401, 'Invalid auth context');
    }

    const filter = req.nextUrl.searchParams.get('filter') || 'all'; // all, pending, completed
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    // Fetch learning plans for student
    const plansResult = await query(
      `SELECT id FROM learning_plans 
       WHERE student_id = $1 AND school_id = $2 AND status = 'active'`,
      [auth.userId, auth.schoolId]
    );

    if (!plansResult.rows.length) {
      return apiSuccess(
        {
          classes: [],
          summary: {
            totalClasses: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            estimatedTotalMinutes: 0,
            estimatedCompletionDate: null,
            currentPaceMultiplier: 1,
            nextClass: null,
          },
        },
        200
      );
    }

    const planIds = plansResult.rows.map((row) => row.id);

    // Build query based on filter
    let statusFilter = '';
    if (filter === 'pending') {
      statusFilter = "AND sc.status = 'pending'";
    } else if (filter === 'completed') {
      statusFilter = "AND sc.status = 'completed'";
    }

    // Fetch scheduled classes
    const classesResult = await query(
      `SELECT 
        sc.id, sc.learning_plan_id, sc.topic_name, sc.subtopics, 
        sc.objectives, sc.difficulty, sc.estimated_duration_minutes, 
        sc.order_index, sc.pace_multiplier, sc.scheduled_date, sc.status
       FROM scheduled_classes sc
       WHERE sc.learning_plan_id = ANY($1)
       ${statusFilter}
       ORDER BY sc.order_index ASC
       LIMIT $2 OFFSET $3`,
      [planIds, limit, offset]
    );

    // Format response
    const classes: AdaptiveClassResponse[] = classesResult.rows.map((row) => ({
      id: row.id,
      learningPlanId: row.learning_plan_id,
      topicName: row.topic_name,
      subtopics: typeof row.subtopics === 'string' ? JSON.parse(row.subtopics) : row.subtopics || [],
      objectives: typeof row.objectives === 'string' ? JSON.parse(row.objectives) : row.objectives || [],
      difficulty: row.difficulty,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      orderIndex: row.order_index,
      paceMultiplier: row.pace_multiplier,
      scheduledDate: row.scheduled_date?.toISOString() || new Date().toISOString(),
      status: row.status,
    }));

    // Calculate summary
    const allClassesResult = await query(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(estimated_duration_minutes) as total_minutes,
              AVG(pace_multiplier) as avg_pace
       FROM scheduled_classes
       WHERE learning_plan_id = ANY($1)`,
      [planIds]
    );

    const stats = allClassesResult.rows[0];
    const totalClasses = parseInt(stats.total) || 0;
    const completedCount = parseInt(stats.completed) || 0;
    const inProgressCount = parseInt(stats.in_progress) || 0;
    const pendingCount = parseInt(stats.pending) || 0;
    const totalMinutes = parseInt(stats.total_minutes) || 0;
    const avgPace = parseFloat(stats.avg_pace) || 1;

    // Calculate estimated completion date
    let estimatedCompletionDate: string | null = null;
    if (totalClasses > completedCount) {
      const remainingClasses = totalClasses - completedCount;
      const avgClassesPerDay = (3 / avgPace); // Assuming ~3 classes per day at standard pace
      const daysRemaining = Math.ceil(remainingClasses / avgClassesPerDay);
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + daysRemaining);
      estimatedCompletionDate = completionDate.toISOString();
    }

    // Get next class
    const nextClassResult = await query(
      `SELECT 
        sc.id, sc.learning_plan_id, sc.topic_name, sc.subtopics, 
        sc.objectives, sc.difficulty, sc.estimated_duration_minutes, 
        sc.order_index, sc.pace_multiplier, sc.scheduled_date, sc.status
       FROM scheduled_classes sc
       WHERE sc.learning_plan_id = ANY($1) AND sc.status IN ('pending', 'in-progress')
       ORDER BY sc.order_index ASC
       LIMIT 1`,
      [planIds]
    );

    let nextClass: AdaptiveClassResponse | null = null;
    if (nextClassResult.rows[0]) {
      const row = nextClassResult.rows[0];
      nextClass = {
        id: row.id,
        learningPlanId: row.learning_plan_id,
        topicName: row.topic_name,
        subtopics: typeof row.subtopics === 'string' ? JSON.parse(row.subtopics) : row.subtopics || [],
        objectives: typeof row.objectives === 'string' ? JSON.parse(row.objectives) : row.objectives || [],
        difficulty: row.difficulty,
        estimatedDurationMinutes: row.estimated_duration_minutes,
        orderIndex: row.order_index,
        paceMultiplier: row.pace_multiplier,
        scheduledDate: row.scheduled_date?.toISOString() || new Date().toISOString(),
        status: row.status,
      };
    }

    const summary: AdaptiveClassesSummary = {
      totalClasses,
      completed: completedCount,
      inProgress: inProgressCount,
      pending: pendingCount,
      estimatedTotalMinutes: totalMinutes,
      estimatedCompletionDate,
      currentPaceMultiplier: avgPace,
      nextClass,
    };

    log.info(
      `Fetched ${classes.length} adaptive classes for student ${auth.userId}, ` +
      `${completedCount}/${totalClasses} completed`
    );

    return apiSuccess(
      {
        classes,
        summary,
        pagination: {
          limit,
          offset,
          total: totalClasses,
          hasMore: offset + limit < totalClasses,
        },
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to fetch adaptive classes:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch adaptive classes', message);
  }
});
