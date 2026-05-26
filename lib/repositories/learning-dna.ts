import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('LearningDNARepository');

export type PaceType = 'fast' | 'medium' | 'slow';
export type MistakeType = 'conceptual' | 'careless' | 'mixed';
export type PreferredStyle = 'visual' | 'text' | 'interactive' | 'story';

export interface LearningDNA {
  id: string;
  studentId: string;
  schoolId: string;
  paceType: PaceType;
  mistakeType: MistakeType;
  preferredStyle: PreferredStyle;
  attentionSpanScore: number;
  recoveryRate: number;
  lastUpdated: Date;
  createdAt: Date;
}

export interface UpsertLearningDNAInput {
  studentId: string;
  schoolId: string;
  paceType: PaceType;
  mistakeType: MistakeType;
  preferredStyle: PreferredStyle;
  attentionSpanScore: number;
  recoveryRate: number;
}

export interface LearningPatternInput {
  studentId: string;
  schoolId: string;
  source: 'diagnostic' | 'quiz' | 'session';
  paceScore: number;
  attentionScore: number;
  retryCount: number;
  observedAt?: Date;
}

export interface MistakePatternInput {
  studentId: string;
  schoolId: string;
  source: 'diagnostic' | 'quiz' | 'session';
  topicId?: string | null;
  wrongCount: number;
  conceptualCount: number;
  carelessCount: number;
  mixedCount: number;
  observedAt?: Date;
}

export interface LearningPreferenceInput {
  studentId: string;
  schoolId: string;
  preferredStyle: PreferredStyle;
  confidence: number;
  source: 'profile' | 'inferred' | 'manual';
}

let tablesEnsured = false;

