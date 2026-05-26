/**
 * /app/dashboard/student/onboarding/page.tsx
 * First-time student onboarding page
 */

'use client';

import { useRouter } from 'next/navigation';
import StudentOnboardingWizard from '@/components/onboarding/StudentOnboardingWizard';

export default function StudentOnboardingPage() {
  const router = useRouter();

  const handleOnboardingComplete = () => {
    // Redirect to dashboard
    router.push('/dashboard/student');
  };

  return (
    <StudentOnboardingWizard
      studentId="me"
      onComplete={handleOnboardingComplete}
    />
  );
}
