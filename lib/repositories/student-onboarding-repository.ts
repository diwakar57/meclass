/**
 * Student Onboarding Repository
 * Data access layer for student onboarding workflow
 */

import { db } from '@/lib/db';
import type {
  StudentOnboarding,
  OnboardingStatus,
  DiagnosticTest,
  DiagnosticTestResponse,
} from '@/lib/models/course-models';

// ============================================================================
// STUDENT ONBOARDING REPOSITORY
// ============================================================================

export class StudentOnboardingRepository {
  /**
   * Create or get onboarding record
   */
  static async getOrCreateOnboarding(studentId: string, schoolId: string): Promise<StudentOnboarding> {
    // Try to get existing
    let query = `
      SELECT * FROM student_onboardings
      WHERE student_id = $1 AND school_id = $2
    `;

    let result = await db.query(query, [studentId, schoolId]);

    // If exists, return it
    if (result.rows.length > 0) {
      return this.formatOnboarding(result.rows[0]);
    }

    // Create new
    query = `
      INSERT INTO student_onboardings (
        student_id, school_id, current_step, completed_steps, status
      ) VALUES ($1, $2, 1, '[]', 'in_progress')
      RETURNING *
    `;

    result = await db.query(query, [studentId, schoolId]);
    return this.formatOnboarding(result.rows[0]);
  }

  /**
   * Get onboarding record
   */
  static async getOnboarding(studentId: string, schoolId: string): Promise<StudentOnboarding | null> {
    const query = `
      SELECT * FROM student_onboardings
      WHERE student_id = $1 AND school_id = $2
    `;

    const result = await db.query(query, [studentId, schoolId]);
    return result.rows.length > 0 ? this.formatOnboarding(result.rows[0]) : null;
  }

  /**
   * Update onboarding step
   */
  static async updateStep(
    studentId: string,
    schoolId: string,
    stepData: {
      currentStep: number;
      completedSteps?: number[];
      currentGrade?: string;
      previousGrade?: string;
      selfAssessment?: any;
      diagnosticTestId?: string;
      diagnosticScore?: number;
      learningDnaId?: string;
      learningPlanId?: string;
      diagnosticCompletedAt?: Date;
    }
  ): Promise<StudentOnboarding> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    updates.push(`current_step = $${paramCount++}`);
    params.push(stepData.currentStep);

    if (stepData.completedSteps) {
      updates.push(`completed_steps = $${paramCount++}`);
      params.push(JSON.stringify(stepData.completedSteps));
    }

    if (stepData.currentGrade) {
      updates.push(`current_grade = $${paramCount++}`);
      params.push(stepData.currentGrade);
    }

    if (stepData.previousGrade) {
      updates.push(`previous_grade = $${paramCount++}`);
      params.push(stepData.previousGrade);
    }

    if (stepData.selfAssessment) {
      updates.push(`self_assessment = $${paramCount++}`);
      params.push(JSON.stringify(stepData.selfAssessment));
    }

    if (stepData.diagnosticTestId) {
      updates.push(`diagnostic_test_id = $${paramCount++}`);
      params.push(stepData.diagnosticTestId);
    }

    if (stepData.diagnosticScore !== undefined) {
      updates.push(`diagnostic_score = $${paramCount++}`);
      params.push(stepData.diagnosticScore);
    }

    if (stepData.diagnosticCompletedAt) {
      updates.push(`diagnostic_completed_at = $${paramCount++}`);
      params.push(stepData.diagnosticCompletedAt);
    }

    if (stepData.learningDnaId) {
      updates.push(`learning_dna_id = $${paramCount++}`);
      params.push(stepData.learningDnaId);
    }

