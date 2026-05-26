import type {
  ConfidenceLabel,
  ConfidencePattern,
  DiagnosticResultInput,
  MasteryLevel,
  PaceRecommendation,
  StudentDiagnosticProfile,
  SyllabusModel,
  SyllabusTopic,
  TopicMasteryProfile,
} from '@/lib/adaptive-class-generator/types';

interface TopicAggregation {
  attempts: number;
  correct: number;
  confidenceTotal: number;
  confidenceCount: number;
}

function canonicalizeTopicKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function confidenceLabelToScore(label: ConfidenceLabel): number {
  if (label === 'low') return 30;
  if (label === 'high') return 85;
  return 60;
}

function normalizeConfidence(
  confidence: number | ConfidenceLabel | undefined,
  scale?: { min: number; max: number },
): number | null {
  if (confidence === undefined || confidence === null) return null;

  if (typeof confidence === 'string') {
    return confidenceLabelToScore(confidence);
  }

  if (!Number.isFinite(confidence)) return null;

  if (scale && scale.max > scale.min) {
    const normalized = ((confidence - scale.min) / (scale.max - scale.min)) * 100;
    return Math.max(0, Math.min(100, normalized));
  }

  if (confidence <= 5) {
    return Math.max(0, Math.min(100, (confidence / 5) * 100));
  }

  return Math.max(0, Math.min(100, confidence));
}

function classifyConfidencePattern(
  accuracy: number,
  confidenceAverage: number | null,
): ConfidencePattern {
  if (confidenceAverage === null) return 'confidence_missing';

  const calibrationGap = confidenceAverage - accuracy;
  if (calibrationGap >= 20 && accuracy < 60) return 'overconfident_weak';
  if (calibrationGap <= -20 && accuracy >= 60) return 'underconfident_strong';
  return 'aligned';
}

function classifyMasteryLevel(accuracy: number, attempts: number): MasteryLevel {
  if (attempts === 0) return 'unknown';
  if (accuracy >= 80) return 'mastered';
  if (accuracy < 50) return 'weak';
  return 'reinforce';
}

function buildFlags(args: {
  attempts: number;
  accuracy: number;
  confidenceAverage: number | null;
  confidencePattern: ConfidencePattern;
  masteryLevel: MasteryLevel;
}): string[] {
  const flags: string[] = [];

  if (args.attempts === 0) {
    flags.push('no_diagnostic_data');
    return flags;
  }

  if (args.attempts < 2) flags.push('sparse_signal');

  if (args.confidenceAverage === null) {
    flags.push('confidence_not_provided');
  } else {
    if (args.confidenceAverage < 45) flags.push('low_confidence');
    if (args.confidenceAverage > 80 && args.accuracy < 60) {
      flags.push('high_confidence_low_accuracy');
    }
  }

  if (args.confidencePattern === 'overconfident_weak') flags.push('calibration_risk');
  if (args.masteryLevel === 'weak') flags.push('needs_remediation');

  return flags;
}

