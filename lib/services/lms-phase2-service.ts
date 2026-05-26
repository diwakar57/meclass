import { query } from '@/lib/db';
import { appendAuditLog } from '@/lib/services/audit-service';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type MessageStatus = 'read' | 'unread';

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

interface AssignmentSummary {
  id: string;
  title: string;
  className?: string;
  dueDate: string;
  submissionsReceived: number;
  totalStudents: number;
  averageScore?: number;
  status?: string;
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
}

interface GradeEntry {
  studentId: string;
  studentName: string;
  assignment: string;
  score: number;
  maxScore: number;
  weight?: number;
  submittedAt?: string;
  status: 'graded' | 'pending' | 'not-submitted';
}

interface ClassGradebook {
  classId: string;
  className: string;
  students: StudentSummary[];
  grades: GradeEntry[];
  averageClassGrade: number;
  highestGrade: number;
  lowestGrade: number;
}

interface AttendanceStudentRow {
  studentId: string;
  name: string;
  rollNumber: string;
  status: AttendanceStatus;
  remarks?: string;
  timestamp?: string;
}

interface AttendanceSession {
  classId: string;
  className: string;
  date: string;
  time: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  students: AttendanceStudentRow[];
}

interface TeacherAttendanceData {
  sessions: AttendanceSession[];
  currentSession: AttendanceSession | null;
  attendanceStats: {
    totalSessions: number;
    averageAttendance: number;
    trend: Array<{ date: string; attendance: number }>;
  };
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  date: string;
  status: AttendanceStatus;
  classId: string;
  className: string;
  remarks?: string;
}

interface PrincipalAttendanceAnalytics {
  totalStudents: number;
  averageAttendanceRate: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  weeklyTrend: Array<{ day: string; rate: number }>;
  monthlyTrend: Array<{ month: string; rate: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  chronicallyAbsent: Array<{ studentName: string; absences: number }>;
  recentRecords: AttendanceRecord[];
  byClass: Array<{ className: string; rate: number }>;
}

interface CommunicationMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
}

interface ConversationThread {
  id: string;
  participant: string;
  subject: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: CommunicationMessage[];
}

interface CommunicationData {
  conversations: ConversationThread[];
  totalMessages: number;
  unreadMessages: number;
  recentMessages: CommunicationMessage[];
}

