/**
 * OpenMAIC Session Service
 * Database operations for OpenMAIC classroom sessions
 * Bridges LearnAI platform with OpenMAIC classroom engine
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OpenMAICSessionService');

export interface OpenMAICSession {
  id: string;
  school_id: string;
  student_id: string;
  topic_id: string | null;
  teaching_style: string;
  difficulty_level: number;
  video_url: string | null;
  audio_url: string | null;
  transcript: string | null;
  duration_seconds: number | null;
  learning_dna_applied: Record<string, any> | null;
  generation_prompt: string | null;
  generation_model: string;
  session_metadata: Record<string, any>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOpenMAICSessionInput {
  school_id: string;
  student_id: string;
  topic_id?: string | null;
  teaching_style: string;
  difficulty_level: number;
  video_url?: string | null;
  audio_url?: string | null;
  transcript?: string | null;
  duration_seconds?: number | null;
  learning_dna_applied?: Record<string, any> | null;
  generation_prompt?: string | null;
  generation_model?: string;
  session_metadata?: Record<string, any>;
}

export interface UpdateOpenMAICSessionInput {
  video_url?: string | null;
  audio_url?: string | null;
  transcript?: string | null;
  duration_seconds?: number | null;
  session_metadata?: Record<string, any>;
  completed_at?: string | null;
}

/**
 * Create a new OpenMAIC session
 */
