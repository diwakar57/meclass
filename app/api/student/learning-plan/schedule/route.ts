/**
 * GET /api/student/learning-plan/schedule
 * Get scheduled classes for learning plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

let tableColumnCache = new Map<string, Set<string>>();

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const cached = tableColumnCache.get(tableName);
  if (cached) {
    return cached;
  }

  const result = await db.query<{ column_name: string }>(
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

export const GET = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const [learningPlanColumns, scheduledClassColumns, topicColumns] = await Promise.all([
      getTableColumns('learning_plans'),
      getTableColumns('scheduled_classes'),
      getTableColumns('topics'),
    ]);

    if (
      !learningPlanColumns.has('id') ||
      !learningPlanColumns.has('student_id') ||
      !learningPlanColumns.has('school_id')
    ) {
      return NextResponse.json({
        success: true,
        scheduledClasses: [],
        message: 'Learning plan data is unavailable in this schema',
      });
    }

    const planWhereParts = ['student_id = $1', 'school_id = $2'];
    if (learningPlanColumns.has('status')) {
      planWhereParts.push("COALESCE(status::text, 'active') = 'active'");
    }

    const planOrderBy = learningPlanColumns.has('created_at') ? 'created_at DESC' : 'id DESC';

    // Get student's active learning plan
    const planResult = await db.query(
      `SELECT id
       FROM learning_plans
       WHERE ${planWhereParts.join(' AND ')}
       ORDER BY ${planOrderBy}
       LIMIT 1`,
      [auth.userId, auth.schoolId]
    );

    if (planResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        scheduledClasses: [],
        message: 'No active learning plan found',
      });
    }

    const planId = planResult.rows[0].id;

    if (!scheduledClassColumns.has('learning_plan_id') || !scheduledClassColumns.has('id')) {
      return NextResponse.json({
        success: true,
        scheduledClasses: [],
        pagination: {
          limit,
          offset,
          total: 0,
          hasMore: false,
        },
      });
    }

    const hasTopicJoin = scheduledClassColumns.has('topic_id') && topicColumns.has('id');
    const topicTitleSelect = hasTopicJoin && topicColumns.has('title') ? 't.title AS topic_title' : 'NULL::text AS topic_title';
    const scheduledDateSelect = scheduledClassColumns.has('scheduled_date')
      ? 'sc.scheduled_date'
      : scheduledClassColumns.has('created_at')
        ? 'sc.created_at AS scheduled_date'
        : 'NULL::timestamp AS scheduled_date';
    const scheduledTimeSelect = scheduledClassColumns.has('scheduled_time')
      ? 'sc.scheduled_time'
      : 'NULL::text AS scheduled_time';
    const statusSelect = scheduledClassColumns.has('status')
      ? 'sc.status'
      : "'scheduled'::text AS status";
    const remediationSelect = scheduledClassColumns.has('is_remediation_class')
      ? 'sc.is_remediation_class'
      : 'false AS is_remediation_class';
    const durationSelect = scheduledClassColumns.has('estimated_duration_minutes')
      ? 'sc.estimated_duration_minutes'
      : '45::int AS estimated_duration_minutes';
    const topicIdSelect = scheduledClassColumns.has('topic_id')
      ? 'sc.topic_id'
      : 'NULL::uuid AS topic_id';
    const orderBy = scheduledClassColumns.has('scheduled_date') ? 'sc.scheduled_date ASC' : 'sc.id ASC';
    const topicJoinSql = hasTopicJoin ? 'LEFT JOIN topics t ON sc.topic_id = t.id' : '';

    // Get scheduled classes with topic info
    const result = await db.query(
      `SELECT
         sc.id,
         ${topicIdSelect},
         ${topicTitleSelect},
         ${scheduledDateSelect},
         ${scheduledTimeSelect},
         ${remediationSelect},
         ${durationSelect},
         ${statusSelect}
       FROM scheduled_classes sc
       ${topicJoinSql}
       WHERE sc.learning_plan_id = $1
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [planId, limit, offset]
    );

    const scheduledClasses = result.rows.map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      topicTitle: row.topic_title || 'Topic',
      scheduledDate: row.scheduled_date ? new Date(row.scheduled_date) : null,
      scheduledTime: parseJson(row.scheduled_time, null),
      isRemediationClass: Boolean(row.is_remediation_class),
      estimatedDurationMinutes: Number(row.estimated_duration_minutes || 45),
      status: row.status || 'scheduled',
    }));

    // Get total count
    let total = scheduledClasses.length;
    if (scheduledClassColumns.has('learning_plan_id')) {
      const countResult = await db.query(
        'SELECT COUNT(*)::int AS total FROM scheduled_classes WHERE learning_plan_id = $1',
        [planId]
      );
      total = Number(countResult.rows[0]?.total || 0);
    }

    return NextResponse.json({
      success: true,
      scheduledClasses,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + scheduledClasses.length < total,
      },
    });
  } catch (error: any) {
    console.error('Get schedule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