interface ScheduleEvent {
  id: string;
  title: string;
  instructor?: string;
  classroom?: string;
  startTime: string;
  endTime: string;
  day: string;
  type: 'class' | 'exam' | 'assignment' | 'event';
  description?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

interface ScheduleData {
  weekSchedule: ScheduleEvent[];
  upcomingEvents: ScheduleEvent[];
  todaySchedule: ScheduleEvent[];
  deadlines: Array<{ title: string; dueDate: string; subject: string }>;
}

interface AuthLike {
  userId: string;
  schoolId?: string;
  role: string;
  email: string;
}

interface CreateAssignmentInput {
  schoolId: string;
  actorUserId: string;
  actorRole: string;
  title: string;
  description?: string;
  dueDate: string;
  classId?: string;
  className?: string;
  maxScore?: number;
}

interface SubmitAttendanceInput {
  schoolId: string;
  teacherId: string;
  classId: string;
  date: string;
  attendance: Record<string, AttendanceStatus>;
  remarks?: Record<string, string>;
}

interface PrincipalMarkAttendanceInput {
  schoolId: string;
  markerId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  classId?: string;
  remarks?: string;
}

let schemaEnsured = false;

function normalizeDateInput(input?: string): string {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function formatPersonName(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  if (name.length > 0) {
    return name;
  }
  return email || 'Unknown User';
}

function toAttendanceStatus(value: string | null | undefined): AttendanceStatus {
  const normalized = String(value || '').toLowerCase();
  if (ATTENDANCE_STATUSES.includes(normalized as AttendanceStatus)) {
    return normalized as AttendanceStatus;
  }
  return 'present';
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toIsoString(value: unknown): string {
  if (!value) {
    return new Date().toISOString();
  }
  try {
    return new Date(String(value)).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function parseTimeLabel(hour24: number): { start: string; end: string } {
  const endHour = (hour24 + 1) % 24;

  const to12 = (hour: number) => {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(h).padStart(2, '0')}:00 ${suffix}`;
  };

  return {
    start: to12(hour24),
    end: to12(endHour),
  };
}

async function ensurePhase2Schema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
      class_label VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date DATE NOT NULL,
      max_score DECIMAL(7,2) NOT NULL DEFAULT 100,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments(school_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date)`);

  await query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL DEFAULT 'not-submitted',
      score DECIMAL(7,2),
      submitted_at TIMESTAMP,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(assignment_id, student_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school ON assignment_submissions(school_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
      attendance_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'present',
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(class_id, student_id, attendance_date)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_attendance_records_school ON attendance_records(school_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_attendance_records_class ON attendance_records(class_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date)`);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject VARCHAR(255),
      body TEXT NOT NULL,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_messages_school ON messages(school_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)`);

  schemaEnsured = true;
}

async function resolveClassContext(
  schoolId: string,
  teacherId: string,
  classId?: string,
  className?: string
): Promise<{ classId: string | null; className: string | null }> {
  if (classId) {
    const byId = await query(
      `SELECT id, name
       FROM classes
       WHERE id = $1 AND school_id = $2 AND teacher_id = $3`,
      [classId, schoolId, teacherId]
    );

    if (Number(byId.rowCount || 0) > 0) {
      return {
        classId: String(byId.rows[0].id),
        className: String(byId.rows[0].name || className || 'Class'),
      };
    }
  }

  if (className && className.trim().length > 0) {
    const byName = await query(
      `SELECT id, name
       FROM classes
       WHERE school_id = $1
         AND teacher_id = $2
         AND LOWER(name) = LOWER($3)
       LIMIT 1`,
      [schoolId, teacherId, className.trim()]
    );

    if (Number(byName.rowCount || 0) > 0) {
      return {
        classId: String(byName.rows[0].id),
        className: String(byName.rows[0].name || className.trim()),
      };
    }

    return {
      classId: null,
      className: className.trim(),
    };
  }

  return {
    classId: null,
    className: null,
  };
}

async function preloadAssignmentSubmissions(assignmentId: string, schoolId: string, classId?: string | null): Promise<void> {
  if (!classId) {
    return;
  }

  await query(
    `INSERT INTO assignment_submissions (assignment_id, school_id, student_id, status)
     SELECT $1, $2, ce.student_id, 'not-submitted'
     FROM class_enrollments ce
     JOIN classes c ON c.id = ce.class_id
     WHERE ce.class_id = $3
       AND c.school_id = $2
     ON CONFLICT (assignment_id, student_id) DO NOTHING`,
    [assignmentId, schoolId, classId]
  );
}

async function listTeacherAssignments(schoolId: string, teacherId: string): Promise<AssignmentSummary[]> {
  const result = await query(
    `SELECT
       a.id,
       a.title,
       a.due_date,
       a.status,
       COALESCE(c.name, a.class_label, 'Unassigned') AS class_name,
       COALESCE(stats.submissions_received, 0)::int AS submissions_received,
       COALESCE(stats.total_students, 0)::int AS total_students,
       COALESCE(stats.average_score, 0)::numeric AS average_score
     FROM assignments a
     LEFT JOIN classes c ON c.id = a.class_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE s.status IN ('submitted', 'graded') OR s.submitted_at IS NOT NULL)::int AS submissions_received,
         COUNT(*)::int AS total_students,
         AVG(s.score)::numeric(7,2) AS average_score
       FROM assignment_submissions s
       WHERE s.assignment_id = a.id
     ) stats ON true
     WHERE a.school_id = $1
       AND a.teacher_id = $2
     ORDER BY a.due_date ASC, a.created_at DESC`,
    [schoolId, teacherId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    className: String(row.class_name || 'Unassigned'),
    dueDate: normalizeDateInput(String(row.due_date || '')),
    submissionsReceived: toNumber(row.submissions_received),
    totalStudents: toNumber(row.total_students),
    averageScore: row.average_score == null ? undefined : toNumber(row.average_score),
    status: String(row.status || 'active'),
  }));
}

async function listPrincipalAssignments(schoolId: string): Promise<AssignmentSummary[]> {
  const result = await query(
    `SELECT
       a.id,
       a.title,
       a.due_date,
       a.status,
       COALESCE(c.name, a.class_label, 'Unassigned') AS class_name,
       COALESCE(stats.submissions_received, 0)::int AS submissions_received,
       COALESCE(stats.total_students, 0)::int AS total_students,
       COALESCE(stats.average_score, 0)::numeric AS average_score
     FROM assignments a
     LEFT JOIN classes c ON c.id = a.class_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE s.status IN ('submitted', 'graded') OR s.submitted_at IS NOT NULL)::int AS submissions_received,
         COUNT(*)::int AS total_students,
         AVG(s.score)::numeric(7,2) AS average_score
       FROM assignment_submissions s
       WHERE s.assignment_id = a.id
     ) stats ON true
     WHERE a.school_id = $1
     ORDER BY a.due_date ASC, a.created_at DESC`,
    [schoolId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    className: String(row.class_name || 'Unassigned'),
    dueDate: normalizeDateInput(String(row.due_date || '')),
    submissionsReceived: toNumber(row.submissions_received),
    totalStudents: toNumber(row.total_students),
    averageScore: row.average_score == null ? undefined : toNumber(row.average_score),
    status: String(row.status || 'active'),
  }));
}

async function listStudentAssignments(schoolId: string, studentId: string): Promise<AssignmentSummary[]> {
  const result = await query(
    `SELECT
       a.id,
       a.title,
       a.due_date,
       a.status,
       COALESCE(c.name, a.class_label, 'Unassigned') AS class_name,
       COALESCE(stats.submissions_received, 0)::int AS submissions_received,
       COALESCE(stats.total_students, 0)::int AS total_students,
       COALESCE(stats.average_score, 0)::numeric AS average_score
     FROM assignments a
     LEFT JOIN classes c ON c.id = a.class_id
     JOIN class_enrollments ce ON ce.class_id = a.class_id AND ce.student_id = $2
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE s.status IN ('submitted', 'graded') OR s.submitted_at IS NOT NULL)::int AS submissions_received,
         COUNT(*)::int AS total_students,
         AVG(s.score)::numeric(7,2) AS average_score
       FROM assignment_submissions s
       WHERE s.assignment_id = a.id
     ) stats ON true
     WHERE a.school_id = $1
     ORDER BY a.due_date ASC, a.created_at DESC`,
    [schoolId, studentId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    className: String(row.class_name || 'Unassigned'),
    dueDate: normalizeDateInput(String(row.due_date || '')),
    submissionsReceived: toNumber(row.submissions_received),
    totalStudents: toNumber(row.total_students),
    averageScore: row.average_score == null ? undefined : toNumber(row.average_score),
    status: String(row.status || 'active'),
  }));
}

async function listParentAssignments(schoolId: string, parentId: string): Promise<AssignmentSummary[]> {
  const result = await query(
    `SELECT DISTINCT
       a.id,
       a.title,
       a.due_date,
       a.status,
       COALESCE(c.name, a.class_label, 'Unassigned') AS class_name,
       COALESCE(stats.submissions_received, 0)::int AS submissions_received,
       COALESCE(stats.total_students, 0)::int AS total_students,
       COALESCE(stats.average_score, 0)::numeric AS average_score
     FROM parent_student_links psl
     JOIN class_enrollments ce ON ce.student_id = psl.student_id
     JOIN assignments a ON a.class_id = ce.class_id
     LEFT JOIN classes c ON c.id = a.class_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE s.status IN ('submitted', 'graded') OR s.submitted_at IS NOT NULL)::int AS submissions_received,
         COUNT(*)::int AS total_students,
         AVG(s.score)::numeric(7,2) AS average_score
       FROM assignment_submissions s
       WHERE s.assignment_id = a.id
     ) stats ON true
     WHERE psl.school_id = $1
       AND psl.parent_id = $2
       AND a.school_id = $1
     ORDER BY a.due_date ASC, a.created_at DESC`,
    [schoolId, parentId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    className: String(row.class_name || 'Unassigned'),
    dueDate: normalizeDateInput(String(row.due_date || '')),
    submissionsReceived: toNumber(row.submissions_received),
    totalStudents: toNumber(row.total_students),
    averageScore: row.average_score == null ? undefined : toNumber(row.average_score),
    status: String(row.status || 'active'),
  }));
}

async function getTeacherClasses(
  schoolId: string,
  teacherId?: string,
  classId?: string
): Promise<Array<{ id: string; name: string }>> {
  const params: unknown[] = [schoolId];
  let sql = `SELECT id, name FROM classes WHERE school_id = $1`;

  if (teacherId) {
    params.push(teacherId);
    sql += ` AND teacher_id = $${params.length}`;
  }

  if (classId) {
    params.push(classId);
    sql += ` AND id = $${params.length}`;
  }

  sql += ' ORDER BY name ASC';

  const result = await query(sql, params);
  return result.rows.map((row) => ({ id: String(row.id), name: String(row.name) }));
}

async function getClassStudents(classId: string): Promise<StudentSummary[]> {
  const result = await query(
    `SELECT
       u.id,
       u.email,
       u.first_name,
       u.last_name
     FROM class_enrollments ce
     JOIN users u ON u.id = ce.student_id
     WHERE ce.class_id = $1
     ORDER BY COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), u.email`,
    [classId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    name: formatPersonName(
      row.first_name ? String(row.first_name) : null,
      row.last_name ? String(row.last_name) : null,
      row.email ? String(row.email) : null
    ),
    email: String(row.email || ''),
  }));
}

async function getClassGrades(schoolId: string, teacherId: string, classId: string): Promise<GradeEntry[]> {
  const result = await query(
    `SELECT
       s.student_id,
       u.first_name,
       u.last_name,
       u.email,
       a.title AS assignment_title,
       a.max_score,
       s.score,
       s.submitted_at,
       s.status
     FROM assignments a
     JOIN assignment_submissions s ON s.assignment_id = a.id
     LEFT JOIN users u ON u.id = s.student_id
     WHERE a.school_id = $1
       AND a.teacher_id = $2
       AND a.class_id = $3
     ORDER BY a.due_date ASC, a.created_at DESC`,
    [schoolId, teacherId, classId]
  );

  return result.rows.map((row) => {
    const statusRaw = String(row.status || 'not-submitted').toLowerCase();
    const status: GradeEntry['status'] =
      statusRaw === 'graded' ? 'graded' : statusRaw === 'pending' || statusRaw === 'submitted' ? 'pending' : 'not-submitted';

    return {
      studentId: String(row.student_id || ''),
      studentName: formatPersonName(
        row.first_name ? String(row.first_name) : null,
        row.last_name ? String(row.last_name) : null,
        row.email ? String(row.email) : null
      ),
      assignment: String(row.assignment_title || 'Assignment'),
      score: toNumber(row.score, 0),
      maxScore: toNumber(row.max_score, 100),
      submittedAt: row.submitted_at ? toIsoString(row.submitted_at) : undefined,
      status,
    };
  });
}

async function computeTeacherAttendanceTrend(schoolId: string, teacherId: string): Promise<Array<{ date: string; attendance: number }>> {
  const trendRows = await query(
    `SELECT
       ar.attendance_date::date AS attendance_date,
       AVG(CASE WHEN ar.status = 'present' THEN 100 ELSE 0 END)::numeric(7,2) AS attendance_rate
     FROM attendance_records ar
     JOIN classes c ON c.id = ar.class_id
     WHERE ar.school_id = $1
       AND c.teacher_id = $2
       AND ar.attendance_date >= CURRENT_DATE - INTERVAL '6 days'
     GROUP BY ar.attendance_date
     ORDER BY ar.attendance_date ASC`,
    [schoolId, teacherId]
  );

  const byDate = new Map<string, number>();
  for (const row of trendRows.rows) {
    byDate.set(normalizeDateInput(String(row.attendance_date)), toNumber(row.attendance_rate));
  }

  const out: Array<{ date: string; attendance: number }> = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      date: key,
      attendance: byDate.get(key) ?? 0,
    });
  }

  return out;
}

