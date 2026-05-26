/**
 * GET /api/learning-plan/[curriculumId]/next
 * Get the next recommended topic for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createLogger } from '@/lib/logger';
import { getNextRecommendedTopic } from '@/lib/services/adaptive-learning-plan-service';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('GetNextTopic');

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
    const nextTopic = await getNextRecommendedTopic(auth.userId, curriculumId);

    return NextResponse.json(
      {
        nextTopic,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to get next recommended topic', { error });
    return NextResponse.json(
      { error: 'Failed to get next topic' },
      { status: 500 }
    );
  }
});
