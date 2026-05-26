import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentGradesAPI');

type AssignmentGradeRow = {
  assignment_title: string;
  class_name: string | null;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
};

type QuizGradeRow = {
  test_title: string | null;
  subject: string | null;
  score: number | null;
  completed_at: string | null;
};

export const GET = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const assignmentResult = await query<AssignmentGradeRow>(
      `SELECT
         a.title AS assignment_title,
         COALESCE(c.name, a.class_label, 'Class') AS class_name,
         s.score,
         a.max_score,
         s.submitted_at::text
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       LEFT JOIN classes c ON c.id = a.class_id
       WHERE s.student_id = $2
         AND a.school_id = $1
         AND s.score IS NOT NULL
       ORDER BY s.updated_at DESC`,
      [auth.schoolId, auth.userId]
    ).catch(() => ({ rows: [] as AssignmentGradeRow[] }));

    const quizResult = await query<QuizGradeRow>(
      `SELECT
         COALESCE(t.title, 'Chapter Test') AS test_title,
         COALESCE(c.subject, 'General') AS subject,
         qa.score,
         qa.completed_at::text
       FROM quiz_attempts qa
       LEFT JOIN topics t ON t.id = qa.topic_id
       LEFT JOIN curriculum c ON c.id = t.curriculum_id
       WHERE qa.school_id = $1
         AND qa.student_id = $2
       ORDER BY qa.completed_at DESC`,
      [auth.schoolId, auth.userId]
    ).catch(() => ({ rows: [] as QuizGradeRow[] }));

    const assignmentGrades = (assignmentResult.rows || []).map((row) => {
      const score = Number(row.score || 0);
      const maxScore = Number(row.max_score || 100);
      const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      return {
        title: String(row.assignment_title || 'Assignment'),
        className: String(row.class_name || 'Class'),
        score,
        maxScore,
        percent,
        submittedAt: row.submitted_at,
      };
    });

    const chapterTests = (quizResult.rows || []).map((row) => ({
      title: String(row.test_title || 'Chapter Test'),
      subject: String(row.subject || 'General'),
      score: Number(row.score || 0),
      completedAt: row.completed_at,
    }));

    const assignmentAverage =
      assignmentGrades.length > 0
        ? Math.round(assignmentGrades.reduce((sum, item) => sum + item.percent, 0) / assignmentGrades.length)
        : 0;

    const chapterTestAverage =
      chapterTests.length > 0
        ? Math.round(chapterTests.reduce((sum, item) => sum + item.score, 0) / chapterTests.length)
        : 0;

    const overallAverage =
      assignmentGrades.length + chapterTests.length > 0
        ? Math.round(
            (assignmentGrades.reduce((sum, item) => sum + item.percent, 0) +
              chapterTests.reduce((sum, item) => sum + item.score, 0)) /
              (assignmentGrades.length + chapterTests.length)
          )
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          assignmentAverage,
          chapterTestAverage,
          overallAverage,
          gradedAssignments: assignmentGrades.length,
          chapterTestsTaken: chapterTests.length,
        },
        assignmentGrades,
        chapterTests,
      },
    });
  } catch (error) {
    log.error('Failed to fetch student grades', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch student grades' }, { status: 500 });
  }
});