async function countTeacherSessions(schoolId: string, teacherId: string): Promise<number> {
  const sessions = await query(
    `SELECT COUNT(DISTINCT (ar.class_id, ar.attendance_date))::int AS count
     FROM attendance_records ar
     JOIN classes c ON c.id = ar.class_id
     WHERE ar.school_id = $1
       AND c.teacher_id = $2`,
    [schoolId, teacherId]
  );

  return toNumber(sessions.rows[0]?.count, 0);
}

async function resolveMessageRecipient(schoolId: string, recipient: string): Promise<{ id: string; name: string; email: string } | null> {
  const candidate = recipient.trim();
  if (!candidate) {
    return null;
  }

  const exact = await query(
    `SELECT id, first_name, last_name, email
     FROM users
     WHERE school_id = $1
       AND is_active = true
       AND (
         CAST(id AS TEXT) = $2
         OR LOWER(email) = LOWER($2)
         OR LOWER(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) = LOWER($2)
       )
     LIMIT 1`,
    [schoolId, candidate]
  );

  if (Number(exact.rowCount || 0) > 0) {
    const row = exact.rows[0];
    return {
      id: String(row.id),
      name: formatPersonName(
        row.first_name ? String(row.first_name) : null,
        row.last_name ? String(row.last_name) : null,
        row.email ? String(row.email) : null
      ),
      email: String(row.email || ''),
    };
  }

  const fuzzy = await query(
    `SELECT id, first_name, last_name, email
     FROM users
     WHERE school_id = $1
       AND is_active = true
       AND (
         LOWER(email) LIKE LOWER($2)
         OR LOWER(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE LOWER($2)
       )
     ORDER BY created_at DESC
     LIMIT 1`,
    [schoolId, `%${candidate}%`]
  );

  if (Number(fuzzy.rowCount || 0) === 0) {
    return null;
  }

  const row = fuzzy.rows[0];
  return {
    id: String(row.id),
    name: formatPersonName(
      row.first_name ? String(row.first_name) : null,
      row.last_name ? String(row.last_name) : null,
      row.email ? String(row.email) : null
    ),
    email: String(row.email || ''),
  };
}

