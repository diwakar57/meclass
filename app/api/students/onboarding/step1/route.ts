/**
 * GET /api/students/onboarding/status
 * POST /api/students/onboarding/step1
 * Student onboarding step 1: Self-assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { StudentOnboardingService } from '@/lib/services/student-onboarding-service';
import type { AuthContext } from '@/lib/types/auth';
import type { Step1Request } from '@/lib/models/course-models';

/**
 * GET - Check onboarding status
 */
export const GET = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    const progress = await StudentOnboardingService.getOnboardingProgress(
      auth.userId,
      auth.schoolId
    );

    return NextResponse.json({
      success: true,
      onboarding: progress,
    });
  } catch (error: any) {
    console.error('Get onboarding status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

/**
 * POST - Complete step 1 (self-assessment)
 */
export const POST = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const body: Step1Request = await req.json();

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    const onboarding = await StudentOnboardingService.completeStep1(
      auth.userId,
      auth.schoolId,
      {
        currentGrade: body.currentGrade,
        previousGrade: body.previousGrade,
        selfAssessment: body.selfAssessment,
      }
    );

    return NextResponse.json({
      success: true,
      currentStep: onboarding.currentStep,
      message: 'Step 1 completed',
    });
  } catch (error: any) {
    console.error('Complete step 1 error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
