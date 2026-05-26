import { nanoid } from 'nanoid';
import type {
  GeneratedClassRoadmap,
  GeneratedClassSession,
  RoadmapCoverage,
  StudentDiagnosticProfile,
  StudyPlanDefinition,
  SyllabusModel,
  SyllabusTopic,
} from '@/lib/adaptive-class-generator/types';

function canonicalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDifficultyLevel(
  topic: SyllabusTopic,
  masteryScore: number,
  plan: StudyPlanDefinition,
): 'easy' | 'medium' | 'hard' {
  if (plan.planType === 'harsh') {
    if (masteryScore < 65 || topic.difficultyTag === 'high') return 'hard';
    if (masteryScore < 80) return 'medium';
    return 'easy';
  }

  if (plan.planType === 'simple') {
    if (masteryScore < 40 && topic.difficultyTag === 'high') return 'medium';
    return masteryScore < 55 ? 'medium' : 'easy';
  }

  if (masteryScore < 50 || topic.difficultyTag === 'high') return 'hard';
  if (masteryScore < 75) return 'medium';
  return 'easy';
}

function planSessionDuration(plan: StudyPlanDefinition, topic: SyllabusTopic): number {
  const base = plan.planType === 'simple' ? 45 : plan.planType === 'core' ? 55 : 65;
  const difficultyBoost = topic.difficultyTag === 'high' ? 10 : topic.difficultyTag === 'low' ? -5 : 0;
  return Math.max(35, base + difficultyBoost);
}

function topicPriorityScore(
  topic: SyllabusTopic,
  diagnosticProfile: StudentDiagnosticProfile | null,
): number {
  const priorityBonus = topic.priority === 'high' ? 20 : topic.priority === 'medium' ? 10 : 0;
  const masteryScore = diagnosticProfile?.masteryMap[topic.topicName] ?? 50;
  const gapScore = (100 - masteryScore) * 0.7;

  const confidenceScore = diagnosticProfile?.confidenceMap[topic.topicName] ?? 50;
  const confidencePenalty = confidenceScore > 80 && masteryScore < 60 ? 8 : 0;
  const unknownBoost = diagnosticProfile && topic.topicName in diagnosticProfile.masteryMap ? 0 : 6;

  return topic.weight * 10 + priorityBonus + gapScore + confidencePenalty + unknownBoost;
}

function topologicalTopicOrder(
  topics: SyllabusTopic[],
  diagnosticProfile: StudentDiagnosticProfile | null,
): SyllabusTopic[] {
  const byName = new Map<string, SyllabusTopic>();
  for (const topic of topics) {
    byName.set(canonicalize(topic.topicName), topic);
  }

  const graph = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  for (const topic of topics) {
    const key = canonicalize(topic.topicName);
    graph.set(key, new Set<string>());
    indegree.set(key, 0);
  }

  for (const topic of topics) {
    const topicKey = canonicalize(topic.topicName);

    for (const prerequisite of topic.prerequisites) {
      const prerequisiteKey = canonicalize(prerequisite);
      const matchedPrerequisite = byName.get(prerequisiteKey);
      if (!matchedPrerequisite) continue;

      const matchedKey = canonicalize(matchedPrerequisite.topicName);
      if (matchedKey === topicKey) continue;

      const adjacency = graph.get(matchedKey);
      if (!adjacency) continue;
      if (adjacency.has(topicKey)) continue;

      adjacency.add(topicKey);
      indegree.set(topicKey, (indegree.get(topicKey) || 0) + 1);
    }
  }

  const ready = topics
    .filter((topic) => (indegree.get(canonicalize(topic.topicName)) || 0) === 0)
    .sort((a, b) => topicPriorityScore(b, diagnosticProfile) - topicPriorityScore(a, diagnosticProfile));

  const ordered: SyllabusTopic[] = [];

  while (ready.length) {
    const current = ready.shift();
    if (!current) break;

    ordered.push(current);
    const currentKey = canonicalize(current.topicName);
    const neighbors = graph.get(currentKey);
    if (!neighbors) continue;

    for (const neighborKey of neighbors) {
      const nextInDegree = (indegree.get(neighborKey) || 0) - 1;
      indegree.set(neighborKey, nextInDegree);

      if (nextInDegree === 0) {
        const neighborTopic = byName.get(neighborKey);
        if (neighborTopic) {
          ready.push(neighborTopic);
          ready.sort(
            (a, b) => topicPriorityScore(b, diagnosticProfile) - topicPriorityScore(a, diagnosticProfile),
          );
        }
      }
    }
  }

  if (ordered.length === topics.length) return ordered;

  const fallback = [...topics].sort(
    (a, b) => topicPriorityScore(b, diagnosticProfile) - topicPriorityScore(a, diagnosticProfile),
  );
  return fallback;
}

