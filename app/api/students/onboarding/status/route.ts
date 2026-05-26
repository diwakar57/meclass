import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { StudentOnboardingService } from '@/lib/services/student-onboarding-service';
import type { AuthContext } from '@/lib/types/auth';

export const GET = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Invalid auth context' }, { status: 401 });
  }

  const onboarding = await StudentOnboardingService.getOnboardingProgress(auth.userId, auth.schoolId);

  return NextResponse.json({
    success: true,
    onboarding,
  });
});