function sortConversationsByLastMessage(conversations: ConversationThread[]): ConversationThread[] {
  return conversations.sort((a, b) => {
    const at = new Date(a.lastMessageTime).getTime();
    const bt = new Date(b.lastMessageTime).getTime();
    return bt - at;
  });
}

export class LmsPhase2Service {
  async ensureSchema(): Promise<void> {
    await ensurePhase2Schema();
  }

  async createAssignment(input: CreateAssignmentInput): Promise<AssignmentSummary> {
    await ensurePhase2Schema();

    const dueDate = normalizeDateInput(input.dueDate);
    const maxScore = toNumber(input.maxScore, 100);

    const classContext = await resolveClassContext(
      input.schoolId,
      input.actorUserId,
      input.classId,
      input.className
    );

    const insert = await query(
      `INSERT INTO assignments
       (school_id, teacher_id, class_id, class_label, title, description, due_date, max_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, 'active')
       RETURNING id, title, due_date, status, class_label`,
      [
        input.schoolId,
        input.actorUserId,
        classContext.classId,
        classContext.className,
        input.title.trim(),
        input.description?.trim() || null,
        dueDate,
        maxScore,
      ]
    );

    const row = insert.rows[0];
    if (!row?.id) {
      throw new Error('Failed to create assignment');
    }

    const assignmentId = String(row.id);
    await preloadAssignmentSubmissions(assignmentId, input.schoolId, classContext.classId);

    await appendAuditLog({
      schoolId: input.schoolId,
      userId: input.actorUserId,
      action: 'assignment.create',
      resourceType: 'assignment',
      resourceId: assignmentId,
      changes: {
        title: input.title,
        classId: classContext.classId,
        dueDate,
        actorRole: input.actorRole,
      },
    });

    return {
      id: assignmentId,
      title: String(row.title),
      className: classContext.className || undefined,
      dueDate: normalizeDateInput(String(row.due_date)),
      submissionsReceived: 0,
      totalStudents: classContext.classId ? await this.countClassStudents(classContext.classId) : 0,
      averageScore: undefined,
      status: String(row.status || 'active'),
    };
  }

  async listAssignments(auth: AuthLike): Promise<AssignmentSummary[]> {
    await ensurePhase2Schema();

    if (!auth.schoolId) {
      return [];
    }

    switch (auth.role) {
      case 'teacher':
        return listTeacherAssignments(auth.schoolId, auth.userId);
      case 'principal':
      case 'school_admin':
      case 'accountant':
      case 'supervisor':
        return listPrincipalAssignments(auth.schoolId);
      case 'student':
        return listStudentAssignments(auth.schoolId, auth.userId);
      case 'parent':
        return listParentAssignments(auth.schoolId, auth.userId);
      default:
        return [];
    }
  }

  async getGradebookForTeacher(
    schoolId: string,
    teacherId?: string,
    classId?: string
  ): Promise<ClassGradebook[]> {
    await ensurePhase2Schema();

    const classes = await getTeacherClasses(schoolId, teacherId, classId);
    const result: ClassGradebook[] = [];

    for (const classInfo of classes) {
      const students = await getClassStudents(classInfo.id);
      const grades = await getClassGrades(schoolId, teacherId, classInfo.id);

      const gradePercentages = grades
        .filter((grade) => grade.maxScore > 0)
        .map((grade) => (grade.score / grade.maxScore) * 100);

      const averageClassGrade = gradePercentages.length
        ? Math.round(gradePercentages.reduce((sum, value) => sum + value, 0) / gradePercentages.length)
        : 0;

      const highestGrade = gradePercentages.length ? Math.round(Math.max(...gradePercentages)) : 0;
      const lowestGrade = gradePercentages.length ? Math.round(Math.min(...gradePercentages)) : 0;

      result.push({
        classId: classInfo.id,
        className: classInfo.name,
        students,
        grades,
        averageClassGrade,
        highestGrade,
        lowestGrade,
      });
    }

    return result;
  }

  async upsertGrade(input: {
    schoolId: string;
    teacherId: string;
    studentId: string;
    assignmentTitle: string;
    score: number;
    classId?: string;
  }): Promise<{ assignmentId: string; studentId: string; score: number; status: string }> {
    await ensurePhase2Schema();

    const score = toNumber(input.score);
    if (!Number.isFinite(score)) {
      throw new Error('Invalid score');
    }

    const params: unknown[] = [input.schoolId, input.teacherId, input.assignmentTitle.trim()];
    let assignmentSql = `SELECT id, class_id, max_score
                         FROM assignments
                         WHERE school_id = $1
                           AND teacher_id = $2
                           AND LOWER(title) = LOWER($3)`;

    if (input.classId) {
      assignmentSql += ' AND class_id = $4';
      params.push(input.classId);
    }

    assignmentSql += ' ORDER BY due_date DESC, created_at DESC LIMIT 1';

    const assignmentResult = await query(assignmentSql, params);
    if (Number(assignmentResult.rowCount || 0) === 0) {
      throw new Error('Assignment not found for grading');
    }

    const assignment = assignmentResult.rows[0];
    const assignmentId = String(assignment.id);
    const assignmentClassId = assignment.class_id ? String(assignment.class_id) : null;

    if (assignmentClassId) {
      const enrollment = await query(
        `SELECT 1
         FROM class_enrollments ce
         JOIN classes c ON c.id = ce.class_id
         WHERE ce.class_id = $1
           AND ce.student_id = $2
           AND c.school_id = $3
         LIMIT 1`,
        [assignmentClassId, input.studentId, input.schoolId]
      );

      if (Number(enrollment.rowCount || 0) === 0) {
        throw new Error('Student is not enrolled in the assignment class');
      }
    }

    await query(
      `INSERT INTO assignment_submissions
       (assignment_id, school_id, student_id, status, score, submitted_at, updated_at)
       VALUES ($1, $2, $3, 'graded', $4, COALESCE((SELECT submitted_at FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $3), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET
         score = EXCLUDED.score,
         status = 'graded',
         submitted_at = COALESCE(assignment_submissions.submitted_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP`,
      [assignmentId, input.schoolId, input.studentId, score]
    );

    await appendAuditLog({
      schoolId: input.schoolId,
      userId: input.teacherId,
      action: 'grade.upsert',
      resourceType: 'assignment_submission',
      resourceId: assignmentId,
      changes: {
        studentId: input.studentId,
        score,
        assignmentTitle: input.assignmentTitle,
      },
    });

    return {
      assignmentId,
      studentId: input.studentId,
      score,
      status: 'graded',
    };
  }

