import { createHash } from 'crypto';
import { buildAdaptivePlanningPrompt } from '@/lib/adaptive-class-generator/ai-prompt-builder';
import { analyzeDiagnosticAgainstSyllabus } from '@/lib/adaptive-class-generator/diagnostic-analyzer';
import { generateAdaptiveRoadmap } from '@/lib/adaptive-class-generator/roadmap-generator';
import { normalizeSyllabus } from '@/lib/adaptive-class-generator/syllabus-parser';
import { STUDY_PLANS, listStudyPlans } from '@/lib/adaptive-class-generator/study-plans';
import type {
  AdaptiveClassGenerationInput,
  AdaptiveClassGenerationOutput,
  PlanType,
  StudentDiagnosticProfile,
} from '@/lib/adaptive-class-generator/types';

function recommendPlanType(profile: StudentDiagnosticProfile | null): PlanType {
  if (!profile) return 'core';

  if (profile.recommendedPacing === 'slow') return 'simple';
  if (profile.recommendedPacing === 'fast' && profile.baselineScore >= 75) return 'harsh';

  if (profile.baselineScore < 45 || profile.weakTopics.length > Math.max(2, profile.topicMastery.length / 3)) {
    return 'simple';
  }

  if (profile.baselineScore > 82 && profile.weakTopics.length === 0) {
    return 'harsh';
  }

  return 'core';
}

function buildInputFingerprint(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildRegenerationTriggers(input: AdaptiveClassGenerationInput): string[] {
  const triggers = ['syllabus_version_change', 'topic_dependency_change'];

  if (input.studentDiagnostic) {
    triggers.push('diagnostic_resubmission', 'confidence_shift_detected');
  }

  if (input.selectedPlanType) {
    triggers.push('plan_type_switch');
  }

  return triggers;
}

export function generateAdaptiveClassPlan(
  input: AdaptiveClassGenerationInput,
): AdaptiveClassGenerationOutput {
  const structuredSyllabusModel = normalizeSyllabus(input.teacherSyllabus);
  const studentDiagnosticProfile = analyzeDiagnosticAgainstSyllabus(
    structuredSyllabusModel,
    input.studentDiagnostic,
  );

  if (!studentDiagnosticProfile && !input.allowDefaultPlanWithoutDiagnostic && !input.selectedPlanType) {
    throw new Error(
      'Student diagnostic is required unless selectedPlanType is provided or allowDefaultPlanWithoutDiagnostic is enabled.',
    );
  }

  const planRecommendation = recommendPlanType(studentDiagnosticProfile);
  const selectedPlanType = input.selectedPlanType || planRecommendation;
  const selectedPlan = STUDY_PLANS[selectedPlanType];

  const generatedClassRoadmap = generateAdaptiveRoadmap({
    syllabus: structuredSyllabusModel,
    diagnosticProfile: studentDiagnosticProfile,
    plan: selectedPlan,
    studentId: studentDiagnosticProfile?.studentId,
  });

  const aiPlanningPrompt =
    input.runAiPlanningPrompt === false
      ? {
          systemPrompt: '',
          userPrompt: '',
          expectedJsonSchema: {},
        }
      : buildAdaptivePlanningPrompt({
          syllabus: structuredSyllabusModel,
          diagnosticProfile: studentDiagnosticProfile,
          selectedPlan,
          planRecommendation,
          draftRoadmap: generatedClassRoadmap,
        });

  return {
    structuredSyllabusModel,
    studentDiagnosticProfile,
    availablePlans: listStudyPlans(),
    planRecommendation,
    selectedPlan,
    generatedClassRoadmap,
    aiPlanningPrompt,
    metadata: {
      generatedAt: new Date().toISOString(),
      inputFingerprint: buildInputFingerprint({
        syllabusVersionHash: structuredSyllabusModel.versionHash,
        studentDiagnostic: input.studentDiagnostic,
        selectedPlanType: input.selectedPlanType,
      }),
      regenerationTriggers: buildRegenerationTriggers(input),
    },
  };
}
