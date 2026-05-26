/**
 * GET /api/students/onboarding/diagnostic-test
 * POST /api/students/onboarding/diagnostic-test/submit
 * Student onboarding step 2: Diagnostic test
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { StudentOnboardingService } from '@/lib/services/student-onboarding-service';
import { DiagnosticTestRepository, StudentOnboardingRepository } from '@/lib/repositories/student-onboarding-repository';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

interface GeneratedQuestion {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  topic: string;
  difficulty: number;
}

async function generateDiagnosticTestForStudent(studentId: string, schoolId: string, previousGrade: string) {
  const topicRows = await query(
    `SELECT id, title
     FROM topics
     WHERE school_id = $1 AND ($2 = '' OR grade_level = $2)
     ORDER BY order_index ASC NULLS LAST, created_at ASC
     LIMIT 8`,
    [schoolId, previousGrade]
  );

  const fallbackTopics = [
    'Number Sense',
    'Basic Algebra',
    'Geometry',
    'Fractions',
    'Measurement',
  ];

  const sourceTopics =
    topicRows.rows.length > 0
      ? topicRows.rows.map((row: any) => String(row.title || 'Topic'))
      : fallbackTopics;

  const questions: GeneratedQuestion[] = sourceTopics.map((topic: string, idx: number) => ({
    id: `q-${idx + 1}`,
    text: `Which statement best describes your understanding of ${topic}?`,
    options: [
      `I can solve ${topic} confidently`,
      `I can solve basic ${topic} questions`,
      `I need guided practice in ${topic}`,
      `I am not comfortable with ${topic} yet`,
    ],
    correctOptionIndex: 1,
    topic,
    difficulty: 4 + (idx % 3),
  }));

  const test = await DiagnosticTestRepository.createTest({
    studentId,
    schoolId,
    previousGradeId: previousGrade || 'previous-grade',
    sourceGrade: previousGrade || 'previous-grade',
    questions,
  });

  return test;
}

/**
 * GET - Get diagnostic test questions
 */
export const GET = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    // Get onboarding record to get test ID
    const onboarding = await StudentOnboardingRepository.getOrCreateOnboarding(auth.userId, auth.schoolId);

    let diagnosticTestId = onboarding.diagnosticTestId;

    if (!diagnosticTestId) {
      if (!onboarding.previousGrade) {
        return NextResponse.json(
          { error: 'Complete onboarding step 1 before loading diagnostic test' },
          { status: 400 }
        );
      }

      const generated = await generateDiagnosticTestForStudent(
        auth.userId,
        auth.schoolId,
        onboarding.previousGrade
      );

      diagnosticTestId = generated.id;
      await StudentOnboardingRepository.updateStep(auth.userId, auth.schoolId, {
        currentStep: 2,
        completedSteps: Array.from(new Set([...(onboarding.completedSteps || []), 1])),
        diagnosticTestId,
      });
    }

    const test = await StudentOnboardingService.getDiagnosticTest(diagnosticTestId);

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      test: {
        id: test.id,
        questions: test.questions,
      },
    });
  } catch (error: any) {
    console.error('Get diagnostic test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

/**
 * POST - Generate diagnostic test from onboarding step 1 data
 */
export const POST = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
  }

  const onboarding = await StudentOnboardingRepository.getOrCreateOnboarding(auth.userId, auth.schoolId);
  if (!onboarding.previousGrade) {
    return NextResponse.json(
      { error: 'Complete step 1 before generating a diagnostic test' },
      { status: 400 }
    );
  }

  const test = await generateDiagnosticTestForStudent(auth.userId, auth.schoolId, onboarding.previousGrade);
  const updated = await StudentOnboardingRepository.updateStep(auth.userId, auth.schoolId, {
    currentStep: 2,
    completedSteps: Array.from(new Set([...(onboarding.completedSteps || []), 1])),
    diagnosticTestId: test.id,
  });

  return NextResponse.json({
    success: true,
    testId: test.id,
    currentStep: updated.currentStep,
  });
});

/**
 * POST - Submit diagnostic test responses
 * This is a separate endpoint for clarity
 */
// Handler would go in submit/route.ts