  async getTeacherAttendance(schoolId: string, teacherId: string, dateInput?: string): Promise<TeacherAttendanceData> {
    await ensurePhase2Schema();

    const date = normalizeDateInput(dateInput);

    const classes = await query(
      `SELECT id, name
       FROM classes
       WHERE school_id = $1
         AND teacher_id = $2
       ORDER BY name ASC`,
      [schoolId, teacherId]
    );

    const sessions: AttendanceSession[] = [];

    for (const classRow of classes.rows) {
      const classId = String(classRow.id);

      const studentsResult = await query(
        `SELECT
           u.id AS student_id,
           u.first_name,
           u.last_name,
           u.email,
           ar.status,
           ar.remarks,
           ar.updated_at
         FROM class_enrollments ce
         JOIN users u ON u.id = ce.student_id
         LEFT JOIN attendance_records ar
           ON ar.class_id = ce.class_id
          AND ar.student_id = ce.student_id
          AND ar.attendance_date = $2::date
         WHERE ce.class_id = $1
         ORDER BY COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), u.email`,
        [classId, date]
      );

      const students: AttendanceStudentRow[] = studentsResult.rows.map((row, idx) => ({
        studentId: String(row.student_id),
        name: formatPersonName(
          row.first_name ? String(row.first_name) : null,
          row.last_name ? String(row.last_name) : null,
          row.email ? String(row.email) : null
        ),
        rollNumber: String(idx + 1).padStart(2, '0'),
        status: toAttendanceStatus(row.status ? String(row.status) : undefined),
        remarks: row.remarks ? String(row.remarks) : undefined,
        timestamp: row.updated_at ? toIsoString(row.updated_at) : undefined,
      }));

      const counts = {
        present: students.filter((student) => student.status === 'present').length,
        absent: students.filter((student) => student.status === 'absent').length,
        late: students.filter((student) => student.status === 'late').length,
        excused: students.filter((student) => student.status === 'excused').length,
      };

      sessions.push({
        classId,
        className: String(classRow.name),
        date,
        time: '09:00 AM',
        totalStudents: students.length,
        presentCount: counts.present,
        absentCount: counts.absent,
        lateCount: counts.late,
        excusedCount: counts.excused,
        students,
      });
    }

    const trend = await computeTeacherAttendanceTrend(schoolId, teacherId);
    const totalSessions = await countTeacherSessions(schoolId, teacherId);

    const averageAttendance = trend.length
      ? trend.reduce((sum, item) => sum + item.attendance, 0) / trend.length
      : 0;

    return {
      sessions,
      currentSession: sessions[0] || null,
      attendanceStats: {
        totalSessions,
        averageAttendance: Number(averageAttendance.toFixed(2)),
        trend,
      },
    };
  }

  async submitTeacherAttendance(input: SubmitAttendanceInput): Promise<{ submittedAt: string; recordCount: number }> {
    await ensurePhase2Schema();

    const date = normalizeDateInput(input.date);

    const classOwnership = await query(
      `SELECT id
       FROM classes
       WHERE id = $1
         AND school_id = $2
         AND teacher_id = $3
       LIMIT 1`,
      [input.classId, input.schoolId, input.teacherId]
    );

    if (Number(classOwnership.rowCount || 0) === 0) {
      throw new Error('Class not found for teacher');
    }

    const studentIds = Object.keys(input.attendance || {});
    for (const studentId of studentIds) {
      const status = toAttendanceStatus(input.attendance[studentId]);
      const remark = input.remarks?.[studentId]?.trim() || null;

      await query(
        `INSERT INTO attendance_records
         (school_id, class_id, student_id, marked_by, attendance_date, status, remarks, updated_at)
         VALUES ($1, $2, $3, $4, $5::date, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT (class_id, student_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           remarks = EXCLUDED.remarks,
           marked_by = EXCLUDED.marked_by,
           updated_at = CURRENT_TIMESTAMP`,
        [input.schoolId, input.classId, studentId, input.teacherId, date, status, remark]
      );
    }

    await appendAuditLog({
      schoolId: input.schoolId,
      userId: input.teacherId,
      action: 'attendance.submit',
      resourceType: 'attendance_records',
      resourceId: input.classId,
      changes: {
        classId: input.classId,
        date,
        recordCount: studentIds.length,
      },
    });

    return {
      submittedAt: new Date().toISOString(),
      recordCount: studentIds.length,
    };
  }

