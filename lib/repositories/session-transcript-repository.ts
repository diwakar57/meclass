/**
 * SessionTranscriptRepository
 * Data access layer for session transcripts
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { SessionTranscript, TranscriptEntry } from '@/lib/types/ai-classroom';

const logger = createLogger('SessionTranscriptRepository');

/**
 * Create a new session transcript
 */
export async function createTranscript(
  sessionId: string,
  schoolId: string,
  entries: TranscriptEntry[],
  plainText: string,
  language?: string
): Promise<SessionTranscript> {
  try {
    const wordCount = plainText.split(/\s+/).length;
    
    const result = await query(
      `INSERT INTO session_transcripts (
        session_id, school_id, entries, plain_text, word_count, language, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        sessionId,
        schoolId,
        JSON.stringify(entries),
        plainText,
        wordCount,
        language || 'en-US',
      ]
    );

    if (!result.rows[0]) {
      throw new Error('Failed to create transcript');
    }

    return mapRowToTranscript(result.rows[0]);
  } catch (error) {
    logger.error('Failed to create transcript', { error, sessionId });
    throw error;
  }
}

/**
 * Get transcript for a session
 */
export async function getTranscript(
  sessionId: string,
  schoolId: string
): Promise<SessionTranscript | null> {
  try {
    const result = await query(
      `SELECT * FROM session_transcripts 
       WHERE session_id = $1 AND school_id = $2`,
      [sessionId, schoolId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToTranscript(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get transcript', { error, sessionId });
    throw error;
  }
}

/**
 * Update transcript entries
 */
export async function updateTranscript(
  sessionId: string,
  schoolId: string,
  entries: TranscriptEntry[],
  plainText: string
): Promise<SessionTranscript | null> {
  try {
    const wordCount = plainText.split(/\s+/).length;

    const result = await query(
      `UPDATE session_transcripts 
       SET entries = $1, plain_text = $2, word_count = $3, updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $4 AND school_id = $5
       RETURNING *`,
      [
        JSON.stringify(entries),
        plainText,
        wordCount,
        sessionId,
        schoolId,
      ]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRowToTranscript(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update transcript', { error, sessionId });
    throw error;
  }
}

/**
 * Append entries to existing transcript
 */
export async function appendToTranscript(
  sessionId: string,
  schoolId: string,
  newEntries: TranscriptEntry[],
  newPlainText: string
): Promise<SessionTranscript | null> {
  try {
    // Get existing transcript
    const existing = await getTranscript(sessionId, schoolId);
    if (!existing) {
      throw new Error(`Transcript not found for session ${sessionId}`);
    }

    // Combine entries
    const allEntries = [...existing.entries, ...newEntries];
    const combinedText = existing.plainText + '\n' + newPlainText;

    return updateTranscript(sessionId, schoolId, allEntries, combinedText);
  } catch (error) {
    logger.error('Failed to append to transcript', { error, sessionId });
    throw error;
  }
}

/**
 * Search transcript by keyword
 */
export async function searchTranscript(
  sessionId: string,
  schoolId: string,
  keyword: string
): Promise<TranscriptEntry[]> {
  try {
    const result = await query(
      `SELECT * FROM session_transcripts 
       WHERE session_id = $1 AND school_id = $2 AND plain_text ILIKE $3`,
      [sessionId, schoolId, `%${keyword}%`]
    );

    if (!result.rows[0]) {
      return [];
    }

    const transcript = mapRowToTranscript(result.rows[0]);
    
    // Filter entries by keyword
    return transcript.entries.filter(entry =>
      entry.text.toLowerCase().includes(keyword.toLowerCase())
    );
  } catch (error) {
    logger.error('Failed to search transcript', { error, sessionId });
    throw error;
  }
}

/**
 * Get transcript as plain text (for download)
 */
export async function getTranscriptPlainText(
  sessionId: string,
  schoolId: string
): Promise<string | null> {
  try {
    const result = await query(
      `SELECT plain_text FROM session_transcripts 
       WHERE session_id = $1 AND school_id = $2`,
      [sessionId, schoolId]
    );

    return result.rows[0]?.plain_text || null;
  } catch (error) {
    logger.error('Failed to get transcript plain text', { error, sessionId });
    throw error;
  }
}

/**
 * Delete transcript
 */
export async function deleteTranscript(
  sessionId: string,
  schoolId: string
): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM session_transcripts 
       WHERE session_id = $1 AND school_id = $2`,
      [sessionId, schoolId]
    );

    return Number(result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Failed to delete transcript', { error, sessionId });
    throw error;
  }
}

/**
 * Get transcript statistics
 */
export async function getTranscriptStats(
  sessionId: string,
  schoolId: string
): Promise<{
  wordCount: number;
  entryCount: number;
  speakers: string[];
  duration: { start: number; end: number } | null;
} | null> {
  try {
    const transcript = await getTranscript(sessionId, schoolId);
    if (!transcript) {
      return null;
    }

    const speakers = [...new Set(transcript.entries.map(e => e.speaker))];
    const timestamps = transcript.entries
      .filter(e => e.timestamp !== undefined)
      .map(e => e.timestamp!);

    return {
      wordCount: transcript.wordCount,
      entryCount: transcript.entries.length,
      speakers,
      duration: timestamps.length > 0
        ? { start: Math.min(...timestamps), end: Math.max(...timestamps) }
        : null,
    };
  } catch (error) {
    logger.error('Failed to get transcript stats', { error, sessionId });
    throw error;
  }
}

/**
 * Internal helper: Map database row to SessionTranscript
 */
function mapRowToTranscript(row: any): SessionTranscript {
  return {
    id: row.id,
    sessionId: row.session_id,
    schoolId: row.school_id,
    entries: typeof row.entries === 'string' ? JSON.parse(row.entries) : row.entries || [],
    plainText: row.plain_text,
    wordCount: row.word_count || 0,
    language: row.language,
    generatedAt: row.generated_at ? new Date(row.generated_at) : new Date(row.created_at || Date.now()),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export default {
  createTranscript,
  getTranscript,
  updateTranscript,
  appendToTranscript,
  searchTranscript,
  getTranscriptPlainText,
  deleteTranscript,
  getTranscriptStats,
};
