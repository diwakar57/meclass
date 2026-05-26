import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { tableExists } from '@/lib/analytics/query-utils';
import type { AuthContext } from '@/lib/types/auth';

export const GET = withRole(['parent'], async (_req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
  }

  const schoolId = auth.schoolId;

  let linkedStudentIds: string[] = [];
  if (await tableExists('parent_student_links')) {
    const links = await query(
      `SELECT student_id FROM parent_student_links WHERE parent_id = $1`,
      [auth.userId]
    );
    linkedStudentIds = links.rows.map((r: any) => String(r.student_id));
  }

  // Fallback for environments without explicit mapping.
  if (linkedStudentIds.length === 0) {
    const fallback = await query(
      `SELECT id FROM users WHERE school_id = $1 AND role = 'student' ORDER BY created_at DESC LIMIT 1`,
      [schoolId]
    );
    linkedStudentIds = fallback.rows.map((r: any) => String(r.id));
  }

  if (linkedStudentIds.length > 0) {
    const scoped = await query(
      `SELECT id FROM users
       WHERE role = 'student' AND school_id = $1 AND id = ANY($2::text[])`,
      [schoolId, linkedStudentIds]
    );
    linkedStudentIds = scoped.rows.map((r: any) => String(r.id));
  }

  if (linkedStudentIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        childProgressSummary: { avgScore: 0, attempts: 0 },
        recentScoreTrend: [],
        strengthsVsWeaknesses: [],
        attendanceOrEngagementOverview: { activeDays: 0, recentAttempts: 0 },
        feePaymentSummary: { paid: 0, pending: 0 },
      },
    });
  }

  const list = linkedStudentIds.map((_, i) => `$${i + 1}`).join(', ');

  const summary = await query(
    `SELECT COALESCE(AVG(score), 0)::float AS avg_score,
            COUNT(*)::int AS attempts
     FROM quiz_attempts
     WHERE student_id IN (${list})`,
    linkedStudentIds
  ).catch(() => ({ rows: [{ avg_score: 0, attempts: 0 }] }));

  const trend = await query(
    `SELECT completed_at, COALESCE(score, 0)::float AS score
     FROM quiz_attempts
     WHERE student_id IN (${list})
     ORDER BY completed_at DESC
     LIMIT 8`,
    linkedStudentIds
  ).catch(() => ({ rows: [] as any[] }));

  const strengthsWeaknesses = await query(
    `SELECT COALESCE(t.title, 'Topic') AS topic,
            COALESCE(AVG(tm.mastery_score), 0)::float AS score
     FROM topic_mastery tm
     LEFT JOIN topics t ON t.id = tm.topic_id
     WHERE tm.student_id IN (${list})
     GROUP BY topic
     ORDER BY score DESC
     LIMIT 8`,
    linkedStudentIds
  ).catch(() => ({ rows: [] as any[] }));

  const attendance = await query(
    `SELECT COUNT(DISTINCT DATE(completed_at))::int AS active_days,
            COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '14 days')::int AS recent_attempts
     FROM quiz_attempts
     WHERE student_id IN (${list})`,
    linkedStudentIds
  ).catch(() => ({ rows: [{ active_days: 0, recent_attempts: 0 }] }));

  const fee = await query(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::float AS paid,
      COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0)::float AS pending
     FROM student_payments
     WHERE student_id IN (${list})`,
    linkedStudentIds
  ).catch(() => ({ rows: [{ paid: 0, pending: 0 }] }));

  return NextResponse.json({
    success: true,
    data: {
      childProgressSummary: {
        avgScore: Number(summary.rows[0]?.avg_score || 0),
        attempts: Number(summary.rows[0]?.attempts || 0),
      },
      recentScoreTrend: (trend.rows || []).reverse().map((row: any, idx: number) => ({
        label: `T${idx + 1}`,
        value: Number(row.score || 0),
      })),
      strengthsVsWeaknesses: (strengthsWeaknesses.rows || []).map((row: any) => ({
        label: String(row.topic),
        value: Number(row.score || 0),
      })),
      attendanceOrEngagementOverview: {
        activeDays: Number(attendance.rows[0]?.active_days || 0),
        recentAttempts: Number(attendance.rows[0]?.recent_attempts || 0),
      },
      feePaymentSummary: {
        paid: Number(fee.rows[0]?.paid || 0),
        pending: Number(fee.rows[0]?.pending || 0),
      },
    },
  });
});
