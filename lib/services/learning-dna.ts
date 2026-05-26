import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import {
  LearningDNARepository,
  type LearningDNA,
  type MistakeType,
  type PaceType,
  type PreferredStyle,
} from '@/lib/repositories/learning-dna';

const log = createLogger('LearningDNAService');

interface ResponseSignal {
  isCorrect: boolean;
  timeSpentSeconds?: number;
  retryCount?: number;
  skipped?: boolean;
}

export interface DiagnosticUpdateInput {
  studentId: string;
  schoolId: string;
  diagnosticScore: number;
  learningStyle?: string;
}

export interface SessionUpdateInput {
  studentId: string;
  schoolId: string;
  topicId?: string;
  score: number;
  maxScore: number;
  timeTakenSeconds: number;
  responses?: unknown[];
  source?: 'quiz' | 'session';
}

export interface LearningDNAInfluence {
  paceType: PaceType;
  preferredStyle: PreferredStyle;
  adaptiveDifficulty: number;
}

export class LearningDNAService {
  static async getLearningDNA(studentId: string): Promise<LearningDNA | null> {
    return LearningDNARepository.findByStudentId(studentId);
  }

  static async updateFromDiagnostic(input: DiagnosticUpdateInput): Promise<LearningDNA> {
    const style = normalizePreferredStyle(input.learningStyle);

    const paceScore = clamp(input.diagnosticScore, 0, 100);
    const attentionScore = clamp(45 + input.diagnosticScore * 0.35, 0, 100);

    await LearningDNARepository.addLearningPattern({
      studentId: input.studentId,
      schoolId: input.schoolId,
      source: 'diagnostic',
      paceScore,
      attentionScore,
      retryCount: 0,
    });

    await LearningDNARepository.addMistakePattern({
      studentId: input.studentId,
      schoolId: input.schoolId,
      source: 'diagnostic',
      wrongCount: input.diagnosticScore < 60 ? 2 : input.diagnosticScore < 80 ? 1 : 0,
      conceptualCount: input.diagnosticScore < 60 ? 2 : 0,
      carelessCount: 0,
      mixedCount: input.diagnosticScore >= 60 && input.diagnosticScore < 80 ? 1 : 0,
    });

    await LearningDNARepository.addLearningPreference({
      studentId: input.studentId,
      schoolId: input.schoolId,
      preferredStyle: style,
      confidence: 70,
      source: 'profile',
    });

    return this.recomputeDNA(input.studentId, input.schoolId);
  }

  static async updateFromSession(input: SessionUpdateInput): Promise<LearningDNA> {
    const signals = normalizeResponses(input.responses);
    const totalQuestions = signals.length || 1;
    const wrongCount = signals.filter((r) => !r.isCorrect).length;
    const retryCount = signals.reduce((sum, item) => sum + (item.retryCount || 0), 0);

    const avgTimePerQuestion = input.timeTakenSeconds / totalQuestions;
    const paceScore = clamp(120 - avgTimePerQuestion, 0, 100);

    const skippedCount = signals.filter((r) => r.skipped).length;
    const carelessCount = signals.filter(
      (r) => !r.isCorrect && (r.timeSpentSeconds || avgTimePerQuestion) < Math.max(avgTimePerQuestion * 0.6, 15)
    ).length;
    const conceptualCount = Math.max(0, wrongCount - carelessCount);
    const mixedCount = wrongCount > 0 && carelessCount > 0 && conceptualCount > 0 ? 1 : 0;

    const attentionPenalty = skippedCount * 6 + Math.max(0, retryCount - 2) * 4;
    const attentionScore = clamp(100 - attentionPenalty - Math.max(0, avgTimePerQuestion - 90) * 0.25, 0, 100);

    await LearningDNARepository.addLearningPattern({
      studentId: input.studentId,
      schoolId: input.schoolId,
      source: input.source || 'quiz',
      paceScore,
      attentionScore,
      retryCount,
    });

    await LearningDNARepository.addMistakePattern({
      studentId: input.studentId,
      schoolId: input.schoolId,
      topicId: input.topicId || null,
      source: input.source || 'quiz',
      wrongCount,
      conceptualCount,
      carelessCount,
      mixedCount,
    });

    const inferredStyle = inferStyleFromSignals(signals);
    if (inferredStyle) {
      await LearningDNARepository.addLearningPreference({
        studentId: input.studentId,
        schoolId: input.schoolId,
        preferredStyle: inferredStyle,
        confidence: 58,
        source: 'inferred',
      });
    }

    return this.recomputeDNA(input.studentId, input.schoolId);
  }