export async function createOpenMAICSession(
  input: CreateOpenMAICSessionInput
): Promise<OpenMAICSession> {
  try {
    const result = await query(
      `INSERT INTO openmaic_sessions (
        school_id, student_id, topic_id, teaching_style, difficulty_level,
        video_url, audio_url, transcript, duration_seconds,
        learning_dna_applied, generation_prompt, generation_model,
        session_metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        input.school_id,
        input.student_id,
        input.topic_id || null,
        input.teaching_style,
        input.difficulty_level,
        input.video_url || null,
        input.audio_url || null,
        input.transcript || null,
        input.duration_seconds || null,
        input.learning_dna_applied ? JSON.stringify(input.learning_dna_applied) : null,
        input.generation_prompt || null,
        input.generation_model || 'openai',
        JSON.stringify(input.session_metadata || {}),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create session');
    }

    const row = result.rows[0];
    return mapRowToSession(row);
  } catch (error) {
    logger.error('Failed to create OpenMAIC session', { error, input });
    throw error;
  }
}

/**
 * Get a single OpenMAIC session by ID
 */
export async function getOpenMAICSession(sessionId: string): Promise<OpenMAICSession | null> {
  try {
    const result = await query(
      `SELECT * FROM openmaic_sessions WHERE id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToSession(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get OpenMAIC session', { error, sessionId });
    throw error;
  }
}

/**
 * List all sessions for a student
 */
export async function listStudentOpenMAICSessions(
  studentId: string,
  schoolId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ sessions: OpenMAICSession[]; total: number }> {
  try {
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM openmaic_sessions 
       WHERE student_id = $1 AND school_id = $2`,
      [studentId, schoolId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const result = await query(
      `SELECT * FROM openmaic_sessions 
       WHERE student_id = $1 AND school_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [studentId, schoolId, limit, offset]
    );

    return {
      sessions: result.rows.map(mapRowToSession),
      total,
    };
  } catch (error) {
    logger.error('Failed to list student OpenMAIC sessions', { error, studentId, schoolId });
    throw error;
  }
}

/**
 * List all sessions for a topic
 */
export async function listTopicOpenMAICSessions(
  topicId: string,
  schoolId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ sessions: OpenMAICSession[]; total: number }> {
  try {
    const countResult = await query(
      `SELECT COUNT(*) as count FROM openmaic_sessions 
       WHERE topic_id = $1 AND school_id = $2`,
      [topicId, schoolId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `SELECT * FROM openmaic_sessions 
       WHERE topic_id = $1 AND school_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [topicId, schoolId, limit, offset]
    );

    return {
      sessions: result.rows.map(mapRowToSession),
      total,
    };
  } catch (error) {
    logger.error('Failed to list topic OpenMAIC sessions', { error, topicId, schoolId });
    throw error;
  }
}

/**
 * Update an OpenMAIC session
 */
export async function updateOpenMAICSession(
  sessionId: string,
  input: UpdateOpenMAICSessionInput
): Promise<OpenMAICSession> {
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.video_url !== undefined) {
      updates.push(`video_url = $${paramCount++}`);
      values.push(input.video_url);
    }

    if (input.audio_url !== undefined) {
      updates.push(`audio_url = $${paramCount++}`);
      values.push(input.audio_url);
    }

    if (input.transcript !== undefined) {
      updates.push(`transcript = $${paramCount++}`);
      values.push(input.transcript);
    }

    if (input.duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${paramCount++}`);
      values.push(input.duration_seconds);
    }

    if (input.session_metadata !== undefined) {
      updates.push(`session_metadata = $${paramCount++}`);
      values.push(JSON.stringify(input.session_metadata));
    }

    if (input.completed_at !== undefined) {
      updates.push(`completed_at = $${paramCount++}`);
      values.push(input.completed_at);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      // No actual updates
      const result = await query(
        `SELECT * FROM openmaic_sessions WHERE id = $1`,
        [sessionId]
      );
      if (result.rows.length === 0) {
        throw new Error('Session not found');
      }
      return mapRowToSession(result.rows[0]);
    }

    values.push(sessionId);
    const result = await query(
      `UPDATE openmaic_sessions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Session not found');
    }

    return mapRowToSession(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update OpenMAIC session', { error, sessionId, input });
    throw error;
  }
}

/**
 * Delete an OpenMAIC session
 */
export async function deleteOpenMAICSession(sessionId: string): Promise<void> {
  try {
    await query(
      `DELETE FROM openmaic_sessions WHERE id = $1`,
      [sessionId]
    );
  } catch (error) {
    logger.error('Failed to delete OpenMAIC session', { error, sessionId });
    throw error;
  }
}

/**
 * Get completed sessions for a student (for learning progress tracking)
 */
export async function getCompletedOpenMAICSessions(
  studentId: string,
  schoolId: string
): Promise<OpenMAICSession[]> {
  try {
    const result = await query(
      `SELECT * FROM openmaic_sessions 
       WHERE student_id = $1 AND school_id = $2 AND completed_at IS NOT NULL
       ORDER BY completed_at DESC`,
      [studentId, schoolId]
    );

    return result.rows.map(mapRowToSession);
  } catch (error) {
    logger.error('Failed to get completed OpenMAIC sessions', {
      error,
      studentId,
      schoolId,
    });
    throw error;
  }
}

/**
 * Count sessions by teaching style for analytics
 */
export async function countSessionsByTeachingStyle(
  schoolId: string
): Promise<Record<string, number>> {
  try {
    const result = await query(
      `SELECT teaching_style, COUNT(*) as count FROM openmaic_sessions 
       WHERE school_id = $1
       GROUP BY teaching_style`,
      [schoolId]
    );

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.teaching_style] = parseInt(row.count, 10);
    }

    return counts;
  } catch (error) {
    logger.error('Failed to count sessions by teaching style', { error, schoolId });
    throw error;
  }
}

/**
 * Get average difficulty level for sessions
 */
export async function getAverageDifficultyLevel(schoolId: string): Promise<number> {
  try {
    const result = await query(
      `SELECT AVG(difficulty_level) as avg_difficulty FROM openmaic_sessions 
       WHERE school_id = $1`,
      [schoolId]
    );

    const avg = result.rows[0]?.avg_difficulty;
    return avg ? parseFloat(avg) : 0;
  } catch (error) {
    logger.error('Failed to get average difficulty level', { error, schoolId });
    throw error;
  }
}

/**
 * Map database row to OpenMAICSession type
 */
function mapRowToSession(row: any): OpenMAICSession {
  return {
    id: row.id,
    school_id: row.school_id,
    student_id: row.student_id,
    topic_id: row.topic_id,
    teaching_style: row.teaching_style,
    difficulty_level: row.difficulty_level,
    video_url: row.video_url,
    audio_url: row.audio_url,
    transcript: row.transcript,
    duration_seconds: row.duration_seconds,
    learning_dna_applied: row.learning_dna_applied ? row.learning_dna_applied : null,
    generation_prompt: row.generation_prompt,
    generation_model: row.generation_model,
    session_metadata: row.session_metadata ? row.session_metadata : {},
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