  async getPrincipalAttendanceAnalytics(
    schoolId: string,
    dateInput?: string,
    classIdFilter?: string
  ): Promise<PrincipalAttendanceAnalytics> {
    await ensurePhase2Schema();

    const date = normalizeDateInput(dateInput);

    const totalStudentsResult = await query(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE school_id = $1
         AND role = 'student'
         AND is_active = true`,
      [schoolId]
    );

    const totalStudents = toNumber(totalStudentsResult.rows[0]?.count, 0);

    const attendanceScopeWhere = classIdFilter
      ? 'AND ar.class_id = $3'
      : '';

    const attendanceScopeParams: unknown[] = classIdFilter
      ? [schoolId, date, classIdFilter]
      : [schoolId, date];

    const statusRows = await query(
      `SELECT ar.status, COUNT(*)::int AS count
       FROM attendance_records ar
       WHERE ar.school_id = $1
         AND ar.attendance_date = $2::date
         ${attendanceScopeWhere}
       GROUP BY ar.status`,
      attendanceScopeParams
    );

    const statusMap = new Map<string, number>();
    for (const row of statusRows.rows) {
      statusMap.set(String(row.status), toNumber(row.count));
    }

    const presentToday = statusMap.get('present') || 0;
    const absentToday = statusMap.get('absent') || 0;
    const lateToday = statusMap.get('late') || 0;

    const weeklyRows = await query(
      `SELECT
         ar.attendance_date::date AS attendance_date,
         AVG(CASE WHEN ar.status = 'present' THEN 100 ELSE 0 END)::numeric(7,2) AS rate
       FROM attendance_records ar
       WHERE ar.school_id = $1
         AND ar.attendance_date >= CURRENT_DATE - INTERVAL '6 days'
         ${classIdFilter ? 'AND ar.class_id = $2' : ''}
       GROUP BY ar.attendance_date
       ORDER BY ar.attendance_date ASC`,
      classIdFilter ? [schoolId, classIdFilter] : [schoolId]
    );

    const weeklyMap = new Map<string, number>();
    for (const row of weeklyRows.rows) {
      weeklyMap.set(normalizeDateInput(String(row.attendance_date)), toNumber(row.rate));
    }

    const weeklyTrend: Array<{ day: string; rate: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weeklyTrend.push({
        day: d.toLocaleString('en-US', { weekday: 'short' }),
        rate: Number((weeklyMap.get(key) ?? 0).toFixed(2)),
      });
    }

    const monthlyRows = await query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', ar.attendance_date), 'YYYY-MM') AS month_key,
         AVG(CASE WHEN ar.status = 'present' THEN 100 ELSE 0 END)::numeric(7,2) AS rate
       FROM attendance_records ar
       WHERE ar.school_id = $1
         AND ar.attendance_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
         ${classIdFilter ? 'AND ar.class_id = $2' : ''}
       GROUP BY month_key
       ORDER BY month_key ASC`,
      classIdFilter ? [schoolId, classIdFilter] : [schoolId]
    );

    const monthlyTrend = monthlyRows.rows.map((row) => {
      const [year, month] = String(row.month_key).split('-').map((part) => Number(part));
      const dateObj = new Date(year, month - 1, 1);
      return {
        month: dateObj.toLocaleString('en-US', { month: 'short' }),
        rate: Number(toNumber(row.rate).toFixed(2)),
      };
    });

    const byClassRows = await query(
      `SELECT
         c.name AS class_name,
         AVG(CASE WHEN ar.status = 'present' THEN 100 ELSE 0 END)::numeric(7,2) AS rate
       FROM attendance_records ar
       JOIN classes c ON c.id = ar.class_id
       WHERE ar.school_id = $1
         AND ar.attendance_date = $2::date
         ${classIdFilter ? 'AND ar.class_id = $3' : ''}
       GROUP BY c.id, c.name
       ORDER BY c.name ASC`,
      attendanceScopeParams
    );

    const byClass = byClassRows.rows.map((row) => ({
      className: String(row.class_name || 'Class'),
      rate: Number(toNumber(row.rate).toFixed(2)),
    }));

    const chronicallyAbsentRows = await query(
      `SELECT
         u.first_name,
         u.last_name,
         u.email,
         COUNT(*)::int AS absences
       FROM attendance_records ar
       JOIN users u ON u.id = ar.student_id
       WHERE ar.school_id = $1
         AND ar.status = 'absent'
         AND ar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
         ${classIdFilter ? 'AND ar.class_id = $2' : ''}
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY absences DESC
       LIMIT 10`,
      classIdFilter ? [schoolId, classIdFilter] : [schoolId]
    );

    const chronicallyAbsent = chronicallyAbsentRows.rows.map((row) => ({
      studentName: formatPersonName(
        row.first_name ? String(row.first_name) : null,
        row.last_name ? String(row.last_name) : null,
        row.email ? String(row.email) : null
      ),
      absences: toNumber(row.absences),
    }));

    const recentRows = await query(
      `SELECT
         ar.student_id,
         ar.class_id,
         ar.attendance_date,
         ar.status,
         ar.remarks,
         u.first_name,
         u.last_name,
         u.email,
         c.name AS class_name
       FROM attendance_records ar
       JOIN users u ON u.id = ar.student_id
       JOIN classes c ON c.id = ar.class_id
       WHERE ar.school_id = $1
         ${classIdFilter ? 'AND ar.class_id = $2' : ''}
       ORDER BY ar.attendance_date DESC, ar.updated_at DESC
       LIMIT 100`,
      classIdFilter ? [schoolId, classIdFilter] : [schoolId]
    );

    const recentRecords: AttendanceRecord[] = recentRows.rows.map((row) => ({
      studentId: String(row.student_id),
      studentName: formatPersonName(
        row.first_name ? String(row.first_name) : null,
        row.last_name ? String(row.last_name) : null,
        row.email ? String(row.email) : null
      ),
      date: normalizeDateInput(String(row.attendance_date)),
      status: toAttendanceStatus(String(row.status || 'present')),
      classId: String(row.class_id),
      className: String(row.class_name || 'Class'),
      remarks: row.remarks ? String(row.remarks) : undefined,
    }));

    const statusDistribution = ATTENDANCE_STATUSES.map((status) => ({
      status,
      count: statusMap.get(status) || 0,
    }));

    const averageAttendanceRate = weeklyTrend.length
      ? weeklyTrend.reduce((sum, point) => sum + point.rate, 0) / weeklyTrend.length
      : 0;

    return {
      totalStudents,
      averageAttendanceRate: Number(averageAttendanceRate.toFixed(2)),
      presentToday,
      absentToday,
      lateToday,
      weeklyTrend,
      monthlyTrend,
      statusDistribution,
      chronicallyAbsent,
      recentRecords,
      byClass,
    };
  }

