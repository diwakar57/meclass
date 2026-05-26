/**
 * GET /api/learning-plan/[curriculumId]
 * Get adaptive learning plan for the current student
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createLogger } from '@/lib/logger';
import { generateAdaptiveLearningPlan } from '@/lib/services/adaptive-learning-plan-service';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('GetLearningPlan');

export const GET = withRole(
  ['student'],
  async (
    req: NextRequest,
    auth: AuthContext,
    context?: { params?: { curriculumId?: string } } | Promise<{ params?: { curriculumId?: string } }>
  ) => {
  try {
    const resolvedContext = context && typeof (context as Promise<any>).then === 'function'
      ? await (context as Promise<any>)
      : context;
    const curriculumId = resolvedContext?.params?.curriculumId;
    if (!curriculumId) {
      return NextResponse.json({ error: 'curriculumId is required' }, { status: 400 });
    }

    const plan = await generateAdaptiveLearningPlan(auth.userId, curriculumId);

    return NextResponse.json(plan, { status: 200 });
  } catch (error) {
    logger.error('Failed to get learning plan', { error });
    return NextResponse.json(
      { error: 'Failed to get learning plan' },
      { status: 500 }
    );
  }
});
