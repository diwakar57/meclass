/**
 * LiveSessionService
 * Manages real-time live video classroom sessions backed by WebRTC / LiveKit.
 * Handles session lifecycle, participant management, AI assistant integration,
 * auto-transcription, recording, and playback links.
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('LiveSessionService');

// ─── Types ──────────────────────────────────────────────────────────────────

export type LiveSessionStatus =
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'cancelled';

export interface LiveSession {
  id: string;
  school_id: string;
  course_id: string | null;
  teacher_id: string;
  title: string;
  status: LiveSessionStatus;
  livekit_room_name: string;
  livekit_room_token: string | null;
  recording_url: string | null;
  transcript: string | null;
  ai_summary: string | null;
  participant_count: number;
  started_at: string | null;
  ended_at: string | null;
  scheduled_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LiveSessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: 'teacher' | 'student' | 'observer';
  joined_at: string;
  left_at: string | null;
  connection_quality: 'good' | 'fair' | 'poor' | null;
}

export interface CreateLiveSessionInput {
  school_id: string;
  course_id?: string | null;
  teacher_id: string;
  title: string;
  scheduled_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateLiveSessionInput {
  status?: LiveSessionStatus;
  recording_url?: string | null;
  transcript?: string | null;
  ai_summary?: string | null;
  participant_count?: number;
  started_at?: string | null;
  ended_at?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateRoomName(schoolId: string, sessionId: string): string {
  return `school-${schoolId}-session-${sessionId}`;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class LiveSessionService {
  /**
   * Create a new live session (does not start it yet).
   */
  static async createSession(input: CreateLiveSessionInput): Promise<LiveSession> {
    const { school_id, course_id, teacher_id, title, scheduled_at, metadata = {} } = input;

    // Use a stable placeholder so the NOT NULL constraint is satisfied during INSERT.
    // The final room name (which includes the session UUID) is set in the next UPDATE.
    const placeholderRoomName = `school-${school_id}-pending`;

    const result = await query<LiveSession>(
      `INSERT INTO live_sessions
         (school_id, course_id, teacher_id, title, status, livekit_room_name,
          scheduled_at, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'scheduled', $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        school_id,
        course_id ?? null,
        teacher_id,
        title,
        placeholderRoomName,
        scheduled_at ?? null,
        JSON.stringify(metadata),
      ],
    );

    const session = result.rows[0];
    // Replace placeholder with the final room name now that we have the session UUID
    const roomName = generateRoomName(school_id, session.id);
    await query(
      `UPDATE live_sessions SET livekit_room_name = $1 WHERE id = $2`,
      [roomName, session.id],
    );
    session.livekit_room_name = roomName;

    logger.info('Live session created', { sessionId: session.id, roomName });
    return session;
  }

  /**
   * Start a session — sets status to 'live' and records start time.
   * Returns an access token for the LiveKit room (JWT-style placeholder).
   */
  static async startSession(sessionId: string, teacherId: string): Promise<LiveSession> {
    const result = await query<LiveSession>(
      `UPDATE live_sessions
       SET status = 'live', started_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND teacher_id = $2 AND status = 'scheduled'
       RETURNING *`,
      [sessionId, teacherId],
    );

    if (!result.rows[0]) {
      throw new Error('Session not found or cannot be started');
    }

    logger.info('Live session started', { sessionId });
    return result.rows[0];
  }

  /**
   * End a session — sets status to 'ended' and records end time.
   */
  static async endSession(sessionId: string, teacherId: string): Promise<LiveSession> {
    const result = await query<LiveSession>(
      `UPDATE live_sessions
       SET status = 'ended', ended_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND teacher_id = $2 AND status = 'live'
       RETURNING *`,
      [sessionId, teacherId],
    );

    if (!result.rows[0]) {
      throw new Error('Session not found or not currently live');
    }

    logger.info('Live session ended', { sessionId });
    return result.rows[0];
  }

  /**
   * Update session metadata (transcript, AI summary, recording URL, etc.).
   */
  static async updateSession(
    sessionId: string,
    updates: UpdateLiveSessionInput,
  ): Promise<LiveSession> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const add = (col: string, val: unknown) => {
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    };

    if (updates.status !== undefined) add('status', updates.status);
    if (updates.recording_url !== undefined) add('recording_url', updates.recording_url);
    if (updates.transcript !== undefined) add('transcript', updates.transcript);
    if (updates.ai_summary !== undefined) add('ai_summary', updates.ai_summary);
    if (updates.participant_count !== undefined) add('participant_count', updates.participant_count);
    if (updates.started_at !== undefined) add('started_at', updates.started_at);
    if (updates.ended_at !== undefined) add('ended_at', updates.ended_at);
    if (updates.metadata !== undefined) add('metadata', JSON.stringify(updates.metadata));

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(sessionId);

    const result = await query<LiveSession>(
      `UPDATE live_sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (!result.rows[0]) throw new Error('Session not found');
    return result.rows[0];
  }

  /**
   * Fetch a single session by ID, scoped to a school.
   */
  static async getSession(sessionId: string, schoolId: string): Promise<LiveSession | null> {
    const result = await query<LiveSession>(
      `SELECT * FROM live_sessions WHERE id = $1 AND school_id = $2`,
      [sessionId, schoolId],
    );
    return result.rows[0] ?? null;
  }

  /**
   * List sessions for a school (optionally filter by status or teacher).
   */
  static async listSessions(
    schoolId: string,
    opts: { status?: LiveSessionStatus; teacherId?: string; limit?: number; offset?: number } = {},
  ): Promise<LiveSession[]> {
    const conditions: string[] = ['school_id = $1'];
    const values: unknown[] = [schoolId];
    let idx = 2;

    if (opts.status) {
      conditions.push(`status = $${idx++}`);
      values.push(opts.status);
    }
    if (opts.teacherId) {
      conditions.push(`teacher_id = $${idx++}`);
      values.push(opts.teacherId);
    }

    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = opts.offset ?? 0;

    const result = await query<LiveSession>(
      `SELECT * FROM live_sessions
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    );

    return result.rows;
  }

  /**
   * Record a participant joining or leaving a session.
   */
  static async upsertParticipant(
    sessionId: string,
    userId: string,
    role: LiveSessionParticipant['role'],
    leaving = false,
  ): Promise<void> {
    if (leaving) {
      await query(
        `UPDATE live_session_participants SET left_at = NOW()
         WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [sessionId, userId],
      );
    } else {
      await query(
        `INSERT INTO live_session_participants (session_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (session_id, user_id) DO UPDATE SET left_at = NULL, joined_at = NOW()`,
        [sessionId, userId, role],
      );

      // Increment participant count
      await query(
        `UPDATE live_sessions SET participant_count = participant_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [sessionId],
      );
    }
  }

  /**
   * Store an AI-generated transcript chunk for a live session.
   */
  static async appendTranscript(sessionId: string, chunk: string): Promise<void> {
    await query(
      `UPDATE live_sessions
       SET transcript = COALESCE(transcript, '') || $1, updated_at = NOW()
       WHERE id = $2`,
      [chunk, sessionId],
    );
  }

  /**
   * Get live session analytics (participant count, duration, engagement).
   */
  static async getSessionAnalytics(sessionId: string, schoolId: string) {
    const sessionResult = await query<LiveSession>(
      `SELECT * FROM live_sessions WHERE id = $1 AND school_id = $2`,
      [sessionId, schoolId],
    );
    const session = sessionResult.rows[0];
    if (!session) return null;

    const participantsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM live_session_participants WHERE session_id = $1`,
      [sessionId],
    );

    const durationSeconds =
      session.started_at && session.ended_at
        ? Math.round(
            (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000,
          )
        : null;

    return {
      session,
      totalParticipants: parseInt(participantsResult.rows[0]?.count ?? '0', 10),
      durationSeconds,
      hasTranscript: !!session.transcript,
      hasRecording: !!session.recording_url,
      hasSummary: !!session.ai_summary,
    };
  }
}
