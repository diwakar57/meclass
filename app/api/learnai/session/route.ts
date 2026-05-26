import { type NextRequest } from 'next/server';
import { API_ERROR_CODES, apiError, apiSuccess } from '@/lib/server/api-response';
import { LearnAIService } from '@/lib/server/learnai/service';
import type { SessionGenerationInput } from '@/lib/types/learnai-school';

const learnAIService = new LearnAIService();

function isSessionInput(value: unknown): value is SessionGenerationInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<SessionGenerationInput>;

  return Boolean(
    input.studentUserId &&
      input.teacherUserId &&
      input.syllabusId &&
      input.requestedTopicId &&
      input.preferredStyle &&
      input.difficulty,
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isSessionInput(body)) {
    return apiError(
      API_ERROR_CODES.MISSING_REQUIRED_FIELD,
      400,
      'Missing required fields for LearnAI session generation input.',
    );
  }

  const result = learnAIService.createConstrainedSession(body);
  if (!result.ok) {
    return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, result.error);
  }

  return apiSuccess({
    branding: 'Designed and operated by LearnAI.study',
    sessionPlan: result.payload,
  });
}
