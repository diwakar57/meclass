/**
 * OfflineSyncService
 *
 * Server-side handler for syncing data uploaded by clients
 * that were operating in offline mode.
 *
 * Conflict resolution strategy: "last-write-wins" based on client_timestamp.
 * Partial-sync support: each record is processed independently.
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OfflineSyncService');

// ─── Types ──────────────────────────────────────────────────────────────────

export type OfflineRecordType =
  | 'quiz_answer'
  | 'progress_update'
  | 'assignment_submission'
  | 'note';

export interface OfflineRecord {
  client_id: string;         // UUID generated client-side
  type: OfflineRecordType;
  entity_id: string;         // e.g. quiz_id, assignment_id
  user_id: string;
  school_id: string;
  payload: Record<string, unknown>;
  client_timestamp: string;  // ISO-8601
}

export interface SyncResult {
  client_id: string;
  status: 'synced' | 'conflict' | 'error';
  server_timestamp?: string;
  error?: string;
}

export interface SyncReport {
  total: number;
  synced: number;
  conflicts: number;
  errors: number;
  results: SyncResult[];
}

// ─── Service ────────────────────────────────────────────────────────────────

export class OfflineSyncService {
  /**
   * Process a batch of offline records from a client.
   * Returns a per-record result to allow partial success.
   */
  static async syncBatch(
    records: OfflineRecord[],
    requestingUserId: string,
  ): Promise<SyncReport> {
    const results: SyncResult[] = [];

    for (const record of records) {
      // Security: users may only sync their own records
      if (record.user_id !== requestingUserId) {
        results.push({
          client_id: record.client_id,
          status: 'error',
          error: 'User ID mismatch — unauthorized record',
        });
        continue;
      }

      try {
        const result = await this.processSingleRecord(record);
        results.push(result);
      } catch (err) {
        logger.error('Failed to sync record', { clientId: record.client_id, err });
        results.push({
          client_id: record.client_id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const synced = results.filter((r) => r.status === 'synced').length;
    const conflicts = results.filter((r) => r.status === 'conflict').length;
    const errors = results.filter((r) => r.status === 'error').length;

    logger.info('Sync batch complete', { total: records.length, synced, conflicts, errors });

    return {
      total: records.length,
      synced,
      conflicts,
      errors,
      results,
    };
  }

  /**
   * Process a single offline record — upsert into offline_sync_log
   * then dispatch to the appropriate domain table.
   */
  private static async processSingleRecord(record: OfflineRecord): Promise<SyncResult> {
    // Check if already synced (idempotency via client_id)
    const existing = await query<{ client_timestamp: string; synced_at: string }>(
      `SELECT client_timestamp, synced_at
       FROM offline_sync_log
       WHERE client_id = $1`,
      [record.client_id],
    );

    if (existing.rows[0]) {
      // Already synced — return conflict only if client timestamp is older
      const serverTs = new Date(existing.rows[0].client_timestamp).getTime();
      const clientTs = new Date(record.client_timestamp).getTime();

      if (clientTs <= serverTs) {
        return {
          client_id: record.client_id,
          status: 'conflict',
          server_timestamp: existing.rows[0].synced_at,
        };
      }
      // Client is newer — allow overwrite (last-write-wins)
    }

    // Dispatch to domain handler
    await this.dispatchRecord(record);

    // Log the sync
    await query(
      `INSERT INTO offline_sync_log
         (client_id, type, entity_id, user_id, school_id, payload, client_timestamp, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (client_id) DO UPDATE
         SET payload = $6, client_timestamp = $7, synced_at = NOW()`,
      [
        record.client_id,
        record.type,
        record.entity_id,
        record.user_id,
        record.school_id,
        JSON.stringify(record.payload),
        record.client_timestamp,
      ],
    );

    return {
      client_id: record.client_id,
      status: 'synced',
      server_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Dispatch a record to its domain handler.
   */
  private static async dispatchRecord(record: OfflineRecord): Promise<void> {
    switch (record.type) {
      case 'quiz_answer':
        await this.syncQuizAnswer(record);
        break;
      case 'progress_update':
        await this.syncProgressUpdate(record);
        break;
      case 'assignment_submission':
        await this.syncAssignmentSubmission(record);
        break;
      case 'note':
        await this.syncNote(record);
        break;
      default:
        logger.warn('Unknown offline record type', { type: record.type });
    }
  }

  private static async syncQuizAnswer(record: OfflineRecord): Promise<void> {
    const { quiz_id, answers, score } = record.payload as {
      quiz_id: string;
      answers: unknown[];
      score: number;
    };
    await query(
      `INSERT INTO quiz_attempts (quiz_id, student_id, school_id, answers, score, submitted_at, is_offline_sync)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT (quiz_id, student_id) DO UPDATE
         SET answers = $4, score = $5, submitted_at = $6`,
      [
        quiz_id ?? record.entity_id,
        record.user_id,
        record.school_id,
        JSON.stringify(answers ?? []),
        score ?? 0,
        record.client_timestamp,
      ],
    );
  }

  private static async syncProgressUpdate(record: OfflineRecord): Promise<void> {
    const { course_id, topic_id, progress_pct, time_spent_seconds } = record.payload as {
      course_id: string;
      topic_id: string | null;
      progress_pct: number;
      time_spent_seconds: number;
    };
    await query(
      `INSERT INTO student_progress (student_id, school_id, course_id, topic_id, progress_pct, time_spent_seconds, last_updated)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (student_id, course_id, topic_id) DO UPDATE
         SET progress_pct = GREATEST(student_progress.progress_pct, $5),
             time_spent_seconds = student_progress.time_spent_seconds + $6,
             last_updated = $7`,
      [
        record.user_id,
        record.school_id,
        course_id ?? record.entity_id,
        topic_id ?? null,
        Math.min(progress_pct ?? 0, 100),
        time_spent_seconds ?? 0,
        record.client_timestamp,
      ],
    );
  }

  private static async syncAssignmentSubmission(record: OfflineRecord): Promise<void> {
    const { content, file_url } = record.payload as {
      content: string;
      file_url: string | null;
    };
    await query(
      `INSERT INTO assignment_submissions
         (assignment_id, student_id, school_id, content, file_url, submitted_at, is_offline_sync)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT (assignment_id, student_id) DO UPDATE
         SET content = $4, file_url = $5, submitted_at = $6`,
      [
        record.entity_id,
        record.user_id,
        record.school_id,
        content ?? '',
        file_url ?? null,
        record.client_timestamp,
      ],
    );
  }

  private static async syncNote(record: OfflineRecord): Promise<void> {
    const { content, course_id } = record.payload as {
      content: string;
      course_id: string;
    };
    await query(
      `INSERT INTO student_notes (id, student_id, school_id, course_id, content, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE
         SET content = $5, updated_at = $6`,
      [
        record.entity_id,
        record.user_id,
        record.school_id,
        course_id ?? null,
        content ?? '',
        record.client_timestamp,
      ],
    );
  }

  /**
   * Return the server state for a student (for delta sync on reconnect).
   * The client uses this to determine what data to download.
   */
  static async getStudentSyncState(studentId: string, schoolId: string) {
    const [progress, syncLog] = await Promise.all([
      query<{ course_id: string; topic_id: string | null; progress_pct: number; last_updated: string }>(
        `SELECT course_id, topic_id, progress_pct, last_updated
         FROM student_progress
         WHERE student_id = $1 AND school_id = $2`,
        [studentId, schoolId],
      ),
      query<{ client_id: string; type: string; synced_at: string }>(
        `SELECT client_id, type, synced_at
         FROM offline_sync_log
         WHERE user_id = $1 AND school_id = $2
         ORDER BY synced_at DESC LIMIT 200`,
        [studentId, schoolId],
      ),
    ]);

    return {
      progress: progress.rows,
      recentSyncs: syncLog.rows,
      serverTimestamp: new Date().toISOString(),
    };
  }
}
