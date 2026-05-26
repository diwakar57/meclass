/**
 * Student Onboarding Service
 * Manages the multi-step onboarding workflow for new students
 */

import { db } from '@/lib/db';
import { StudentOnboardingRepository, DiagnosticTestRepository } from '@/lib/repositories/student-onboarding-repository';
import type { StudentOnboarding, OnboardingStep } from '@/lib/models/course-models';

export class StudentOnboardingService {
  /**
   * Get or create onboarding for student
   */
  static async getOrCreateOnboarding(
    studentId: string,
    schoolId: string
  ): Promise<StudentOnboarding> {
    return StudentOnboardingRepository.getOrCreateOnboarding(studentId, schoolId);
  }

  /**
   * Complete step 1: Self-assessment
   */
  static async completeStep1(
    studentId: string,
    schoolId: string,
    data: {
      currentGrade: string;
      previousGrade: string;
      selfAssessment: {
        strengths: string[];
        weaknesses: string[];
        confidenceScore: number;
      };
    }
  ): Promise<StudentOnboarding> {
    if (!data.currentGrade || !data.previousGrade) {
      throw new Error('Current grade and previous grade are required');
    }

    if (data.selfAssessment.confidenceScore < 0 || data.selfAssessment.confidenceScore > 100) {
      throw new Error('Confidence score must be between 0 and 100');
    }

    const onboarding = await StudentOnboardingRepository.getOrCreateOnboarding(
      studentId,
      schoolId
    );

    const completedSteps = new Set(onboarding.completedSteps);
    completedSteps.add(1);

    return StudentOnboardingRepository.updateStep(studentId, schoolId, {
      currentStep: 2,
      completedSteps: Array.from(completedSteps),
      currentGrade: data.currentGrade,
      previousGrade: data.previousGrade,
      selfAssessment: data.selfAssessment,
    });
  }

