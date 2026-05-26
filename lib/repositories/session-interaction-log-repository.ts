/**
 * SessionInteractionLogRepository
 * Data access layer for session interaction logs
 * Tracks student interactions for analytics and engagement metrics
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { SessionInteractionLog, InteractionLogEntry } from '@/lib/types/ai-classroom';

const logger = createLogger('SessionInteractionLogRepository');

/**
 * Create a new interaction log for a session
 */
export async function createInteractionLog(
  sessionId: string,
  schoolId: string,
  entries: InteractionLogEntry[] = []
): Promise<SessionInteractionLog> {
  try {
    const result = await query(
      `INSERT INTO session_interaction_logs (
        session_id, school_id, entries, total_interactions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        sessionId,
        schoolId,
        JSON.stringify(entries),
        entries.length,
      ]
    );

    if (!result.rows[0]) {
      throw new Error('Failed to create interaction log');
    }

    return mapRowToLog(result.rows[0]);
  } catch (error) {
    logger.error('Failed to create interaction log', { error, sessionId });
    throw error;
  }
}

/**
 * Get interaction log for a session
 */
export async function getInteractionLog(
  sessionId: string,
  schoolId: string
): Promise<SessionInteractionLog | null> {
  try {
    const result = await query(
      `SELECT * FROM session_interaction_logs 
       WHERE session_id = $1 AND school_id = $2`,
      [sessionId, schoolId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToLog(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get interaction log', { error, sessionId });
    throw error;
  }
}

/**
 * Add an interaction entry to the log
 */
export async function addInteractionEntry(
  sessionId: string,
  schoolId: string,
  entry: InteractionLogEntry
): Promise<SessionInteractionLog | null> {
  try {
    // Get existing log
    const existing = await getInteractionLog(sessionId, schoolId);
    if (!existing) {
      throw new Error(`Interaction log not found for session ${sessionId}`);
    }

    // Add new entry
    const updatedEntries = [...existing.entries, entry];

    // Update metrics
    let avgResponseTime = existing.avgResponseTime || 0;
    let quizAttemptCount = existing.quizAttemptCount || 0;
    let helpRequestCount = existing.helpRequestCount || 0;

    if (entry.type === 'student_response' && entry.duration) {
      avgResponseTime = (existing.avgResponseTime || 0) * (existing.totalInteractions || 1)
        + (entry.duration || 0);
      avgResponseTime = avgResponseTime / (existing.totalInteractions + 1);
    }

    if (entry.type === 'quiz_submitted') {
      quizAttemptCount = (quizAttemptCount || 0) + 1;
    }

    if (entry.type === 'help_requested') {
      helpRequestCount = (helpRequestCount || 0) + 1;
    }

    // Update database
    const result = await query(
      `UPDATE session_interaction_logs 
       SET entries = $1, total_interactions = $2, 
           avg_response_time_ms = $3, quiz_attempts = $4, 
           help_requests = $5, updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $6 AND school_id = $7
       RETURNING *`,
      [
        JSON.stringify(updatedEntries),
        updatedEntries.length,
        Math.round(avgResponseTime),
        quizAttemptCount,
        helpRequestCount,
        sessionId,
        schoolId,
      ]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToLog(result.rows[0]);
  } catch (error) {
    logger.error('Failed to add interaction entry', { error, sessionId });
    throw error;
  }
}

/**
 * Get entries by type
 */
export async function getEntriesByType(
  sessionId: string,
  schoolId: string,
  type: string
): Promise<InteractionLogEntry[]> {
  try {
    const log = await getInteractionLog(sessionId, schoolId);
    if (!log) {
      return [];
    }

    return log.entries.filter(entry => entry.type === type);
  } catch (error) {
    logger.error('Failed to get entries by type', { error, sessionId, type });
    throw error;
  }
}

/**
 * Get entries for a specific scene
 */
export async function getSceneEntries(
  sessionId: string,
  schoolId: string,
  sceneId: string
): Promise<InteractionLogEntry[]> {
  try {
    const log = await getInteractionLog(sessionId, schoolId);
    if (!log) {
      return [];
    }

    return log.entries.filter(entry => entry.sceneId === sceneId);
  } catch (error) {
    logger.error('Failed to get scene entries', { error, sessionId, sceneId });
    throw error;
  }
}

/**
 * Calculate engagement score (0-100)
 * Based on interaction frequency, response times, quiz attempts
 */
export async function calculateEngagementScore(
  sessionId: string,
  schoolId: string
): Promise<number> {
  try {
    const log = await getInteractionLog(sessionId, schoolId);
    if (!log) {
      return 0;
    }

    // Base score from interaction count
    const interactionScore = Math.min(log.totalInteractions * 2, 30);

    // Score from quiz attempts
    const quizScore = Math.min((log.quizAttemptCount || 0) * 10, 30);

    // Score from response time (penalize slow responses)
    let responseScore = 20;
    if (log.avgResponseTime && log.avgResponseTime > 10000) {
      responseScore = 10;
    } else if (log.avgResponseTime && log.avgResponseTime > 30000) {
      responseScore = 5;
    }

    // Penalize for help requests (indicates struggles)
    let helpPenalty = 0;
    if ((log.helpRequestCount || 0) > 2) {
      helpPenalty = Math.min((log.helpRequestCount || 0) - 2, 20);
    }

    const totalScore = interactionScore + quizScore + responseScore - helpPenalty;
    return Math.max(0, Math.min(totalScore, 100));
  } catch (error) {
    logger.error('Failed to calculate engagement score', { error, sessionId });
    throw error;
  }
}

/**
 * Get session duration from logs
 * Calculates from first and last interaction timestamps
 */
export async function getSessionDuration(
  sessionId: string,
  schoolId: string
): Promise<number | null> {
  try {
    const log = await getInteractionLog(sessionId, schoolId);
    if (!log || log.entries.length === 0) {
      return null;
    }

    const timestamps = log.entries
      .filter(e => e.timestamp !== undefined)
      .map(e => e.timestamp!);

    if (timestamps.length < 2) {
      return null;
    }

    return Math.max(...timestamps) - Math.min(...timestamps);
  } catch (error) {
    logger.error('Failed to get session duration', { error, sessionId });
    throw error;
  }
}

/**
 * Delete interaction log
 */
export async function deleteInteractionLog(
  sessionId: string,
  schoolId: string
): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM session_interaction_logs 
       WHERE session_id = $1 AND school_id = $2`,
      [sessionId, schoolId]
    );

    return Number(result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Failed to delete interaction log', { error, sessionId });
    throw error;
  }
}

/**
 * Get analytics summary for comparison
 */
export async function getLogsForComparison(
  schoolId: string,
  studentId?: string,
  limit: number = 10
): Promise<
  Array<{
    sessionId: string;
    totalInteractions: number;
    engagementScore: number;
    avgResponseTime: number | null;
  }>
> {
  try {
    let query_str = `
      SELECT 
        session_id,
        total_interactions,
        avg_response_time_ms,
        created_at
      FROM session_interaction_logs 
      WHERE school_id = $1
    `;
    const params: any[] = [schoolId];

    if (studentId) {
      query_str += ` AND session_id IN (
        SELECT id FROM ai_classroom_sessions 
        WHERE student_id = $2
      )`;
      params.push(studentId);
    }

    query_str += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(query_str, params);

    // Calculate engagement scores for each
    const analytics = [];
    for (const row of result.rows) {
      const engagementScore = await calculateEngagementScore(row.session_id, schoolId);
      analytics.push({
        sessionId: row.session_id,
        totalInteractions: row.total_interactions,
        engagementScore,
        avgResponseTime: row.avg_response_time_ms,
      });
    }

    return analytics;
  } catch (error) {
    logger.error('Failed to get logs for comparison', { error, schoolId, studentId });
    throw error;
  }
}

/**
 * Internal helper: Map database row to SessionInteractionLog
 */
function mapRowToLog(row: any): SessionInteractionLog {
  return {
    id: row.id,
    sessionId: row.session_id,
    schoolId: row.school_id,
    entries: typeof row.entries === 'string' ? JSON.parse(row.entries) : row.entries || [],
    totalInteractions: row.total_interactions || 0,
    avgResponseTime: row.avg_response_time_ms || undefined,
    quizAttemptCount: row.quiz_attempts || undefined,
    helpRequestCount: row.help_requests || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export default {
  createInteractionLog,
  getInteractionLog,
  addInteractionEntry,
  getEntriesByType,
  getSceneEntries,
  calculateEngagementScore,
  getSessionDuration,
  deleteInteractionLog,
  getLogsForComparison,
};