function computeMasteryScore(args: {
  accuracy: number;
  confidenceAverage: number | null;
  attempts: number;
}): number {
  if (args.attempts === 0) return 50;

  const confidenceForScore = args.confidenceAverage ?? 50;
  const calibrationScore = 100 - Math.abs(confidenceForScore - args.accuracy);

  const weighted = args.accuracy * 0.85 + calibrationScore * 0.15;
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

function buildTopicIndex(topics: SyllabusTopic[]): Map<string, SyllabusTopic> {
  const topicIndex = new Map<string, SyllabusTopic>();

  for (const topic of topics) {
    topicIndex.set(canonicalizeTopicKey(topic.topicName), topic);

    for (const alias of topic.subtopics) {
      const aliasKey = canonicalizeTopicKey(alias);
      if (!topicIndex.has(aliasKey)) {
        topicIndex.set(aliasKey, topic);
      }
    }
  }

  return topicIndex;
}

function resolveMappedTopic(
  mappedTopic: string,
  topicIndex: Map<string, SyllabusTopic>,
  allTopics: SyllabusTopic[],
): SyllabusTopic | null {
  const key = canonicalizeTopicKey(mappedTopic);
  const exact = topicIndex.get(key);
  if (exact) return exact;

  const partial = allTopics.find((topic) => {
    const topicKey = canonicalizeTopicKey(topic.topicName);
    return topicKey.includes(key) || key.includes(topicKey);
  });

  return partial || null;
}

function recommendPacing(args: {
  baselineScore: number;
  weakCount: number;
  unknownCount: number;
  assessedCount: number;
  overconfidentWeakCount: number;
}): PaceRecommendation {
  const weakRatio = args.assessedCount ? args.weakCount / args.assessedCount : 0;
  const unknownRatio = args.assessedCount
    ? args.unknownCount / (args.assessedCount + args.unknownCount)
    : 1;

  if (
    args.baselineScore < 45 ||
    weakRatio >= 0.4 ||
    args.overconfidentWeakCount >= 2 ||
    unknownRatio >= 0.5
  ) {
    return 'slow';
  }

  if (args.baselineScore >= 75 && weakRatio <= 0.15 && args.overconfidentWeakCount === 0) {
    return 'fast';
  }

  return 'standard';
}

export function buildStudentDiagnosticProfile(
  syllabus: SyllabusModel,
  diagnostic: DiagnosticResultInput,
): StudentDiagnosticProfile {
  const topics = syllabus.modules.flatMap((module) => module.topics);
  const topicIndex = buildTopicIndex(topics);

  const aggregation = new Map<string, TopicAggregation>();
  for (const topic of topics) {
    aggregation.set(topic.topicName, {
      attempts: 0,
      correct: 0,
      confidenceTotal: 0,
      confidenceCount: 0,
    });
  }

  for (const answer of diagnostic.answers) {
    const mappedTopics = answer.mappedTopics?.length ? answer.mappedTopics : [];
    const confidence = normalizeConfidence(answer.confidenceScore, diagnostic.confidenceScale);

    for (const mappedTopic of mappedTopics) {
      const resolvedTopic = resolveMappedTopic(mappedTopic, topicIndex, topics);
      if (!resolvedTopic) continue;

      const bucket = aggregation.get(resolvedTopic.topicName);
      if (!bucket) continue;

      bucket.attempts += 1;
      if (answer.correct) bucket.correct += 1;

      if (confidence !== null) {
        bucket.confidenceTotal += confidence;
        bucket.confidenceCount += 1;
      }
    }
  }

  const topicMastery: TopicMasteryProfile[] = topics.map((topic) => {
    const bucket = aggregation.get(topic.topicName) || {
      attempts: 0,
      correct: 0,
      confidenceTotal: 0,
      confidenceCount: 0,
    };

    const accuracy = bucket.attempts ? (bucket.correct / bucket.attempts) * 100 : 0;
    const confidenceAverage = bucket.confidenceCount
      ? bucket.confidenceTotal / bucket.confidenceCount
      : null;

    const masteryLevel = classifyMasteryLevel(accuracy, bucket.attempts);
    const confidencePattern = classifyConfidencePattern(accuracy, confidenceAverage);

    return {
      topicName: topic.topicName,
      masteryScore: computeMasteryScore({
        accuracy,
        confidenceAverage,
        attempts: bucket.attempts,
      }),
      masteryLevel,
      confidenceAverage: confidenceAverage === null ? undefined : Math.round(confidenceAverage),
      confidencePattern,
      flags: buildFlags({
        attempts: bucket.attempts,
        accuracy,
        confidenceAverage,
        confidencePattern,
        masteryLevel,
      }),
    };
  });

  const topicWeightByName = new Map(topics.map((topic) => [topic.topicName, topic.weight]));

  let weightedTotal = 0;
  let weightedDenominator = 0;

  for (const topic of topicMastery) {
    const weight = topicWeightByName.get(topic.topicName) || 1;
    weightedTotal += topic.masteryScore * weight;
    weightedDenominator += weight;
  }

  const baselineScore = weightedDenominator
    ? Math.round(weightedTotal / weightedDenominator)
    : 50;

  const strengths = topicMastery
    .filter((topic) => topic.masteryLevel === 'mastered')
    .map((topic) => topic.topicName);
  const weakTopics = topicMastery
    .filter((topic) => topic.masteryLevel === 'weak')
    .map((topic) => topic.topicName);
  const unknownTopics = topicMastery
    .filter((topic) => topic.masteryLevel === 'unknown')
    .map((topic) => topic.topicName);

  const overconfidentWeakAreas = topicMastery
    .filter((topic) => topic.confidencePattern === 'overconfident_weak')
    .map((topic) => topic.topicName);

  const underconfidentStrongAreas = topicMastery
    .filter((topic) => topic.confidencePattern === 'underconfident_strong')
    .map((topic) => topic.topicName);

  const assessedCount = topicMastery.filter((topic) => topic.masteryLevel !== 'unknown').length;

  const recommendedPacing = recommendPacing({
    baselineScore,
    weakCount: weakTopics.length,
    unknownCount: unknownTopics.length,
    assessedCount,
    overconfidentWeakCount: overconfidentWeakAreas.length,
  });

  const masteryMap: Record<string, number> = {};
  const confidenceMap: Record<string, number> = {};

  for (const topic of topicMastery) {
    masteryMap[topic.topicName] = topic.masteryScore;
    confidenceMap[topic.topicName] = topic.confidenceAverage ?? 50;
  }

  return {
    studentId: diagnostic.studentId,
    syllabusId: diagnostic.syllabusId || syllabus.id,
    baselineScore,
    topicMastery,
    masteryMap,
    confidenceMap,
    strengths,
    weakTopics,
    unknownTopics,
    overconfidentWeakAreas,
    underconfidentStrongAreas,
    recommendedPacing,
  };
}

export function analyzeDiagnosticAgainstSyllabus(
  syllabus: SyllabusModel,
  diagnostic?: DiagnosticResultInput,
): StudentDiagnosticProfile | null {
  if (!diagnostic) return null;
  if (!diagnostic.answers || diagnostic.answers.length === 0) return null;

  return buildStudentDiagnosticProfile(syllabus, diagnostic);
}
