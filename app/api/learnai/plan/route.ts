import { type NextRequest } from 'next/server';
import { API_ERROR_CODES, apiError, apiSuccess } from '@/lib/server/api-response';
import { LearnAIService } from '@/lib/server/learnai/service';
import type { PersonalizedPlanInput } from '@/lib/types/learnai-school';

const learnAIService = new LearnAIService();

function isPersonalizedPlanInput(value: unknown): value is PersonalizedPlanInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<PersonalizedPlanInput>;

  return Boolean(
    input.studentUserId &&
      input.syllabusId &&
      input.insight &&
      typeof input.insight === 'object' &&
      typeof input.insight.scorePercent === 'number' &&
      Array.isArray(input.insight.strengths) &&
      Array.isArray(input.insight.gaps) &&
      Array.isArray(input.insight.overconfidenceTopics) &&
      Array.isArray(input.insight.underconfidenceTopics),
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isPersonalizedPlanInput(body)) {
    return apiError(
      API_ERROR_CODES.MISSING_REQUIRED_FIELD,
      400,
      'Missing required fields for personalized plan generation.',
    );
  }

  const result = learnAIService.buildPersonalizedLearningPlan(body);
  if (!result.ok) {
    return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, result.error);
  }

  return apiSuccess({
    branding: 'Designed and operated by LearnAI.study',
    learningPlan: result.payload,
  });
}