  static async getInfluenceForStudent(studentId: string, schoolId: string): Promise<LearningDNAInfluence> {
    const dna = (await LearningDNARepository.findByStudentId(studentId)) ||
      (await this.recomputeDNA(studentId, schoolId));

    return {
      paceType: dna.paceType,
      preferredStyle: dna.preferredStyle,
      adaptiveDifficulty: paceTypeToDifficulty(dna.paceType),
    };
  }

  private static async recomputeDNA(studentId: string, schoolId: string): Promise<LearningDNA> {
    const [patternStats, mistakeStats, latestPreference, recoveryRate] = await Promise.all([
      LearningDNARepository.getRecentPatternStats(studentId),
      LearningDNARepository.getRecentMistakeStats(studentId),
      LearningDNARepository.getLatestPreference(studentId),
      this.computeRecoveryRate(studentId),
    ]);

    const paceType = inferPaceType(patternStats.avgPaceScore);
    const mistakeType = inferMistakeType(mistakeStats);
    const preferredStyle = latestPreference?.preferredStyle || 'interactive';

    const dna = await LearningDNARepository.upsert({
      studentId,
      schoolId,
      paceType,
      mistakeType,
      preferredStyle,
      attentionSpanScore: clamp(patternStats.avgAttentionScore, 0, 100),
      recoveryRate,
    });

    return dna;
  }

  private static async computeRecoveryRate(studentId: string): Promise<number> {
    try {
      const attemptResult = await query(
        `SELECT score::float AS score, max_score::float AS max_score
         FROM quiz_attempts
         WHERE student_id = $1 AND score IS NOT NULL AND max_score IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT 6`,
        [studentId]
      );

      const normalized = attemptResult.rows
        .map((r: any) => {
          const max = Number(r.max_score || 0);
          const score = Number(r.score || 0);
          if (!max || max <= 0) return null;
          return (score / max) * 100;
        })
        .filter((v: number | null): v is number => v !== null)
        .reverse();

      if (normalized.length < 2) {
        return 50;
      }

      let improvements = 0;
      for (let i = 1; i < normalized.length; i += 1) {
        if (normalized[i] >= normalized[i - 1]) {
          improvements += 1;
        }
      }

      return clamp((improvements / (normalized.length - 1)) * 100, 0, 100);
    } catch (error) {
      log.error('Failed to compute recovery rate:', error);
      return 50;
    }
  }
}

function normalizeResponses(input: unknown[] | undefined): ResponseSignal[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((raw: any) => ({
    isCorrect: Boolean(raw?.is_correct ?? raw?.isCorrect),
    timeSpentSeconds: toNumber(raw?.time_spent_seconds ?? raw?.timeSpentSeconds),
    retryCount: Math.max(0, Math.round(toNumber(raw?.retry_count ?? raw?.retryCount) || 0)),
    skipped: Boolean(raw?.skipped),
  }));
}

function normalizePreferredStyle(value: string | undefined): PreferredStyle {
  if (!value) {
    return 'interactive';
  }

  const v = value.toLowerCase();
  if (v.includes('visual')) return 'visual';
  if (v.includes('story')) return 'story';
  if (v.includes('text') || v.includes('read')) return 'text';
  return 'interactive';
}

function inferPaceType(avgPaceScore: number): PaceType {
  if (avgPaceScore >= 70) return 'fast';
  if (avgPaceScore <= 40) return 'slow';
  return 'medium';
}

function inferMistakeType(stats: {
  wrongCount: number;
  conceptualCount: number;
  carelessCount: number;
  mixedCount: number;
}): MistakeType {
  if (stats.wrongCount === 0) {
    return 'mixed';
  }

  const conceptualRatio = stats.conceptualCount / stats.wrongCount;
  const carelessRatio = stats.carelessCount / stats.wrongCount;

  if (conceptualRatio >= 0.6) return 'conceptual';
  if (carelessRatio >= 0.6) return 'careless';
  return 'mixed';
}

function inferStyleFromSignals(signals: ResponseSignal[]): PreferredStyle | null {
  if (signals.length === 0) return null;

  const avgRetries =
    signals.reduce((sum, item) => sum + (item.retryCount || 0), 0) / Math.max(signals.length, 1);

  if (avgRetries >= 1.5) {
    return 'interactive';
  }

  const avgTime =
    signals.reduce((sum, item) => sum + (item.timeSpentSeconds || 0), 0) / Math.max(signals.length, 1);

  if (avgTime >= 90) {
    return 'story';
  }

  if (avgTime <= 30) {
    return 'text';
  }

  return null;
}

function paceTypeToDifficulty(paceType: PaceType): number {
  if (paceType === 'fast') return 1.15;
  if (paceType === 'slow') return 0.85;
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}