export class LearningDNARepository {
  static async ensureTables(): Promise<void> {
    if (tablesEnsured) {
      return;
    }

    try {
      await query(`
        CREATE TABLE IF NOT EXISTS learning_dna (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          pace_type VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (pace_type IN ('fast', 'medium', 'slow')),
          mistake_type VARCHAR(20) NOT NULL DEFAULT 'mixed' CHECK (mistake_type IN ('conceptual', 'careless', 'mixed')),
          preferred_style VARCHAR(20) NOT NULL DEFAULT 'interactive' CHECK (preferred_style IN ('visual', 'text', 'interactive', 'story')),
          attention_span_score DECIMAL(5,2) NOT NULL DEFAULT 50,
          recovery_rate DECIMAL(5,2) NOT NULL DEFAULT 50,
          last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(
        'CREATE INDEX IF NOT EXISTS idx_learning_dna_school_id ON learning_dna(school_id)'
      );

      await query(`
        CREATE TABLE IF NOT EXISTS learning_patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          source VARCHAR(20) NOT NULL CHECK (source IN ('diagnostic', 'quiz', 'session')),
          pace_score DECIMAL(6,2) NOT NULL DEFAULT 50,
          attention_score DECIMAL(6,2) NOT NULL DEFAULT 50,
          retry_count INTEGER NOT NULL DEFAULT 0,
          observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(
        'CREATE INDEX IF NOT EXISTS idx_learning_patterns_student_observed ON learning_patterns(student_id, observed_at DESC)'
      );

      await query(`
        CREATE TABLE IF NOT EXISTS mistake_patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
          source VARCHAR(20) NOT NULL CHECK (source IN ('diagnostic', 'quiz', 'session')),
          wrong_count INTEGER NOT NULL DEFAULT 0,
          conceptual_count INTEGER NOT NULL DEFAULT 0,
          careless_count INTEGER NOT NULL DEFAULT 0,
          mixed_count INTEGER NOT NULL DEFAULT 0,
          observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(
        'CREATE INDEX IF NOT EXISTS idx_mistake_patterns_student_observed ON mistake_patterns(student_id, observed_at DESC)'
      );

      await query(`
        CREATE TABLE IF NOT EXISTS learning_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          preferred_style VARCHAR(20) NOT NULL CHECK (preferred_style IN ('visual', 'text', 'interactive', 'story')),
          confidence DECIMAL(5,2) NOT NULL DEFAULT 50,
          source VARCHAR(20) NOT NULL CHECK (source IN ('profile', 'inferred', 'manual')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(
        'CREATE INDEX IF NOT EXISTS idx_learning_preferences_student_created ON learning_preferences(student_id, created_at DESC)'
      );

      tablesEnsured = true;
    } catch (error) {
      log.error('Failed to ensure Learning DNA tables:', error);
      throw error;
    }
  }

  static async findByStudentId(studentId: string): Promise<LearningDNA | null> {
    await this.ensureTables();

    const result = await query(
      `SELECT id, student_id, school_id, pace_type, mistake_type, preferred_style,
              attention_span_score, recovery_rate, last_updated, created_at, updated_at
       FROM learning_dna
       WHERE student_id = $1`,
      [studentId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.rowToLearningDNA(result.rows[0]);
  }

  static async upsert(input: UpsertLearningDNAInput): Promise<LearningDNA> {
    await this.ensureTables();

    const result = await query(
      `INSERT INTO learning_dna (
         student_id, school_id, pace_type, mistake_type, preferred_style,
         attention_span_score, recovery_rate, last_updated, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id)
       DO UPDATE SET
         school_id = EXCLUDED.school_id,
         pace_type = EXCLUDED.pace_type,
         mistake_type = EXCLUDED.mistake_type,
         preferred_style = EXCLUDED.preferred_style,
         attention_span_score = EXCLUDED.attention_span_score,
         recovery_rate = EXCLUDED.recovery_rate,
         last_updated = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, student_id, school_id, pace_type, mistake_type, preferred_style,
                 attention_span_score, recovery_rate, last_updated, created_at, updated_at`,
      [
        input.studentId,
        input.schoolId,
        input.paceType,
        input.mistakeType,
        input.preferredStyle,
        input.attentionSpanScore,
        input.recoveryRate,
      ]
    );

    return this.rowToLearningDNA(result.rows[0]);
  }

  static async addLearningPattern(input: LearningPatternInput): Promise<void> {
    await this.ensureTables();

    await query(
      `INSERT INTO learning_patterns
       (student_id, school_id, source, pace_score, attention_score, retry_count, observed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.studentId,
        input.schoolId,
        input.source,
        input.paceScore,
        input.attentionScore,
        input.retryCount,
        input.observedAt || new Date(),
      ]
    );
  }

  static async addMistakePattern(input: MistakePatternInput): Promise<void> {
    await this.ensureTables();

    await query(
      `INSERT INTO mistake_patterns
       (student_id, school_id, topic_id, source, wrong_count, conceptual_count, careless_count, mixed_count, observed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        input.studentId,
        input.schoolId,
        input.topicId || null,
        input.source,
        input.wrongCount,
        input.conceptualCount,
        input.carelessCount,
        input.mixedCount,
        input.observedAt || new Date(),
      ]
    );
  }

  static async addLearningPreference(input: LearningPreferenceInput): Promise<void> {
    await this.ensureTables();

    await query(
      `INSERT INTO learning_preferences
       (student_id, school_id, preferred_style, confidence, source)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.studentId, input.schoolId, input.preferredStyle, input.confidence, input.source]
    );
  }

  static async getRecentPatternStats(studentId: string, lookback = 12): Promise<{
    avgPaceScore: number;
    avgAttentionScore: number;
    avgRetryCount: number;
  }> {
    await this.ensureTables();

    const result = await query(
      `SELECT
         COALESCE(AVG(pace_score), 50)::float AS avg_pace_score,
         COALESCE(AVG(attention_score), 50)::float AS avg_attention_score,
         COALESCE(AVG(retry_count), 0)::float AS avg_retry_count
       FROM (
         SELECT pace_score, attention_score, retry_count
         FROM learning_patterns
         WHERE student_id = $1
         ORDER BY observed_at DESC
         LIMIT $2
       ) p`,
      [studentId, lookback]
    );

    const row = result.rows[0] || {};
    return {
      avgPaceScore: Number(row.avg_pace_score || 50),
      avgAttentionScore: Number(row.avg_attention_score || 50),
      avgRetryCount: Number(row.avg_retry_count || 0),
    };
  }

  static async getRecentMistakeStats(studentId: string, lookback = 12): Promise<{
    wrongCount: number;
    conceptualCount: number;
    carelessCount: number;
    mixedCount: number;
  }> {
    await this.ensureTables();

    const result = await query(
      `SELECT
         COALESCE(SUM(wrong_count), 0)::int AS wrong_count,
         COALESCE(SUM(conceptual_count), 0)::int AS conceptual_count,
         COALESCE(SUM(careless_count), 0)::int AS careless_count,
         COALESCE(SUM(mixed_count), 0)::int AS mixed_count
       FROM (
         SELECT wrong_count, conceptual_count, careless_count, mixed_count
         FROM mistake_patterns
         WHERE student_id = $1
         ORDER BY observed_at DESC
         LIMIT $2
       ) m`,
      [studentId, lookback]
    );

    const row = result.rows[0] || {};
    return {
      wrongCount: Number(row.wrong_count || 0),
      conceptualCount: Number(row.conceptual_count || 0),
      carelessCount: Number(row.careless_count || 0),
      mixedCount: Number(row.mixed_count || 0),
    };
  }

  static async getLatestPreference(studentId: string): Promise<{
    preferredStyle: PreferredStyle;
    confidence: number;
  } | null> {
    await this.ensureTables();

    const result = await query(
      `SELECT preferred_style, confidence
       FROM learning_preferences
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return {
      preferredStyle: result.rows[0].preferred_style as PreferredStyle,
      confidence: Number(result.rows[0].confidence || 50),
    };
  }

  private static rowToLearningDNA(row: any): LearningDNA {
    return {
      id: row.id,
      studentId: row.student_id,
      schoolId: row.school_id,
      paceType: row.pace_type,
      mistakeType: row.mistake_type,
      preferredStyle: row.preferred_style,
      attentionSpanScore: Number(row.attention_span_score || 0),
      recoveryRate: Number(row.recovery_rate || 0),
      lastUpdated: row.last_updated,
      createdAt: row.created_at,
    };
  }
}
