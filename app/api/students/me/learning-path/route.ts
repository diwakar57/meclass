import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

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

export const GET = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
    }

    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') || 5), 1), 20);
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
        data: {
          learningPlanId: null,
          nextSteps: [],
          progress: { completed: 0, total: 0, percent: 0 },
        },
      });
    }

    const planWhereParts = ['student_id = $1', 'school_id = $2'];
    if (learningPlanColumns.has('status')) {
      planWhereParts.push("COALESCE(status::text, 'active') = 'active'");
    }
    const createdAtOrder = learningPlanColumns.has('created_at') ? 'created_at DESC' : 'id DESC';
    const planStatusSelect = learningPlanColumns.has('status')
      ? 'status'
      : "'active'::text AS status";
    const planStartDateSelect = learningPlanColumns.has('start_date')
      ? 'start_date'
      : 'NULL::timestamp AS start_date';
    const planProjectedDateSelect = learningPlanColumns.has('projected_completion_date')
      ? 'projected_completion_date'
      : 'NULL::timestamp AS projected_completion_date';

    const planResult = await query(
      `SELECT id, ${planStatusSelect}, ${planStartDateSelect}, ${planProjectedDateSelect}
       FROM learning_plans
       WHERE ${planWhereParts.join(' AND ')}
       ORDER BY ${createdAtOrder}
       LIMIT 1`,
      [auth.userId, auth.schoolId]
    );

    if (planResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          learningPlanId: null,
          nextSteps: [],
          progress: { completed: 0, total: 0, percent: 0 },
        },
      });
    }

    const plan = planResult.rows[0];

    let nextSteps: Array<{
      id: string;
      order: number;
      topicId: string | null;
      topic: string;
      scheduledDate: string | null;
      status: string;
      remediation: boolean;
      estimatedDurationMinutes: number;
    }> = [];

    if (scheduledClassColumns.has('id') && scheduledClassColumns.has('learning_plan_id')) {
      const hasTopicJoin = scheduledClassColumns.has('topic_id') && topicColumns.has('id');
      const topicJoinSql = hasTopicJoin ? 'LEFT JOIN topics t ON t.id = sc.topic_id' : '';
      const topicTitleSelect = hasTopicJoin && topicColumns.has('title')
        ? 't.title AS topic_title'
        : 'NULL::text AS topic_title';
      const statusSelect = scheduledClassColumns.has('status')
        ? 'sc.status'
        : "'scheduled'::text AS status";
      const scheduledDateSelect = scheduledClassColumns.has('scheduled_date')
        ? 'sc.scheduled_date'
        : 'NULL::timestamp AS scheduled_date';
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

      const stepsResult = await query(
        `SELECT
           sc.id,
           ${topicIdSelect},
           ${scheduledDateSelect},
           ${statusSelect},
           ${remediationSelect},
           ${durationSelect},
           ${topicTitleSelect}
         FROM scheduled_classes sc
         ${topicJoinSql}
         WHERE sc.learning_plan_id = $1
         ORDER BY ${orderBy}
         LIMIT $2`,
        [plan.id, limit]
      );

      nextSteps = stepsResult.rows.map((row: any, idx: number) => ({
        id: row.id,
        order: idx + 1,
        topicId: row.topic_id || null,
        topic: row.topic_title || 'Topic',
        scheduledDate: row.scheduled_date || null,
        status: row.status || 'scheduled',
        remediation: Boolean(row.is_remediation_class),
        estimatedDurationMinutes: Number(row.estimated_duration_minutes || 45),
      }));
    }

    let total = 0;
    let completed = 0;
    if (scheduledClassColumns.has('learning_plan_id')) {
      const completedExpr = scheduledClassColumns.has('status')
        ? "COUNT(*) FILTER (WHERE status::text = 'completed')::int AS completed"
        : '0::int AS completed';
      const progressResult = await query(
        `SELECT COUNT(*)::int AS total, ${completedExpr}
         FROM scheduled_classes
         WHERE learning_plan_id = $1`,
        [plan.id]
      );
      total = Number(progressResult.rows[0]?.total || 0);
      completed = Number(progressResult.rows[0]?.completed || 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        learningPlanId: plan.id,
        status: plan.status || 'active',
        startDate: plan.start_date,
        projectedCompletionDate: plan.projected_completion_date,
        nextSteps,
        progress: {
          completed,
          total,
          percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning path',
        ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
      },
      { status: 500 }
    );
  }
});
