import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentAssignmentsAPI');

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
  class_name: string | null;
  assignment_status: string | null;
  submission_status: string | null;
  score: number | null;
  submitted_at: string | null;
  feedback: string | null;
};

let assignmentColumnCache: Set<string> | null = null;
let submissionColumnCache: Set<string> | null = null;
let classColumnCache: Set<string> | null = null;

async function getTableColumns(tableName: 'assignments' | 'assignment_submissions' | 'classes') {
  if (tableName === 'assignments' && assignmentColumnCache) return assignmentColumnCache;
  if (tableName === 'assignment_submissions' && submissionColumnCache) return submissionColumnCache;
  if (tableName === 'classes' && classColumnCache) return classColumnCache;

  const result = await query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1`,
    [tableName]
  );

  const columns = new Set(
    (result.rows || []).map((row) => String(row.column_name || '').toLowerCase())
  );

  if (tableName === 'assignments') assignmentColumnCache = columns;
  if (tableName === 'assignment_submissions') submissionColumnCache = columns;
  if (tableName === 'classes') classColumnCache = columns;

  return columns;
}

export const GET = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const [assignmentColumns, submissionColumns, classColumns] = await Promise.all([
      getTableColumns('assignments'),
      getTableColumns('assignment_submissions'),
      getTableColumns('classes'),
    ]);

    if (!assignmentColumns.has('id') || !assignmentColumns.has('title')) {
      return NextResponse.json({
        success: true,
        data: {
          assignments: [],
          summary: {
            total: 0,
            submitted: 0,
            pending: 0,
            graded: 0,
          },
        },
      });
    }

    const assignmentClassLabelExpr = assignmentColumns.has('class_label')
      ? 'a.class_label'
      : assignmentColumns.has('class_name')
        ? 'a.class_name'
        : 'NULL::text';

    const supportsClassJoin = assignmentColumns.has('class_id');
    const supportsClassLookup = supportsClassJoin && classColumns.size > 0;

    const classNameExpr = supportsClassLookup
      ? classColumns.has('name')
        ? 'c.name'
        : classColumns.has('title')
          ? 'c.title'
          : classColumns.has('class_name')
            ? 'c.class_name'
            : 'NULL::text'
      : 'NULL::text';

    const submissionPresenceExpr = submissionColumns.has('id')
      ? 's.id'
      : submissionColumns.has('assignment_id')
        ? 's.assignment_id'
        : null;

    const submittedPredicate = submissionColumns.has('status')
      ? "COALESCE(s.status, 'not-submitted') IN ('submitted', 'graded')"
      : submissionPresenceExpr
        ? `${submissionPresenceExpr} IS NOT NULL`
        : 'FALSE';

    const pendingPredicate = submissionColumns.has('status')
      ? "COALESCE(s.status, 'not-submitted') = 'not-submitted'"
      : submissionPresenceExpr
        ? `${submissionPresenceExpr} IS NULL`
        : 'TRUE';

    const assignmentDescriptionSelect = assignmentColumns.has('description')
      ? 'a.description AS description'
      : 'NULL::text AS description';
    const assignmentDueDateSelect = assignmentColumns.has('due_date')
      ? 'a.due_date::text AS due_date'
      : assignmentColumns.has('due_at')
        ? 'a.due_at::text AS due_date'
        : 'NULL::text AS due_date';
    const assignmentMaxScoreSelect = assignmentColumns.has('max_score')
      ? 'a.max_score'
      : assignmentColumns.has('points')
        ? 'a.points AS max_score'
        : '100::numeric AS max_score';
    const assignmentStatusSelect = assignmentColumns.has('status')
      ? 'a.status AS assignment_status'
      : "'active'::text AS assignment_status";
    const submissionStatusSelect = submissionColumns.has('status')
      ? "COALESCE(s.status, 'not-submitted') AS submission_status"
      : submissionPresenceExpr
        ? `CASE WHEN ${submissionPresenceExpr} IS NULL THEN 'not-submitted' ELSE 'submitted' END AS submission_status`
        : "'not-submitted'::text AS submission_status";
    const submissionScoreSelect = submissionColumns.has('score')
      ? 's.score'
      : 'NULL::numeric AS score';
    const submissionSubmittedAtSelect = submissionColumns.has('submitted_at')
      ? 's.submitted_at::text AS submitted_at'
      : 'NULL::text AS submitted_at';
    const submissionFeedbackSelect = submissionColumns.has('feedback')
      ? 's.feedback'
      : 'NULL::text AS feedback';

    const statusFilter = req.nextUrl.searchParams.get('status');
    const classFilter = req.nextUrl.searchParams.get('classId');

    const params: unknown[] = [auth.schoolId, auth.userId];
    let whereSql = 'WHERE a.school_id = $1';

    if (classFilter && supportsClassJoin) {
      params.push(classFilter);
      whereSql += ` AND a.class_id = $${params.length}`;
    }

    if (statusFilter === 'submitted') {
      whereSql += ` AND ${submittedPredicate}`;
    } else if (statusFilter === 'pending') {
      whereSql += ` AND ${pendingPredicate}`;
    }

    if (!supportsClassJoin) {
      return NextResponse.json({
        success: true,
        data: {
          assignments: [],
          summary: {
            total: 0,
            submitted: 0,
            pending: 0,
            graded: 0,
          },
        },
      });
    }

    const enrollmentJoinSql = supportsClassJoin
      ? 'JOIN class_enrollments ce ON ce.class_id = a.class_id AND ce.student_id = $2'
      : '';
    const classJoinSql = supportsClassLookup
      ? 'LEFT JOIN classes c ON c.id = a.class_id'
      : '';

    const submissionJoinSql = submissionColumns.size > 0
      ? 'LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = $2'
      : '';

    const createdAtOrderExpr = assignmentColumns.has('created_at') ? 'a.created_at DESC' : 'a.id DESC';

    const result = await query<AssignmentRow>(
      `SELECT
         a.id,
         a.title,
         ${assignmentDescriptionSelect},
         ${assignmentDueDateSelect},
         ${assignmentMaxScoreSelect},
         COALESCE(${classNameExpr}, ${assignmentClassLabelExpr}, 'Class') AS class_name,
         ${assignmentStatusSelect},
         ${submissionStatusSelect},
         ${submissionScoreSelect},
         ${submissionSubmittedAtSelect},
         ${submissionFeedbackSelect}
       FROM assignments a
       ${enrollmentJoinSql}
       ${classJoinSql}
       ${submissionJoinSql}
       ${whereSql}
       ORDER BY ${assignmentColumns.has('due_date') ? 'a.due_date ASC NULLS LAST,' : ''} ${createdAtOrderExpr}`,
      params
    );

    const assignments = (result.rows || []).map((row) => ({
      id: String(row.id),
      title: String(row.title || 'Assignment'),
      description: String(row.description || 'No description provided.'),
      className: String(row.class_name || 'Class'),
      dueDate: row.due_date,
      maxScore: Number(row.max_score || 100),
      assignmentStatus: String(row.assignment_status || 'active'),
      submissionStatus: String(row.submission_status || 'not-submitted'),
      score: row.score == null ? null : Number(row.score),
      submittedAt: row.submitted_at,
      feedback: row.feedback,
    }));

    const submittedCount = assignments.filter((a) => ['submitted', 'graded'].includes(a.submissionStatus)).length;
    const gradedCount = assignments.filter((a) => a.score !== null).length;

    return NextResponse.json({
      success: true,
      data: {
        assignments,
        summary: {
          total: assignments.length,
          submitted: submittedCount,
          pending: Math.max(0, assignments.length - submittedCount),
          graded: gradedCount,
        },
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    log.error('Failed to fetch student assignments', { detail });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch student assignments',
        ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
      },
      { status: 500 }
    );
  }
});
