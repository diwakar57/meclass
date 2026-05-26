/**
 * POST /api/students/onboarding/diagnostic-test/submit
 * Submit diagnostic test responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { StudentOnboardingService } from '@/lib/services/student-onboarding-service';
import type { AuthContext } from '@/lib/types/auth';

interface SubmitTestRequest {
  testId: string;
  responses: Array<{
    questionId: string;
    selectedOptionIndex: number;
    responseTime: number;
  }>;
}

export const POST = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const body: SubmitTestRequest = await req.json();

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    if (!body.testId || !body.responses || body.responses.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Submit test
    const result = await StudentOnboardingService.completeDiagnosticTest(
      auth.userId,
      auth.schoolId,
      body.testId,
      body.responses
    );

    return NextResponse.json({
      success: true,
      score: result.score,
      weakAreas: result.weakAreas,
      currentStep: result.onboarding.currentStep,
      message: 'Diagnostic test submitted successfully',
    });
  } catch (error: any) {
    console.error('Submit diagnostic test error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
