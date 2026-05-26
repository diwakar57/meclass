import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

export const GET = withRole(
  ['teacher', 'principal', 'school_admin', 'supervisor'],
  async (req: NextRequest, auth: AuthContext) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
    }

    const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days') || 30), 7), 365);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const scopedParams =
      auth.role === 'teacher'
        ? [auth.schoolId, cutoffDate.toISOString(), auth.userId]
        : [auth.schoolId, cutoffDate.toISOString()];

    const teacherScopeClause =
      auth.role === 'teacher'
        ? `
          AND EXISTS (
            SELECT 1
            FROM class_enrollments ce
            INNER JOIN classes c ON c.id = ce.class_id
            WHERE ce.student_id = s.student_id
              AND c.school_id = $1
              AND c.teacher_id = $3
          )
        `
        : '';

    const summaryResult = await query(
      `
      SELECT
        COUNT(*)::int AS total_sessions,
        COUNT(*) FILTER (WHERE s.completed_at IS NOT NULL OR s.status = 'completed')::int AS completed_sessions,
        COALESCE(AVG(r.engagement_score), 0)::float AS avg_engagement_score,
        COALESCE(AVG(r.quality_score), 0)::float AS avg_quality_score,
        COALESCE(AVG(r.accuracy_rate), 0)::float AS avg_accuracy_rate
      FROM ai_classroom_sessions s
      LEFT JOIN ai_session_results r ON r.session_id = s.id
      WHERE s.school_id = $1
        AND s.created_at >= $2::timestamp
        ${teacherScopeClause}
      `,
      scopedParams
    );

    const trendResult = await query(
      `
      SELECT
        DATE(s.created_at) AS date_bucket,
        COUNT(*)::int AS sessions,
        COALESCE(AVG(r.engagement_score), 0)::float AS avg_engagement_score,
        COALESCE(AVG(r.quality_score), 0)::float AS avg_quality_score
      FROM ai_classroom_sessions s
      LEFT JOIN ai_session_results r ON r.session_id = s.id
      WHERE s.school_id = $1
        AND s.created_at >= $2::timestamp
        ${teacherScopeClause}
      GROUP BY DATE(s.created_at)
      ORDER BY DATE(s.created_at) ASC
      `,
      scopedParams
    );

    const studentPerformanceResult = await query(
      `
      SELECT
        s.student_id,
        MAX(COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email, 'Student')) AS student_name,
        COUNT(*)::int AS sessions,
        COALESCE(AVG(r.quality_score), 0)::float AS avg_quality_score,
        COALESCE(AVG(r.engagement_score), 0)::float AS avg_engagement_score
      FROM ai_classroom_sessions s
      INNER JOIN users u ON u.id = s.student_id
      LEFT JOIN ai_session_results r ON r.session_id = s.id
      WHERE s.school_id = $1
        AND s.created_at >= $2::timestamp
        ${teacherScopeClause}
      GROUP BY s.student_id
      ORDER BY avg_quality_score DESC, sessions DESC
      LIMIT 25
      `,
      scopedParams
    );

    const topicCoverageResult = await query(
      `
      SELECT
        COALESCE(t.id::text, 'unmapped') AS topic_id,
        COALESCE(t.title, 'Unmapped Topic') AS topic_title,
        COUNT(*)::int AS sessions,
        COALESCE(AVG(r.quality_score), 0)::float AS avg_quality_score
      FROM ai_classroom_sessions s
      LEFT JOIN topics t ON t.id = s.topic_id
      LEFT JOIN ai_session_results r ON r.session_id = s.id
      WHERE s.school_id = $1
        AND s.created_at >= $2::timestamp
        ${teacherScopeClause}
      GROUP BY COALESCE(t.id::text, 'unmapped'), COALESCE(t.title, 'Unmapped Topic')
      ORDER BY sessions DESC
      LIMIT 20
      `,
      scopedParams
    );

    const atRiskResult = await query(
      `
      WITH ranked AS (
        SELECT
          s.student_id,
          COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email, 'Student') AS student_name,
          COALESCE(r.quality_score, 0)::float AS quality_score,
          ROW_NUMBER() OVER (PARTITION BY s.student_id ORDER BY s.created_at DESC) AS rn
        FROM ai_classroom_sessions s
        INNER JOIN users u ON u.id = s.student_id
        LEFT JOIN ai_session_results r ON r.session_id = s.id
        WHERE s.school_id = $1
          AND s.created_at >= $2::timestamp
          ${teacherScopeClause}
      )
      SELECT
        student_id,
        MAX(student_name) AS student_name,
        ROUND(AVG(quality_score)::numeric, 2)::float AS recent_quality_score
      FROM ranked
      WHERE rn <= 3
      GROUP BY student_id
      HAVING AVG(quality_score) < 50
      ORDER BY recent_quality_score ASC
      LIMIT 25
      `,
      scopedParams
    );

    const summary = summaryResult.rows[0] || {
      total_sessions: 0,
      completed_sessions: 0,
      avg_engagement_score: 0,
      avg_quality_score: 0,
      avg_accuracy_rate: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSessions: Number(summary.total_sessions || 0),
          completedSessions: Number(summary.completed_sessions || 0),
          averageEngagementScore: Number(summary.avg_engagement_score || 0),
          averageQualityScore: Number(summary.avg_quality_score || 0),
          averageAccuracyRate: Number(summary.avg_accuracy_rate || 0),
        },
        trend: trendResult.rows.map((row: any) => ({
          date: row.date_bucket,
          sessions: Number(row.sessions || 0),
          averageEngagementScore: Number(row.avg_engagement_score || 0),
          averageQualityScore: Number(row.avg_quality_score || 0),
        })),
        studentPerformance: studentPerformanceResult.rows.map((row: any) => ({
          studentId: row.student_id,
          studentName: row.student_name,
          sessions: Number(row.sessions || 0),
          averageQualityScore: Number(row.avg_quality_score || 0),
          averageEngagementScore: Number(row.avg_engagement_score || 0),
        })),
        topicCoverage: topicCoverageResult.rows.map((row: any) => ({
          topicId: row.topic_id,
          topicTitle: row.topic_title,
          sessions: Number(row.sessions || 0),
          averageQualityScore: Number(row.avg_quality_score || 0),
        })),
        atRiskStudents: atRiskResult.rows.map((row: any) => ({
          studentId: row.student_id,
          studentName: row.student_name,
          recentQualityScore: Number(row.recent_quality_score || 0),
        })),
      },
      meta: {
        days,
        cutoffDate: cutoffDate.toISOString(),
      },
    });
  }
);