function sessionsPerTopic(
  topic: SyllabusTopic,
  plan: StudyPlanDefinition,
  diagnosticProfile: StudentDiagnosticProfile | null,
): number {
  const mastery = diagnosticProfile?.masteryMap[topic.topicName] ?? 50;
  const gap = (100 - mastery) / 100;

  const planMultiplier =
    plan.planType === 'simple' ? 0.85 : plan.planType === 'core' ? 1 : 1.25;
  const difficultyMultiplier =
    topic.difficultyTag === 'high' ? 1.2 : topic.difficultyTag === 'low' ? 0.85 : 1;
  const priorityMultiplier = topic.priority === 'high' ? 1.2 : topic.priority === 'low' ? 0.9 : 1;

  const raw = (1 + gap * 2.2) * planMultiplier * difficultyMultiplier * priorityMultiplier;

  const maxSessions = plan.planType === 'simple' ? 3 : plan.planType === 'core' ? 4 : 5;
  return Math.max(1, Math.min(maxSessions, Math.round(raw)));
}

function generatePracticeTasks(topic: SyllabusTopic, difficulty: 'easy' | 'medium' | 'hard'): string[] {
  const firstSubtopic = topic.subtopics[0];

  if (difficulty === 'easy') {
    return [
      `Solve 5 guided questions on ${topic.topicName}.`,
      firstSubtopic
        ? `Write a short explanation for ${firstSubtopic} in your own words.`
        : `Create a concept summary card for ${topic.topicName}.`,
    ];
  }

  if (difficulty === 'hard') {
    return [
      `Solve 12 mixed-difficulty problems on ${topic.topicName}.`,
      `Attempt a timed challenge focused on ${topic.topicName}.`,
      `Explain one error pattern and how to avoid it in ${topic.topicName}.`,
    ];
  }

  return [
    `Solve 8 practice questions on ${topic.topicName}.`,
    firstSubtopic
      ? `Build one worked example connecting ${topic.topicName} and ${firstSubtopic}.`
      : `Create one worked example for ${topic.topicName}.`,
  ];
}

function generateRevisionTasks(topic: SyllabusTopic, plan: StudyPlanDefinition): string[] {
  if (plan.planType === 'simple') {
    return [`Quick recall drill: key formulas/concepts from ${topic.topicName}.`];
  }

  if (plan.planType === 'harsh') {
    return [
      `Spaced-repetition review set for ${topic.topicName}.`,
      `Error-log revisit: rewrite 3 incorrect responses from ${topic.topicName}.`,
    ];
  }

  return [
    `Revision quiz on ${topic.topicName}.`,
    `Summarize 3 key takeaways from ${topic.topicName}.`,
  ];
}

function buildCoverage(
  orderedTopics: SyllabusTopic[],
  allocation: Map<string, number>,
  diagnosticProfile: StudentDiagnosticProfile | null,
): RoadmapCoverage[] {
  return orderedTopics.map((topic) => ({
    topicName: topic.topicName,
    sessionsAllocated: allocation.get(topic.topicName) || 1,
    masteryAtBaseline: diagnosticProfile?.masteryMap[topic.topicName],
    priority: topic.priority,
  }));
}

interface RoadmapGenerationArgs {
  syllabus: SyllabusModel;
  plan: StudyPlanDefinition;
  diagnosticProfile: StudentDiagnosticProfile | null;
  studentId?: string;
}

