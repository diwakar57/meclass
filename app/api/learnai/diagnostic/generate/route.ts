import { type NextRequest } from 'next/server';
import { API_ERROR_CODES, apiError, apiSuccess } from '@/lib/server/api-response';
import { LearnAIService } from '@/lib/server/learnai/service';
import type { DiagnosticGenerationInput } from '@/lib/types/learnai-school';

const learnAIService = new LearnAIService();

function isDiagnosticGenerationInput(value: unknown): value is DiagnosticGenerationInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<DiagnosticGenerationInput>;
  return Boolean(input.studentUserId && input.syllabusId);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isDiagnosticGenerationInput(body)) {
    return apiError(
      API_ERROR_CODES.MISSING_REQUIRED_FIELD,
      400,
      'Missing required fields for diagnostic generation.',
    );
  }

  const result = learnAIService.generateDiagnosticTest(body);
  if (!result.ok) {
    return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, result.error);
  }

  return apiSuccess({
    branding: 'Designed and operated by LearnAI.study',
    diagnostic: result.payload,
  });
}
