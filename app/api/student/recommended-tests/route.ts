/**
 * GET /api/student/recommended-tests
 * Get AI-recommended tests based on student's confidence level and learning pace
 * 
 * Prioritizes tests that:
 * - Match student's current adaptive class schedule
 * - Are appropriate for their confidence level
 * - Align with their learning pace (slow/standard/fast)
 * - Target weak areas for improvement
 */

import type { NextRequest } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { AuthContext } from '@/lib/types/auth';
import {
  recommendTestsForStudent,
  getTestsByConfidenceGap,
} from '@/lib/services/test-recommendation-engine';
import { createLogger } from '@/lib/logger';

const log = createLogger('RecommendedTestsAPI');

export const GET = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return apiError('UNAUTHORIZED', 401, 'Invalid auth context');
    }

    const includeGapTests = req.nextUrl.searchParams.get('includeGapTests') === 'true';

    log.info(`Getting recommended tests for student ${auth.userId}`);

    // Get main recommendations
    const recommendations = await recommendTestsForStudent(auth.userId, auth.schoolId);

    // Optionally get confidence gap tests
    let gapTests = [];
    if (includeGapTests) {
      gapTests = await getTestsByConfidenceGap(auth.userId, auth.schoolId);
    }

    return apiSuccess(
      {
        recommendations,
        confidenceGapTests: gapTests,
        metadata: {
          recommendedAt: new Date().toISOString(),
          studentId: auth.userId,
          totalRecommendations: recommendations.recommendedTests.length,
          gapTestsCount: gapTests.length,
        },
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to get recommended tests:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to get recommended tests', message);
  }
});