  /**
   * Get diagnostic test for student
   */
  static async getDiagnosticTest(
    testId: string
  ): Promise<{
    id: string;
    questions: Array<{
      id: string;
      text: string;
      options: string[];
    }>;
  } | null> {
    const test = await DiagnosticTestRepository.getTest(testId);
    if (!test) return null;

    return {
      id: test.id,
      questions: test.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
      })),
    };
  }

  /**
   * Complete step 2: Submit diagnostic test
   */
  static async completeDiagnosticTest(
    studentId: string,
    schoolId: string,
    testId: string,
    responses: Array<{
      questionId: string;
      selectedOptionIndex: number;
      responseTime: number;
    }>
  ): Promise<{
    onboarding: StudentOnboarding;
    score: number;
    weakAreas: string[];
  }> {
    const test = await DiagnosticTestRepository.getTest(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    // Score the test
    let correctAnswers = 0;
    let totalQuestions = 0;
    const topicScores: Record<string, { correct: number; total: number }> = {};

    // Initialize topic tracking
    test.questions.forEach((q) => {
      if (!topicScores[q.topic]) {
        topicScores[q.topic] = { correct: 0, total: 0 };
      }
    });

    // Score responses
    const evaluatedResponses = responses.map((response) => {
      const question = test.questions.find((q) => q.id === response.questionId);
      const isCorrect =
        !!question && response.selectedOptionIndex === question.correctOptionIndex;

      return {
        ...response,
        isCorrect,
      };
    });

    responses.forEach((response) => {
      const question = test.questions.find((q) => q.id === response.questionId);
      if (question) {
        totalQuestions++;
        topicScores[question.topic].total++;

        if (response.selectedOptionIndex === question.correctOptionIndex) {
          correctAnswers++;
          topicScores[question.topic].correct++;
        }
      }
    });

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Identify weak areas
    const weakAreas: string[] = [];
    Object.entries(topicScores).forEach(([topic, scores]) => {
      const percentage = scores.total > 0 ? (scores.correct / scores.total) * 100 : 0;
      if (percentage < 70) {
        weakAreas.push(topic);
      }
    });

    // Save test responses and score
    const analysis = {
      totalQuestions,
      correctAnswers,
      score,
      topicScores: Object.entries(topicScores).reduce(
        (acc, [topic, scores]) => {
          acc[topic] = scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0;
          return acc;
        },
        {} as Record<string, number>
      ),
      weakAreas,
    };

    await DiagnosticTestRepository.submitResponses(testId, evaluatedResponses, analysis);

    // Update onboarding
    const onboarding = await StudentOnboardingRepository.updateStep(
      studentId,
      schoolId,
      {
        currentStep: 3,
        completedSteps: [1, 2],
        diagnosticTestId: testId,
        diagnosticScore: score,
        diagnosticCompletedAt: new Date(),
      }
    );

    return {
      onboarding,
      score,
      weakAreas,
    };
  }

  /**
   * Complete step 3-4: Generate learning DNA and plan
   */
  static async completeOnboarding(
    studentId: string,
    schoolId: string
  ): Promise<StudentOnboarding> {
    const onboarding = await StudentOnboardingRepository.getOrCreateOnboarding(
      studentId,
      schoolId
    );

    if (!onboarding.selfAssessment || !onboarding.diagnosticScore) {
      throw new Error('Must complete steps 1 and 2 before completing onboarding');
    }

    // Determine learning DNA from diagnostic test + self-assessment
    const learningDnaId = await this.generateLearningDNA(
      studentId,
      schoolId,
      onboarding
    );

    // Create completed onboarding
    const updated = await StudentOnboardingRepository.updateStep(studentId, schoolId, {
      currentStep: 5,
      completedSteps: [1, 2, 3, 4, 5],
      learningDnaId,
    });

    return StudentOnboardingRepository.completeOnboarding(studentId, schoolId).catch(() => updated);
  }

  /**
   * Generate learning DNA from diagnostic test + self-assessment
   */
  private static async generateLearningDNA(
    studentId: string,
    schoolId: string,
    onboarding: StudentOnboarding
  ): Promise<string> {
    // Analyze confidence alignment
    const reportedConfidence = onboarding.selfAssessment?.confidenceScore || 50;
    const diagnosticScore = onboarding.diagnosticScore || 0;
    
    let confidenceAlignment = 'aligned';
    if (diagnosticScore < reportedConfidence - 15) {
      confidenceAlignment = 'overestimated';
    } else if (diagnosticScore > reportedConfidence + 15) {
      confidenceAlignment = 'underestimated';
    }

    // Determine pace type (placeholder logic)
    const paceType = diagnosticScore > 80 ? 'fast' : diagnosticScore > 50 ? 'medium' : 'slow';

    // Determine mistake type (from self-assessment weak areas)
    const weaknesses = onboarding.selfAssessment?.weaknesses || [];
    const mistakeType =
      weaknesses.some((w) => w.toLowerCase().includes('understanding')) ||
      weaknesses.some((w) => w.toLowerCase().includes('concept'))
        ? 'conceptual'
        : 'careless';

    // Determine preferred style (placeholder - could be enhanced with more assessment)
    const preferredStyle = 'visual'; // Default, could be from quiz or user preference

    // Determine recommended teaching style
    const teachingStyle =
      paceType === 'slow'
        ? 'friendly_tutor'
        : paceType === 'fast'
          ? 'socratic'
          : 'storyteller';

    // Identify remediation topics
    const remediationNeeded: Array<{
      topicId: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }> = []; // Populated from weak areas in diagnostic test

    // Store learning DNA in database
    const query = `
      INSERT INTO learning_dna (
        student_id, school_id, generation_method,
        diagnostic_confidence, reported_confidence, confidence_alignment,
        learning_profile, remediation_needed, generated_at, version
      ) VALUES ($1, $2, 'diagnostic', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, 1)
      RETURNING id
    `;

    const learningProfile = {
      paceType,
      mistakeType,
      preferredStyle,
      recommendedTeachingStyle: teachingStyle,
    };

    const result = await db.query(query, [
      studentId,
      schoolId,
      diagnosticScore,
      reportedConfidence,
      confidenceAlignment,
      JSON.stringify(learningProfile),
      JSON.stringify(remediationNeeded),
    ]);

    return result.rows[0].id;
  }

  /**
   * Check if student needs onboarding
   */
  static async needsOnboarding(
    studentId: string,
    schoolId: string
  ): Promise<boolean> {
    const onboarding = await StudentOnboardingRepository.getOnboarding(
      studentId,
      schoolId
    );

    return !onboarding || onboarding.status === 'in_progress';
  }

  /**
   * Get onboarding progress
   */
  static async getOnboardingProgress(
    studentId: string,
    schoolId: string
  ): Promise<{
    completed: boolean;
    currentStep: number;
    completedSteps: number[];
  }> {
    const onboarding = await StudentOnboardingRepository.getOrCreateOnboarding(
      studentId,
      schoolId
    );

    return {
      completed: onboarding.status === 'completed',
      currentStep: onboarding.currentStep,
      completedSteps: onboarding.completedSteps,
    };
  }
}
