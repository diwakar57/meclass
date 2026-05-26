import type { NextRequest } from 'next/server';
import { generateAdaptiveClassPlan } from '@/lib/adaptive-class-generator/engine';
import type { AdaptiveClassGenerationInput } from '@/lib/adaptive-class-generator/types';
import { apiError, apiSuccess } from '@/lib/server/api-response';

export const maxDuration = 30;

function hasSyllabusPayload(input: Partial<AdaptiveClassGenerationInput>): boolean {
  const syllabus = input.teacherSyllabus;
  if (!syllabus) return false;

  const hasStructured = Boolean(syllabus.structured?.modules?.length);
  const hasRaw = Boolean(syllabus.rawText?.trim());
  return hasStructured || hasRaw;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AdaptiveClassGenerationInput>;

    if (!hasSyllabusPayload(body)) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'teacherSyllabus is required and must include either structured modules or rawText.',
      );
    }

    const input: AdaptiveClassGenerationInput = {
      teacherSyllabus: body.teacherSyllabus!,
      ...(body.studentDiagnostic ? { studentDiagnostic: body.studentDiagnostic } : {}),
      ...(body.selectedPlanType ? { selectedPlanType: body.selectedPlanType } : {}),
      ...(body.allowDefaultPlanWithoutDiagnostic != null
        ? { allowDefaultPlanWithoutDiagnostic: body.allowDefaultPlanWithoutDiagnostic }
        : {}),
      ...(body.runAiPlanningPrompt != null
        ? { runAiPlanningPrompt: body.runAiPlanningPrompt }
        : {}),
    };

    const result = generateAdaptiveClassPlan(input);
    return apiSuccess(result as unknown as Record<string, unknown>, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('diagnostic is required') || message.includes('Unable to parse syllabus')) {
      return apiError('INVALID_REQUEST', 400, message);
    }

    return apiError('INTERNAL_ERROR', 500, 'Failed to generate adaptive class roadmap', message);
  }
}
