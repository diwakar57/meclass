/**
 * POST /api/students/onboarding/complete
 * Complete student onboarding (generate learning DNA and plan)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { StudentOnboardingService } from '@/lib/services/student-onboarding-service';
import { LearningPlanGenerationService } from '@/lib/services/learning-plan-generation-service';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

export const POST = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    // Complete onboarding (generates learning DNA)
    const onboarding = await StudentOnboardingService.completeOnboarding(
      auth.userId,
      auth.schoolId
    );

    // Get available courses for student
    const courseResult = await query(
      `SELECT c.id, c.syllabus_id
       FROM courses c
       WHERE c.school_id = $1
         AND (c.status = 'published' OR c.generation_status = 'success')
       LIMIT 1`,
      [auth.schoolId]
    );

    let learningPlan = null;

    if (
      courseResult.rows.length > 0 &&
      onboarding.learningDnaId &&
      courseResult.rows[0].syllabus_id
    ) {
      const course = courseResult.rows[0];

      // Generate learning plan for first available course
      learningPlan = await LearningPlanGenerationService.generateLearningPlan({
        studentId: auth.userId,
        courseId: course.id,
        learningDnaId: onboarding.learningDnaId,
        basedOnSyllabusId: course.syllabus_id,
      });
    }

    return NextResponse.json({
      success: true,
      onboarding: {
        completed: onboarding.status === 'completed',
        learningDnaId: onboarding.learningDnaId,
        learningPlanId: learningPlan?.id,
      },
      message: 'Onboarding completed successfully',
    });
  } catch (error: any) {
    console.error('Complete onboarding error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
