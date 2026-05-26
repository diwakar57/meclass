/**
 * AIClassroomSessionRepository
 * Data access layer for AI classroom sessions
 * Follows repository pattern for consistent CRUD operations
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { AIClassroomSession } from '@/lib/types/ai-classroom';

const logger = createLogger('AIClassroomSessionRepository');

/**
 * Create a new AI classroom session
 */
export async function createAIClassroomSession(
  session: AIClassroomSession
): Promise<AIClassroomSession> {
  try {
    const result = await query(
      `INSERT INTO ai_classroom_sessions (
        id, session_type, school_id, student_id, topic_id,
        difficulty_level, teaching_style, duration_seconds,
        content_url, video_url, audio_url, transcript_url,
        scene_data, interaction_data, media_data,
        status, generated_at, created_at, updated_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        session.id,
        session.sessionType,
        session.schoolId,
        session.studentId,
        session.topicId,
        session.difficultyLevel,
        session.teachingStyle,
        session.duration,
        session.contentUrl || null,
        session.videoUrl || null,
        session.audioUrl || null,
        session.transcriptUrl || null,
        JSON.stringify(session.sceneData),
        JSON.stringify(session.interactionData),
        JSON.stringify(session.mediaData),
        session.status,
        session.generatedAt.toISOString(),
        session.createdAt.toISOString(),
        session.updatedAt.toISOString(),
        JSON.stringify(session.metadata || {}),
      ]
    );

    if (!result.rows[0]) {
      throw new Error('Failed to create session');
    }

    return mapRowToSession(result.rows[0]);
  } catch (error) {
    logger.error('Failed to create AI classroom session', { error });
    throw error;
  }
}

/**
 * Get a single session by ID
 */
export async function getAIClassroomSession(
  sessionId: string,
  schoolId: string
): Promise<AIClassroomSession | null> {
  try {
    const result = await query(
      `SELECT * FROM ai_classroom_sessions 
       WHERE id = $1 AND school_id = $2`,
      [sessionId, schoolId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToSession(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get AI classroom session', { error, sessionId, schoolId });
    throw error;
  }
}

/**
 * List sessions for a student with pagination
 */
export async function listStudentSessions(
  studentId: string,
  schoolId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ sessions: AIClassroomSession[]; total: number }> {
  try {
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM ai_classroom_sessions 
       WHERE student_id = $1 AND school_id = $2`,
      [studentId, schoolId]
    );

    const total = countResult.rows[0]?.count || 0;

    // Get paginated results
    const result = await query(
      `SELECT * FROM ai_classroom_sessions 
       WHERE student_id = $1 AND school_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [studentId, schoolId, limit, offset]
    );

    return {
      sessions: result.rows.map(row => mapRowToSession(row)),
      total,
    };
  } catch (error) {
    logger.error('Failed to list student sessions', { error, studentId, schoolId });
    throw error;
  }
}

/**
 * List sessions for a topic
 */
export async function listTopicSessions(
  topicId: string,
  schoolId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ sessions: AIClassroomSession[]; total: number }> {
  try {
    const countResult = await query(
      `SELECT COUNT(*) as count FROM ai_classroom_sessions 
       WHERE topic_id = $1 AND school_id = $2`,
      [topicId, schoolId]
    );

    const total = countResult.rows[0]?.count || 0;

    const result = await query(
      `SELECT * FROM ai_classroom_sessions 
       WHERE topic_id = $1 AND school_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [topicId, schoolId, limit, offset]
    );

    return {
      sessions: result.rows.map(row => mapRowToSession(row)),
      total,
    };
  } catch (error) {
    logger.error('Failed to list topic sessions', { error, topicId, schoolId });
    throw error;
  }
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  schoolId: string,
  status: 'generated' | 'started' | 'completed' | 'abandoned',
  metadata?: Record<string, unknown>
): Promise<AIClassroomSession | null> {
  try {
    const updateData: any[] = [sessionId, schoolId, status];
    let updateClause = `status = $3, updated_at = CURRENT_TIMESTAMP`;

    if (metadata) {
      updateData.push(JSON.stringify(metadata));
      updateClause += `, metadata = $4`;
    }

    const result = await query(
      `UPDATE ai_classroom_sessions 
       SET ${updateClause}
       WHERE id = $1 AND school_id = $2
       RETURNING *`,
      updateData
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToSession(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update session status', { error, sessionId });
    throw error;
  }
}

/**
 * Mark session as started
 */
export async function markSessionStarted(
  sessionId: string,
  schoolId: string
): Promise<AIClassroomSession | null> {
  try {
    const result = await query(
      `UPDATE ai_classroom_sessions 
       SET status = 'started', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND school_id = $2
       RETURNING *`,
      [sessionId, schoolId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToSession(result.rows[0]);
  } catch (error) {
    logger.error('Failed to mark session as started', { error, sessionId });
    throw error;
  }
}

/**
 * Mark session as completed
 */
export async function markSessionCompleted(
  sessionId: string,
  schoolId: string,
  interactionData?: Record<string, unknown>
): Promise<AIClassroomSession | null> {
  try {
    const updateData: any[] = [sessionId, schoolId];
    let updateClause = `status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`;

    if (interactionData) {
      updateData.push(JSON.stringify(interactionData));
      updateClause += `, interaction_data = $3`;
    }

    const result = await query(
      `UPDATE ai_classroom_sessions 
       SET ${updateClause}
       WHERE id = $1 AND school_id = $2
       RETURNING *`,
      updateData
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToSession(result.rows[0]);
  } catch (error) {
    logger.error('Failed to mark session as completed', { error, sessionId });
    throw error;
  }
}

/**
 * Update interaction data (quiz responses, chat, etc.)
 */
export async function updateInteractionData(
  sessionId: string,
  schoolId: string,
  interactionData: Record<string, unknown>
): Promise<AIClassroomSession | null> {
  try {
    const result = await query(
      `UPDATE ai_classroom_sessions 
       SET interaction_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND school_id = $3
       RETURNING *`,
      [JSON.stringify(interactionData), sessionId, schoolId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToSession(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update interaction data', { error, sessionId });
    throw error;
  }
}

/**
 * Delete a session (soft delete if needed)
 */
export async function deleteAIClassroomSession(
  sessionId: string,
  schoolId: string
): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM ai_classroom_sessions 
       WHERE id = $1 AND school_id = $2`,
      [sessionId, schoolId]
    );

    return Number(result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Failed to delete AI classroom session', { error, sessionId });
    throw error;
  }
}

/**
 * Get sessions by status
 */
export async function getSessionsByStatus(
  schoolId: string,
  status: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ sessions: AIClassroomSession[]; total: number }> {
  try {
    const countResult = await query(
      `SELECT COUNT(*) as count FROM ai_classroom_sessions 
       WHERE school_id = $1 AND status = $2`,
      [schoolId, status]
    );

    const total = countResult.rows[0]?.count || 0;

    const result = await query(
      `SELECT * FROM ai_classroom_sessions 
       WHERE school_id = $1 AND status = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [schoolId, status, limit, offset]
    );

    return {
      sessions: result.rows.map(row => mapRowToSession(row)),
      total,
    };
  } catch (error) {
    logger.error('Failed to get sessions by status', { error, status });
    throw error;
  }
}

/**
 * Get analytics: sessions by difficulty level
 */
export async function getSessionsByDifficulty(
  schoolId: string,
  studentId: string
): Promise<Record<number, number>> {
  try {
    const result = await query(
      `SELECT difficulty_level, COUNT(*) as count 
       FROM ai_classroom_sessions 
       WHERE school_id = $1 AND student_id = $2
       GROUP BY difficulty_level
       ORDER BY difficulty_level ASC`,
      [schoolId, studentId]
    );

    const counts: Record<number, number> = {};
    result.rows.forEach(row => {
      counts[row.difficulty_level] = row.count;
    });
    return counts;
  } catch (error) {
    logger.error('Failed to get sessions by difficulty', { error, studentId });
    throw error;
  }
}

/**
 * Internal helper: Map database row to AIClassroomSession
 */
function mapRowToSession(row: any): AIClassroomSession {
  return {
    id: row.id,
    sessionType: row.session_type,
    studentId: row.student_id,
    schoolId: row.school_id,
    topicId: row.topic_id,
    difficultyLevel: row.difficulty_level,
    teachingStyle: row.teaching_style,
    duration: row.duration_seconds,
    contentUrl: row.content_url,
    videoUrl: row.video_url,
    audioUrl: row.audio_url,
    transcriptUrl: row.transcript_url,
    sceneData: typeof row.scene_data === 'string' ? JSON.parse(row.scene_data) : row.scene_data,
    interactionData: typeof row.interaction_data === 'string' ? JSON.parse(row.interaction_data) : row.interaction_data,
    mediaData: typeof row.media_data === 'string' ? JSON.parse(row.media_data) : row.media_data,
    status: row.status,
    generatedAt: new Date(row.generated_at),
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export default {
  createAIClassroomSession,
  getAIClassroomSession,
  listStudentSessions,
  listTopicSessions,
  updateSessionStatus,
  markSessionStarted,
  markSessionCompleted,
  updateInteractionData,
  deleteAIClassroomSession,
  getSessionsByStatus,
  getSessionsByDifficulty,
};