    if (stepData.learningPlanId) {
      updates.push(`learning_plan_id = $${paramCount++}`);
      params.push(stepData.learningPlanId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(studentId, schoolId);

    const query = `
      UPDATE student_onboardings
      SET ${updates.join(', ')}
      WHERE student_id = $${paramCount + 1} AND school_id = $${paramCount + 2}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return this.formatOnboarding(result.rows[0]);
  }

  /**
   * Complete onboarding
   */
  static async completeOnboarding(studentId: string, schoolId: string): Promise<StudentOnboarding> {
    const query = `
      UPDATE student_onboardings
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE student_id = $1 AND school_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [studentId, schoolId]);
    return this.formatOnboarding(result.rows[0]);
  }

  private static formatOnboarding(row: any): StudentOnboarding {
    const parseJson = <T,>(value: unknown, fallback: T): T => {
      if (value === null || value === undefined) return fallback;
      if (typeof value === 'object') return value as T;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    return {
      id: row.id,
      studentId: row.student_id,
      schoolId: row.school_id,
      currentStep: row.current_step,
      completedSteps: parseJson(row.completed_steps, []),
      currentGrade: row.current_grade,
      previousGrade: row.previous_grade,
      selfAssessment: row.self_assessment ? parseJson(row.self_assessment, undefined) : undefined,
      diagnosticTestId: row.diagnostic_test_id,
      diagnosticScore: row.diagnostic_score,
      diagnosticCompletedAt: row.diagnostic_completed_at ? new Date(row.diagnostic_completed_at) : undefined,
      learningDnaId: row.learning_dna_id,
      learningPlanId: row.learning_plan_id,
      status: row.status,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// ============================================================================
// DIAGNOSTIC TEST REPOSITORY
// ============================================================================

export class DiagnosticTestRepository {
  /**
   * Create diagnostic test
   */
  static async createTest(data: {
    studentId: string;
    schoolId: string;
    previousGradeId: string;
    sourceGrade: string;
    questions: any[];
  }): Promise<DiagnosticTest> {
    const gradeLevel = Number.parseInt(String(data.sourceGrade), 10);

    const query = `
      INSERT INTO diagnostic_tests (
        student_id, school_id, previous_grade_id, source_grade, grade_level,
        questions, status, name, type
      ) VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7, 'diagnostic')
      RETURNING *
    `;

    const result = await db.query(query, [
      data.studentId,
      data.schoolId,
      data.previousGradeId,
      data.sourceGrade,
      Number.isFinite(gradeLevel) ? gradeLevel : null,
      JSON.stringify(data.questions),
      `Diagnostic Test - Grade ${data.sourceGrade}`,
    ]);

    return this.formatTest(result.rows[0]);
  }

  /**
   * Get test by ID
   */
  static async getTest(testId: string): Promise<DiagnosticTest | null> {
    const query = `SELECT * FROM diagnostic_tests WHERE id = $1`;
    const result = await db.query(query, [testId]);
    return result.rows.length > 0 ? this.formatTest(result.rows[0]) : null;
  }

  /**
   * Submit test responses
   */
  static async submitResponses(
    testId: string,
    responses: DiagnosticTestResponse[],
    analysis: any
  ): Promise<DiagnosticTest> {
    const query = `
      UPDATE diagnostic_tests
      SET
        student_responses = $1,
        analysis_result = $2,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, [
      JSON.stringify(responses),
      JSON.stringify(analysis),
      testId,
    ]);

    return this.formatTest(result.rows[0]);
  }

  private static formatTest(row: any): DiagnosticTest {
    const parseJson = <T,>(value: unknown, fallback: T): T => {
      if (value === null || value === undefined) return fallback;
      if (typeof value === 'object') return value as T;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    return {
      id: row.id,
      studentId: row.student_id,
      schoolId: row.school_id,
      previousGradeId: row.previous_grade_id,
      sourceGrade: row.source_grade,
      questions: parseJson(row.questions, []),
      studentResponses: row.student_responses ? parseJson(row.student_responses, []) : undefined,
      analysisResult: row.analysis_result ? parseJson(row.analysis_result, undefined) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      tookTime: row.took_time,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