  async markPrincipalAttendance(input: PrincipalMarkAttendanceInput): Promise<{ submittedAt: string }> {
    await ensurePhase2Schema();

    const date = normalizeDateInput(input.date);

    const studentRow = await query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND school_id = $2
         AND role = 'student'
       LIMIT 1`,
      [input.studentId, input.schoolId]
    );

    if (Number(studentRow.rowCount || 0) === 0) {
      throw new Error('Student not found in school scope');
    }

    let classId = input.classId;
    if (!classId) {
      const classLookup = await query(
        `SELECT ce.class_id
         FROM class_enrollments ce
         JOIN classes c ON c.id = ce.class_id
         WHERE ce.student_id = $1
           AND c.school_id = $2
         ORDER BY ce.enrolled_at DESC
         LIMIT 1`,
        [input.studentId, input.schoolId]
      );

      if (Number(classLookup.rowCount || 0) > 0) {
        classId = String(classLookup.rows[0].class_id);
      }
    }

    if (!classId) {
      throw new Error('No class found for student attendance entry');
    }

    await query(
      `INSERT INTO attendance_records
       (school_id, class_id, student_id, marked_by, attendance_date, status, remarks, updated_at)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (class_id, student_id, attendance_date)
       DO UPDATE SET
         status = EXCLUDED.status,
         remarks = EXCLUDED.remarks,
         marked_by = EXCLUDED.marked_by,
         updated_at = CURRENT_TIMESTAMP`,
      [
        input.schoolId,
        classId,
        input.studentId,
        input.markerId,
        date,
        toAttendanceStatus(input.status),
        input.remarks || null,
      ]
    );

    await appendAuditLog({
      schoolId: input.schoolId,
      userId: input.markerId,
      action: 'attendance.mark',
      resourceType: 'attendance_records',
      resourceId: classId,
      changes: {
        studentId: input.studentId,
        date,
        status: input.status,
      },
    });

    return {
      submittedAt: new Date().toISOString(),
    };
  }

  async listCommunications(auth: AuthLike): Promise<CommunicationData> {
    await ensurePhase2Schema();

    if (!auth.schoolId) {
      return {
        conversations: [],
        totalMessages: 0,
        unreadMessages: 0,
        recentMessages: [],
      };
    }

    const messagesResult = await query(
      `SELECT
         m.id,
         m.sender_id,
         m.recipient_id,
         m.subject,
         m.body,
         m.created_at,
         m.read_at,
         su.first_name AS sender_first_name,
         su.last_name AS sender_last_name,
         su.email AS sender_email,
         ru.first_name AS recipient_first_name,
         ru.last_name AS recipient_last_name,
         ru.email AS recipient_email
       FROM messages m
       JOIN users su ON su.id = m.sender_id
       JOIN users ru ON ru.id = m.recipient_id
       WHERE m.school_id = $1
         AND (m.sender_id = $2 OR m.recipient_id = $2)
       ORDER BY m.created_at DESC
       LIMIT 500`,
      [auth.schoolId, auth.userId]
    );

    const conversationsMap = new Map<string, ConversationThread>();
    let unreadMessages = 0;

    const recentMessages: CommunicationMessage[] = [];

    for (const row of messagesResult.rows) {
      const senderId = String(row.sender_id);
      const recipientId = String(row.recipient_id);
      const isOutgoing = senderId === auth.userId;
      const counterpartId = isOutgoing ? recipientId : senderId;

      const counterpartName = isOutgoing
        ? formatPersonName(
            row.recipient_first_name ? String(row.recipient_first_name) : null,
            row.recipient_last_name ? String(row.recipient_last_name) : null,
            row.recipient_email ? String(row.recipient_email) : null
          )
        : formatPersonName(
            row.sender_first_name ? String(row.sender_first_name) : null,
            row.sender_last_name ? String(row.sender_last_name) : null,
            row.sender_email ? String(row.sender_email) : null
          );

      const thisUserName = formatPersonName(null, null, auth.email);
      const message: CommunicationMessage = {
        id: String(row.id),
        from: isOutgoing ? 'You' : counterpartName,
        to: isOutgoing ? counterpartName : thisUserName,
        subject: String(row.subject || 'General Message'),
        body: String(row.body || ''),
        timestamp: toIsoString(row.created_at),
        read: Boolean(row.read_at),
      };

      if (!isOutgoing && !row.read_at) {
        unreadMessages += 1;
      }

      recentMessages.push(message);

      if (!conversationsMap.has(counterpartId)) {
        conversationsMap.set(counterpartId, {
          id: counterpartId,
          participant: counterpartName,
          subject: message.subject,
          lastMessage: message.body,
          lastMessageTime: message.timestamp,
          unreadCount: !isOutgoing && !message.read ? 1 : 0,
          messages: [message],
        });
      } else {
        const existing = conversationsMap.get(counterpartId)!;
        existing.messages.push(message);

        if (!isOutgoing && !message.read) {
          existing.unreadCount += 1;
        }

        const currentLast = new Date(existing.lastMessageTime).getTime();
        const candidate = new Date(message.timestamp).getTime();
        if (candidate >= currentLast) {
          existing.lastMessage = message.body;
          existing.lastMessageTime = message.timestamp;
          existing.subject = message.subject;
        }
      }
    }

    const conversations = sortConversationsByLastMessage(
      Array.from(conversationsMap.values()).map((conversation) => ({
        ...conversation,
        messages: conversation.messages.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      }))
    );

    return {
      conversations,
      totalMessages: messagesResult.rows.length,
      unreadMessages,
      recentMessages: recentMessages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50),
    };
  }

  async sendMessage(input: {
    schoolId: string;
    senderId: string;
    recipient: string;
    subject?: string;
    body: string;
  }): Promise<{ messageId: string; recipientId: string; recipientName: string; status: MessageStatus }> {
    await ensurePhase2Schema();

    const recipientResolved = await resolveMessageRecipient(input.schoolId, input.recipient);
    if (!recipientResolved) {
      throw new Error('Recipient not found in school scope');
    }

    const insert = await query(
      `INSERT INTO messages
       (school_id, sender_id, recipient_id, subject, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [input.schoolId, input.senderId, recipientResolved.id, input.subject || 'General Message', input.body]
    );

    const messageId = insert.rows[0]?.id ? String(insert.rows[0].id) : `message-${Date.now()}`;

    await appendAuditLog({
      schoolId: input.schoolId,
      userId: input.senderId,
      action: 'message.send',
      resourceType: 'message',
      resourceId: messageId,
      changes: {
        recipientId: recipientResolved.id,
        subject: input.subject || 'General Message',
      },
    });

    return {
      messageId,
      recipientId: recipientResolved.id,
      recipientName: recipientResolved.name,
      status: 'unread',
    };
  }

  async markMessageRead(input: { schoolId: string; userId: string; messageId: string }): Promise<boolean> {
    await ensurePhase2Schema();

    const update = await query(
      `UPDATE messages
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND school_id = $2
         AND recipient_id = $3`,
      [input.messageId, input.schoolId, input.userId]
    );

    return Number(update.rowCount || 0) > 0;
  }

