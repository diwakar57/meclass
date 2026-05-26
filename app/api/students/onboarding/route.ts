// app/api/students/onboarding/route.ts - Student onboarding submission

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { completeOnboarding, setDiagnosticScore } from '@/lib/student/student-service';
import type { AuthContext } from '@/lib/types/auth';

interface OnboardingPayload {
  gradeLevel: string;
  interests: string[];
  strengths: string[];
  weakAreas: string[];
  learningStyle?: string;
  languagePreference?: string;
  diagnosticScore?: number;
}

export const POST = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const body: OnboardingPayload = await req.json();

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    // Complete onboarding
    const profile = await completeOnboarding(auth.userId, auth.schoolId, {
      gradeLevel: body.gradeLevel,
      interests: body.interests || [],
      strengths: body.strengths || [],
      weakAreas: body.weakAreas || [],
      learningStyle: body.learningStyle,
      languagePreference: body.languagePreference,
    });

    // If diagnostic score provided, save it
    if (body.diagnosticScore !== undefined) {
      await setDiagnosticScore(auth.userId, body.diagnosticScore);
    }

    return NextResponse.json({
      success: true,
      profile,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
});
