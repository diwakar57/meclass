import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { query } from '@/lib/db';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

interface ParentChild {
  id: string;
  name: string;
  class: string;
  school: string;
  currentGPA: number;
  recentGrade: number;
  attendanceRate: number;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fullName(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  return name || email || 'Unknown';
}

async function getChildrenSummary(schoolId: string, parentId: string): Promise<ParentChild[]> {
  const result = await query(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       u.email,
       s.name AS school_name,
       COALESCE(sp.grade_level, cls.class_name, 'Unassigned') AS class_name,
       COALESCE(qa.gpa, 0)::numeric(7,2) AS current_gpa,
       COALESCE(qa.recent_grade, 0)::numeric(7,2) AS recent_grade,
       COALESCE(att.attendance_rate, 0)::numeric(7,2) AS attendance_rate
     FROM parent_student_links psl
     JOIN users u ON u.id = psl.student_id
     JOIN schools s ON s.id = psl.school_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT c.name AS class_name
       FROM class_enrollments ce
       JOIN classes c ON c.id = ce.class_id
       WHERE ce.student_id = u.id
         AND c.school_id = $1
       ORDER BY ce.enrolled_at DESC
       LIMIT 1
     ) cls ON true
     LEFT JOIN LATERAL (
       SELECT
         AVG(((qa.score / NULLIF(qa.max_score, 0)) * 4.0)) AS gpa,
         (ARRAY_AGG(((qa.score / NULLIF(qa.max_score, 0)) * 100) ORDER BY qa.completed_at DESC NULLS LAST))[1] AS recent_grade
       FROM quiz_attempts qa
       WHERE qa.student_id = u.id
         AND qa.school_id = $1
         AND qa.score IS NOT NULL
         AND qa.max_score IS NOT NULL
         AND qa.max_score > 0
     ) qa ON true
     LEFT JOIN LATERAL (
       SELECT
         AVG(CASE WHEN ar.status = 'present' THEN 100 ELSE 0 END) AS attendance_rate
       FROM attendance_records ar
       WHERE ar.school_id = $1
         AND ar.student_id = u.id
         AND ar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
     ) att ON true
     WHERE psl.school_id = $1
       AND psl.parent_id = $2
     ORDER BY COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), u.email`,
    [schoolId, parentId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    name: fullName(
      row.first_name ? String(row.first_name) : null,
      row.last_name ? String(row.last_name) : null,
      row.email ? String(row.email) : null
    ),
    class: String(row.class_name || 'Unassigned'),
    school: String(row.school_name || 'School'),
    currentGPA: Number(toNumber(row.current_gpa).toFixed(2)),
    recentGrade: Number(toNumber(row.recent_grade).toFixed(1)),
    attendanceRate: Number(toNumber(row.attendance_rate).toFixed(2)),
  }));
}

export const GET = withRole(['parent'], async (request: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
  }

  await lmsPhase2Service.ensureSchema();

  const children = await getChildrenSummary(auth.schoolId, auth.userId);
  if (children.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        children: [],
        selectedChild: '',
        childGradeHistory: [],
        attendanceTrend: [],
        upcomingEvents: [],
        teacherMessages: [],
        schoolAnnouncements: [],
        averageChildGPA: 0,
        averageAttendance: 0,
        unreadMessages: 0,
      },
    });
  }

  const childIdParam = request.nextUrl.searchParams.get('childId');
  const selectedChildId =
    childIdParam && children.some((child) => child.id === childIdParam)
      ? childIdParam
      : children[0].id;

  const [gradeHistoryResult, attendanceTrendResult] = await Promise.all([
    query(
      `SELECT
         qa.completed_at,
         COALESCE(t.title, 'Assessment') AS subject,
         ((qa.score / NULLIF(qa.max_score, 0)) * 100)::numeric(7,2) AS grade
       FROM quiz_attempts qa
       LEFT JOIN topics t ON t.id = qa.topic_id
       WHERE qa.school_id = $1
         AND qa.student_id = $2
         AND qa.completed_at IS NOT NULL
         AND qa.score IS NOT NULL
         AND qa.max_score IS NOT NULL
         AND qa.max_score > 0
       ORDER BY qa.completed_at DESC
       LIMIT 20`,
      [auth.schoolId, selectedChildId]
    ),
    query(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', ar.attendance_date), 'YYYY-MM-DD') AS week_start,
         AVG(CASE WHEN ar.status = 'present' THEN 100 ELSE 0 END)::numeric(7,2) AS rate
       FROM attendance_records ar
       WHERE ar.school_id = $1
         AND ar.student_id = $2
         AND ar.attendance_date >= CURRENT_DATE - INTERVAL '8 weeks'
       GROUP BY week_start
       ORDER BY week_start ASC`,
      [auth.schoolId, selectedChildId]
    ),
  ]);

  const childGradeHistory = gradeHistoryResult.rows.map((row) => ({
    date: row.completed_at ? new Date(String(row.completed_at)).toISOString() : new Date().toISOString(),
    subject: String(row.subject || 'Assessment'),
    grade: Number(toNumber(row.grade).toFixed(2)),
  }));

  const attendanceTrend = attendanceTrendResult.rows.map((row) => ({
    week: row.week_start ? new Date(String(row.week_start)).toLocaleDateString() : 'Week',
    rate: Number(toNumber(row.rate).toFixed(2)),
  }));

  const [assignments, communicationData] = await Promise.all([
    lmsPhase2Service.listAssignments(auth),
    lmsPhase2Service.listCommunications(auth),
  ]);

  const upcomingEvents = assignments.slice(0, 12).map((assignment) => ({
    date: `${assignment.dueDate}T09:00:00.000Z`,
    title: assignment.title,
    type: assignment.className || 'Assignment',
  }));

  const teacherMessages = communicationData.recentMessages.slice(0, 20).map((message) => ({
    id: message.id,
    from: message.from,
    message: message.body,
    date: message.timestamp,
    read: message.read,
  }));

  const unreadMessages = communicationData.unreadMessages;

  const schoolAnnouncements = assignments.slice(0, 6).map((assignment, idx) => {
    const due = new Date(`${assignment.dueDate}T00:00:00`);
    const daysUntilDue = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let priority: 'high' | 'medium' | 'low' = 'low';
    if (daysUntilDue <= 2) priority = 'high';
    else if (daysUntilDue <= 5) priority = 'medium';

    return {
      id: `assignment-announcement-${idx}-${assignment.id}`,
      title: `Upcoming: ${assignment.title}`,
      content: `${assignment.className || 'Class'} assignment due on ${assignment.dueDate}.`,
      date: `${assignment.dueDate}T00:00:00.000Z`,
      priority,
    };
  });

  const averageChildGPA =
    children.length > 0
      ? Number((children.reduce((sum, child) => sum + child.currentGPA, 0) / children.length).toFixed(2))
      : 0;

  const averageAttendance =
    children.length > 0
      ? Number((children.reduce((sum, child) => sum + child.attendanceRate, 0) / children.length).toFixed(2))
      : 0;

  return NextResponse.json({
    success: true,
    data: {
      children,
      selectedChild: selectedChildId,
      childGradeHistory,
      attendanceTrend,
      upcomingEvents,
      teacherMessages,
      schoolAnnouncements,
      averageChildGPA,
      averageAttendance,
      unreadMessages,
    },
  });
});