export function generateAdaptiveRoadmap(args: RoadmapGenerationArgs): GeneratedClassRoadmap {
  const topics = args.syllabus.modules.flatMap((module) => module.topics);
  const orderedTopics = topologicalTopicOrder(topics, args.diagnosticProfile);

  const allocation = new Map<string, number>();
  for (const topic of orderedTopics) {
    allocation.set(topic.topicName, sessionsPerTopic(topic, args.plan, args.diagnosticProfile));
  }

  const sessions: GeneratedClassSession[] = [];
  let sessionOrder = 0;

  for (const topic of orderedTopics) {
    const topicSessions = allocation.get(topic.topicName) || 1;
    const baseline = args.diagnosticProfile?.masteryMap[topic.topicName] ?? 50;

    for (let index = 0; index < topicSessions; index += 1) {
      sessionOrder += 1;
      const week = Math.ceil(sessionOrder / args.plan.sessionsPerWeek);
      const difficultyLevel = resolveDifficultyLevel(topic, baseline, args.plan);
      const objective =
        topic.objectives[index % Math.max(1, topic.objectives.length)] ||
        `Strengthen conceptual and applied understanding of ${topic.topicName}.`;

      const tags = [
        'adaptive',
        `plan:${args.plan.planType}`,
        `topic-priority:${topic.priority}`,
        `mastery:${baseline}`,
      ];

      if (index === 0) {
        tags.push('intro');
      } else if (index === topicSessions - 1) {
        tags.push('checkpoint');
      } else {
        tags.push('practice');
      }

      sessions.push({
        classId: `class_${nanoid(10)}`,
        title:
          index === 0
            ? `${topic.topicName}: Foundations`
            : index === topicSessions - 1
              ? `${topic.topicName}: Mastery Checkpoint`
              : `${topic.topicName}: Guided Practice ${index}`,
        topicName: topic.topicName,
        subtopicName: topic.subtopics[index % Math.max(1, topic.subtopics.length)],
        objective,
        durationMinutes: planSessionDuration(args.plan, topic),
        sessionOrder,
        planType: args.plan.planType,
        difficultyLevel,
        teachingContentSummary:
          index === 0
            ? `Introduce core ideas, misconceptions, and anchor examples for ${topic.topicName}.`
            : `Reinforce ${topic.topicName} through targeted examples and guided reasoning.`,
        practiceTasks: generatePracticeTasks(topic, difficultyLevel),
        revisionTasks: generateRevisionTasks(topic, args.plan),
        masteryCheckpoint: `Student demonstrates >=80% correctness on ${topic.topicName} checkpoint set.`,
        week,
        tags,
        prerequisites: topic.prerequisites,
      });

      if (sessionOrder % args.plan.revisionFrequency === 0 && sessions.length > 1) {
        const previousTopic = orderedTopics[Math.max(0, orderedTopics.indexOf(topic) - 1)] || topic;
        sessionOrder += 1;

        sessions.push({
          classId: `class_${nanoid(10)}`,
          title: `Revision Sprint: ${previousTopic.topicName}`,
          topicName: previousTopic.topicName,
          objective: `Consolidate retention and address recurring mistakes in ${previousTopic.topicName}.`,
          durationMinutes: 35,
          sessionOrder,
          planType: args.plan.planType,
          difficultyLevel: 'medium',
          teachingContentSummary:
            `High-yield revision block using retrieval practice for ${previousTopic.topicName}.`,
          practiceTasks: [
            `Complete a timed mini-quiz on ${previousTopic.topicName}.`,
            `Review mistakes and write correction notes.`,
          ],
          revisionTasks: [`Spaced recall sheet for ${previousTopic.topicName}.`],
          masteryCheckpoint:
            `Student improves recall and reduces repeated errors for ${previousTopic.topicName}.`,
          week: Math.ceil(sessionOrder / args.plan.sessionsPerWeek),
          tags: ['revision', 'adaptive', `plan:${args.plan.planType}`],
          prerequisites: previousTopic.prerequisites,
        });
      }
    }
  }

  const coverage = buildCoverage(orderedTopics, allocation, args.diagnosticProfile);

  return {
    roadmapId: `roadmap_${nanoid(10)}`,
    studentId: args.studentId,
    syllabusId: args.syllabus.id,
    planType: args.plan.planType,
    totalWeeks: Math.ceil(sessions.length / args.plan.sessionsPerWeek),
    totalSessions: sessions.length,
    sessions,
    coverage,
  };
}
