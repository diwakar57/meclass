import { type NextRequest } from 'next/server';
import { API_ERROR_CODES, apiError, apiSuccess } from '@/lib/server/api-response';
import { LearnAIService } from '@/lib/server/learnai/service';
import type { DiagnosticSubmissionInput } from '@/lib/types/learnai-school';

const learnAIService = new LearnAIService();

function isDiagnosticSubmissionInput(value: unknown): value is DiagnosticSubmissionInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<DiagnosticSubmissionInput>;
  return Boolean(
    input.studentUserId &&
      input.diagnosticTestId &&
      input.answers &&
      typeof input.answers === 'object',
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isDiagnosticSubmissionInput(body)) {
    return apiError(
      API_ERROR_CODES.MISSING_REQUIRED_FIELD,
      400,
      'Missing required fields for diagnostic submission.',
    );
  }

  const result = learnAIService.analyzeDiagnosticSubmission(body);
  if (!result.ok) {
    return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, result.error);
  }

  return apiSuccess({
    branding: 'Designed and operated by LearnAI.study',
    analysis: result.payload,
  });
}
