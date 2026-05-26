import type { PlanType, StudyPlanDefinition } from '@/lib/adaptive-class-generator/types';

export const STUDY_PLANS: Record<PlanType, StudyPlanDefinition> = {
  simple: {
    planType: 'simple',
    hoursPerWeek: 3,
    sessionsPerWeek: 2,
    paceLevel: 'slow',
    revisionFrequency: 4,
    practiceIntensity: 'light',
    description: 'Low weekly load with slower pacing and gentle revision.',
  },
  core: {
    planType: 'core',
    hoursPerWeek: 6,
    sessionsPerWeek: 4,
    paceLevel: 'standard',
    revisionFrequency: 3,
    practiceIntensity: 'medium',
    description: 'Balanced pacing and practice suitable for most students.',
  },
  harsh: {
    planType: 'harsh',
    hoursPerWeek: 10,
    sessionsPerWeek: 6,
    paceLevel: 'intensive',
    revisionFrequency: 2,
    practiceIntensity: 'high',
    description: 'High intensity with fast progression and strong practice load.',
  },
};

export function listStudyPlans(): StudyPlanDefinition[] {
  return [STUDY_PLANS.simple, STUDY_PLANS.core, STUDY_PLANS.harsh];
}
