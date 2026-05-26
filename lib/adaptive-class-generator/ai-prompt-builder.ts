import type {
  GeneratedClassRoadmap,
  PlanType,
  StudentDiagnosticProfile,
  StudyPlanDefinition,
  SyllabusModel,
} from '@/lib/adaptive-class-generator/types';

interface PlanningPromptArgs {
  syllabus: SyllabusModel;
  diagnosticProfile: StudentDiagnosticProfile | null;
  selectedPlan: StudyPlanDefinition;
  planRecommendation: PlanType;
  draftRoadmap: GeneratedClassRoadmap;
}

function compactSyllabusSnapshot(syllabus: SyllabusModel): unknown {
  return {
    subjectName: syllabus.subjectName,
    modules: syllabus.modules.map((module) => ({
      moduleName: module.moduleName,
      topics: module.topics.map((topic) => ({
        topicName: topic.topicName,
        objectives: topic.objectives.slice(0, 3),
        prerequisites: topic.prerequisites,
        priority: topic.priority,
        difficultyTag: topic.difficultyTag,
      })),
    })),
  };
}

function compactDiagnosticSnapshot(profile: StudentDiagnosticProfile | null): unknown {
  if (!profile) {
    return {
      status: 'missing',
      guidance:
        'No diagnostic profile available. Keep sequence balanced, insert periodic baseline checks, and avoid harsh assumptions.',
    };
  }

  return {
    baselineScore: profile.baselineScore,
    recommendedPacing: profile.recommendedPacing,
    strengths: profile.strengths,
    weakTopics: profile.weakTopics,
    unknownTopics: profile.unknownTopics,
    overconfidentWeakAreas: profile.overconfidentWeakAreas,
    underconfidentStrongAreas: profile.underconfidentStrongAreas,
    topicMastery: profile.topicMastery.map((item) => ({
      topicName: item.topicName,
      masteryScore: item.masteryScore,
      masteryLevel: item.masteryLevel,
      confidenceAverage: item.confidenceAverage,
      confidencePattern: item.confidencePattern,
    })),
  };
}

export function buildAdaptivePlanningPrompt(args: PlanningPromptArgs): {
  systemPrompt: string;
  userPrompt: string;
  expectedJsonSchema: Record<string, unknown>;
} {
  const systemPrompt = [
    'You are an expert instructional designer for adaptive K-12 learning plans.',
    'Goal: produce a topic-by-topic class roadmap that strictly follows prerequisites, adapts to diagnostic mastery + confidence, and aligns with selected study intensity plan.',
    'Rules:',
    '1) Never skip prerequisite dependencies.',
    '2) Prioritize weak and overconfident-weak topics earlier with extra remediation.',
    '3) Preserve confidence for underconfident-strong topics using scaffolded wins.',
    '4) Include periodic revision sessions and mastery checkpoints.',
    '5) Output valid JSON only, conforming to the schema.',
  ].join('\n');

  const userPromptPayload = {
    selectedPlan: args.selectedPlan,
    planRecommendation: args.planRecommendation,
    syllabus: compactSyllabusSnapshot(args.syllabus),
    diagnosticProfile: compactDiagnosticSnapshot(args.diagnosticProfile),
    draftRoadmap: {
      totalWeeks: args.draftRoadmap.totalWeeks,
      totalSessions: args.draftRoadmap.totalSessions,
      coverage: args.draftRoadmap.coverage,
      firstSessions: args.draftRoadmap.sessions.slice(0, 5),
    },
  };

  const userPrompt = [
    'Create an improved adaptive roadmap using the following context.',
    'Keep plan intensity constraints intact (hours, sessions/week, revision frequency).',
    'For each session, include practical tasks and clear measurable mastery checkpoint.',
    'Return strictly JSON.',
    JSON.stringify(userPromptPayload, null, 2),
  ].join('\n\n');

  const expectedJsonSchema: Record<string, unknown> = {
    type: 'object',
    required: ['summary', 'roadmap'],
    properties: {
      summary: {
        type: 'object',
        required: ['planType', 'rationale', 'riskFlags'],
        properties: {
          planType: { type: 'string', enum: ['simple', 'core', 'harsh'] },
          rationale: { type: 'string' },
          riskFlags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      roadmap: {
        type: 'object',
        required: ['totalWeeks', 'totalSessions', 'sessions'],
        properties: {
          totalWeeks: { type: 'number' },
          totalSessions: { type: 'number' },
          sessions: {
            type: 'array',
            items: {
              type: 'object',
              required: [
                'title',
                'topicName',
                'objective',
                'durationMinutes',
                'week',
                'practiceTasks',
                'masteryCheckpoint',
              ],
              properties: {
                title: { type: 'string' },
                topicName: { type: 'string' },
                objective: { type: 'string' },
                durationMinutes: { type: 'number' },
                week: { type: 'number' },
                practiceTasks: { type: 'array', items: { type: 'string' } },
                revisionTasks: { type: 'array', items: { type: 'string' } },
                masteryCheckpoint: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  };

  return {
    systemPrompt,
    userPrompt,
    expectedJsonSchema,
  };
}
