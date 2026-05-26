/**
 * ProctoringService / ExamIntegrityEngine
 *
 * Server-side handler for exam integrity monitoring:
 *   - Creates proctoring sessions tied to exam attempts
 *   - Records behavioral events (tab switch, face detection, eye tracking)
 *   - Computes a real-time suspicion score
 *   - Generates a tamper-proof audit report
 *   - Supports FERPA/GDPR-compliant data handling
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { createHash } from 'crypto';

const logger = createLogger('ProctoringService');

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProctoringEventType =
  | 'tab_switch'
  | 'window_blur'
  | 'face_not_detected'
  | 'multiple_faces'
  | 'suspicious_eye_movement'
  | 'copy_paste_attempt'
  | 'print_attempt'
  | 'devtools_open'
  | 'screen_share_detected'
  | 'noise_detected'
  | 'face_mismatch';

export interface ProctoringEvent {
  id?: string;
  session_id: string;
  event_type: ProctoringEventType;
  severity: 'low' | 'medium' | 'high';
  details: Record<string, unknown>;
  occurred_at: string;
}

export interface ProctoringSession {
  id: string;
  exam_attempt_id: string;
  student_id: string;
  school_id: string;
  exam_id: string;
  status: 'active' | 'flagged' | 'completed' | 'voided';
  suspicion_score: number; // 0–100
  event_count: number;
  high_severity_count: number;
  started_at: string;
  ended_at: string | null;
  report_hash: string | null; // SHA-256 of the report for tamper-proofing
  created_at: string;
}

export interface IntegrityReport {
  session: ProctoringSession;
  events: ProctoringEvent[];
  summary: {
    totalEvents: number;
    highSeverityEvents: number;
    suspicionScore: number;
    verdict: 'clean' | 'suspicious' | 'flagged';
    recommendation: string;
  };
  reportHash: string; // SHA-256 for tamper-proofing
  generatedAt: string;
}

// ─── Severity & score mapping ────────────────────────────────────────────────

const EVENT_WEIGHTS: Record<ProctoringEventType, { severity: 'low' | 'medium' | 'high'; score: number }> = {
  tab_switch:               { severity: 'medium', score: 10 },
  window_blur:              { severity: 'low',    score: 5  },
  face_not_detected:        { severity: 'medium', score: 15 },
  multiple_faces:           { severity: 'high',   score: 25 },
  suspicious_eye_movement:  { severity: 'medium', score: 10 },
  copy_paste_attempt:       { severity: 'high',   score: 20 },
  print_attempt:            { severity: 'high',   score: 20 },
  devtools_open:            { severity: 'high',   score: 30 },
  screen_share_detected:    { severity: 'high',   score: 25 },
  noise_detected:           { severity: 'low',    score: 5  },
  face_mismatch:            { severity: 'high',   score: 40 },
};

// ─── Service ─────────────────────────────────────────────────────────────────

export class ProctoringService {
  /**
   * Start a proctoring session for an exam attempt.
   */
  static async startSession(
    examAttemptId: string,
    studentId: string,
    schoolId: string,
    examId: string,
  ): Promise<ProctoringSession> {
    const result = await query<ProctoringSession>(
      `INSERT INTO proctoring_sessions
         (exam_attempt_id, student_id, school_id, exam_id, status,
          suspicion_score, event_count, high_severity_count, started_at, created_at)
       VALUES ($1,$2,$3,$4,'active',0,0,0,NOW(),NOW())
       RETURNING *`,
      [examAttemptId, studentId, schoolId, examId],
    );

    logger.info('Proctoring session started', { sessionId: result.rows[0].id, studentId });
    return result.rows[0];
  }

  /**
   * Record a behavioral event and update the suspicion score.
   */
  static async recordEvent(event: Omit<ProctoringEvent, 'id'>): Promise<void> {
    const weight = EVENT_WEIGHTS[event.event_type] ?? { severity: 'low', score: 5 };

    await query(
      `INSERT INTO proctoring_events
         (session_id, event_type, severity, details, occurred_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        event.session_id,
        event.event_type,
        weight.severity,
        JSON.stringify(event.details),
        event.occurred_at,
      ],
    );

    // Update aggregates on the session (capped at 100)
    const isHigh = weight.severity === 'high';
    await query(
      `UPDATE proctoring_sessions
       SET suspicion_score = LEAST(100, suspicion_score + $1),
           event_count = event_count + 1,
           high_severity_count = high_severity_count + $2,
           status = CASE
             WHEN LEAST(100, suspicion_score + $1) >= 70 THEN 'flagged'
             ELSE status
           END
       WHERE id = $3`,
      [weight.score, isHigh ? 1 : 0, event.session_id],
    );

    logger.debug('Proctoring event recorded', {
      sessionId: event.session_id,
      type: event.event_type,
      score: weight.score,
    });
  }

  /**
   * Record multiple events in a batch (used for efficient client uploads).
   */
  static async recordBatchEvents(events: Omit<ProctoringEvent, 'id'>[]): Promise<void> {
    for (const event of events) {
      await this.recordEvent(event);
    }
  }

  /**
   * End a proctoring session and generate a tamper-proof integrity report.
   */
  static async endSession(sessionId: string): Promise<IntegrityReport> {
    const [sessionResult, eventsResult] = await Promise.all([
      query<ProctoringSession>(
        `UPDATE proctoring_sessions
         SET status = CASE WHEN status = 'active' THEN 'completed' ELSE status END,
             ended_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [sessionId],
      ),
      query<ProctoringEvent>(
        `SELECT * FROM proctoring_events WHERE session_id = $1 ORDER BY occurred_at ASC`,
        [sessionId],
      ),
    ]);

    const session = sessionResult.rows[0];
    if (!session) throw new Error('Proctoring session not found');

    const events = eventsResult.rows;
    const highCount = events.filter((e) => e.severity === 'high').length;
    const score = session.suspicion_score;

    const verdict: 'clean' | 'suspicious' | 'flagged' =
      score >= 70 ? 'flagged' : score >= 30 ? 'suspicious' : 'clean';

    const recommendation =
      verdict === 'flagged'
        ? 'Exam requires manual review by instructor. High probability of integrity violation.'
        : verdict === 'suspicious'
          ? 'Some anomalies detected. Instructor should review flagged events.'
          : 'No significant integrity violations detected.';

    const report: Omit<IntegrityReport, 'reportHash'> = {
      session,
      events,
      summary: {
        totalEvents: events.length,
        highSeverityEvents: highCount,
        suspicionScore: score,
        verdict,
        recommendation,
      },
      generatedAt: new Date().toISOString(),
    };

    // Generate tamper-proof hash (SHA-256 of sorted, serialized events + session ID)
    const hashInput = JSON.stringify({
      sessionId: session.id,
      studentId: session.student_id,
      examId: session.exam_id,
      score: session.suspicion_score,
      eventCount: events.length,
      events: events.map((e) => ({
        type: e.event_type,
        severity: e.severity,
        at: e.occurred_at,
      })),
      generatedAt: report.generatedAt,
    });

    const reportHash = createHash('sha256').update(hashInput).digest('hex');

    // Persist the hash to the session row
    await query(
      `UPDATE proctoring_sessions SET report_hash = $1 WHERE id = $2`,
      [reportHash, sessionId],
    );

    logger.info('Proctoring session ended', { sessionId, verdict, score });
    return { ...report, reportHash };
  }

  /**
   * Get an existing integrity report for a session.
   */
  static async getReport(sessionId: string, schoolId: string): Promise<IntegrityReport | null> {
    const [sessionResult, eventsResult] = await Promise.all([
      query<ProctoringSession>(
        `SELECT * FROM proctoring_sessions WHERE id = $1 AND school_id = $2`,
        [sessionId, schoolId],
      ),
      query<ProctoringEvent>(
        `SELECT * FROM proctoring_events WHERE session_id = $1 ORDER BY occurred_at ASC`,
        [sessionId],
      ),
    ]);

    const session = sessionResult.rows[0];
    if (!session) return null;

    const events = eventsResult.rows;
    const score = session.suspicion_score;
    const verdict: 'clean' | 'suspicious' | 'flagged' =
      score >= 70 ? 'flagged' : score >= 30 ? 'suspicious' : 'clean';

    return {
      session,
      events,
      summary: {
        totalEvents: events.length,
        highSeverityEvents: events.filter((e) => e.severity === 'high').length,
        suspicionScore: score,
        verdict,
        recommendation: '',
      },
      reportHash: session.report_hash ?? '',
      generatedAt: session.ended_at ?? session.created_at,
    };
  }

  /**
   * List all flagged sessions for a school (for teacher review).
   */
  static async listFlaggedSessions(schoolId: string, limit = 50): Promise<ProctoringSession[]> {
    const result = await query<ProctoringSession>(
      `SELECT * FROM proctoring_sessions
       WHERE school_id = $1 AND status = 'flagged'
       ORDER BY suspicion_score DESC, started_at DESC
       LIMIT $2`,
      [schoolId, limit],
    );
    return result.rows;
  }
}