  async getSchedule(auth: AuthLike, dateInput?: string): Promise<ScheduleData> {
    await ensurePhase2Schema();

    const date = normalizeDateInput(dateInput);
    const targetDate = new Date(`${date}T00:00:00`);
    const dayName = targetDate.toLocaleString('en-US', { weekday: 'long' });

    if (!auth.schoolId) {
      return {
        weekSchedule: [],
        upcomingEvents: [],
        todaySchedule: [],
        deadlines: [],
      };
    }

    const classes = await this.getScopedClassesForSchedule(auth);
    const weekSchedule: ScheduleEvent[] = classes.map((classRow, idx) => {
      const weekdayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const day = weekdayOptions[idx % weekdayOptions.length];
      const startHour = 8 + (idx % 6);
      const timeLabel = parseTimeLabel(startHour);

      return {
        id: `class-${classRow.id}`,
        title: classRow.name,
        instructor: classRow.teacherName,
        classroom: classRow.name,
        startTime: timeLabel.start,
        endTime: timeLabel.end,
        day,
        type: 'class',
        status: day === dayName ? 'ongoing' : 'upcoming',
      };
    });

    const todaySchedule = weekSchedule.filter((event) => event.day === dayName);

    const assignments = await this.getScopedAssignmentsForSchedule(auth, date);

    const upcomingEvents: ScheduleEvent[] = assignments.map((assignment) => {
      const startDate = `${assignment.dueDate}T09:00:00.000Z`;
      const endDate = `${assignment.dueDate}T10:00:00.000Z`;
      return {
        id: `assignment-${assignment.id}`,
        title: assignment.title,
        startTime: startDate,
        endTime: endDate,
        day: new Date(startDate).toLocaleString('en-US', { weekday: 'long' }),
        type: 'assignment',
        classroom: assignment.className || 'General',
        status: 'upcoming',
      };
    });

    const deadlines = assignments.slice(0, 20).map((assignment) => ({
      title: assignment.title,
      dueDate: assignment.dueDate,
      subject: assignment.className || 'General',
    }));

    return {
      weekSchedule,
      upcomingEvents,
      todaySchedule,
      deadlines,
    };
  }

  private async getScopedClassesForSchedule(auth: AuthLike): Promise<Array<{ id: string; name: string; teacherName?: string }>> {
    if (!auth.schoolId) {
      return [];
    }

    if (auth.role === 'teacher') {
      const rows = await query(
        `SELECT
           c.id,
           c.name,
           u.first_name,
           u.last_name,
           u.email
         FROM classes c
         LEFT JOIN users u ON u.id = c.teacher_id
         WHERE c.school_id = $1
           AND c.teacher_id = $2
         ORDER BY c.created_at DESC`,
        [auth.schoolId, auth.userId]
      );

      return rows.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        teacherName: formatPersonName(
          row.first_name ? String(row.first_name) : null,
          row.last_name ? String(row.last_name) : null,
          row.email ? String(row.email) : null
        ),
      }));
    }

    if (auth.role === 'student') {
      const rows = await query(
        `SELECT
           c.id,
           c.name,
           u.first_name,
           u.last_name,
           u.email
         FROM class_enrollments ce
         JOIN classes c ON c.id = ce.class_id
         LEFT JOIN users u ON u.id = c.teacher_id
         WHERE ce.student_id = $1
           AND c.school_id = $2
         ORDER BY c.created_at DESC`,
        [auth.userId, auth.schoolId]
      );

      return rows.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        teacherName: formatPersonName(
          row.first_name ? String(row.first_name) : null,
          row.last_name ? String(row.last_name) : null,
          row.email ? String(row.email) : null
        ),
      }));
    }

    if (auth.role === 'parent') {
      const rows = await query(
        `SELECT DISTINCT
           c.id,
           c.name,
           u.first_name,
           u.last_name,
           u.email
         FROM parent_student_links psl
         JOIN class_enrollments ce ON ce.student_id = psl.student_id
         JOIN classes c ON c.id = ce.class_id
         LEFT JOIN users u ON u.id = c.teacher_id
         WHERE psl.parent_id = $1
           AND psl.school_id = $2
         ORDER BY c.created_at DESC`,
        [auth.userId, auth.schoolId]
      );

      return rows.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        teacherName: formatPersonName(
          row.first_name ? String(row.first_name) : null,
          row.last_name ? String(row.last_name) : null,
          row.email ? String(row.email) : null
        ),
      }));
    }

    const rows = await query(
      `SELECT
         c.id,
         c.name,
         u.first_name,
         u.last_name,
         u.email
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.school_id = $1
       ORDER BY c.created_at DESC`,
      [auth.schoolId]
    );

    return rows.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      teacherName: formatPersonName(
        row.first_name ? String(row.first_name) : null,
        row.last_name ? String(row.last_name) : null,
        row.email ? String(row.email) : null
      ),
    }));
  }

  private async getScopedAssignmentsForSchedule(auth: AuthLike, minDate: string): Promise<Array<{ id: string; title: string; dueDate: string; className?: string }>> {
    if (!auth.schoolId) {
      return [];
    }

    if (auth.role === 'teacher') {
      return listTeacherAssignments(auth.schoolId, auth.userId)
        .then((rows) => rows.filter((row) => row.dueDate >= minDate));
    }

    if (auth.role === 'student') {
      return listStudentAssignments(auth.schoolId, auth.userId)
        .then((rows) => rows.filter((row) => row.dueDate >= minDate));
    }

    if (auth.role === 'parent') {
      return listParentAssignments(auth.schoolId, auth.userId)
        .then((rows) => rows.filter((row) => row.dueDate >= minDate));
    }

    return listPrincipalAssignments(auth.schoolId)
      .then((rows) => rows.filter((row) => row.dueDate >= minDate));
  }

  private async countClassStudents(classId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM class_enrollments
       WHERE class_id = $1`,
      [classId]
    );

    return toNumber(result.rows[0]?.count, 0);
  }
}

export const lmsPhase2Service = new LmsPhase2Service();
