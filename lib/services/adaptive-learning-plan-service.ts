/**
 * Adaptive Learning Plan Generator
 * Creates personalized learning pathways based on student mastery, prerequisites, and pace
 * Recommends optimal topic sequence for each student
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AdaptiveLearningPlan');

export interface LearningPlanTopic {
  topicId: string;
  topicName: string;
  sequence: number;
  currentMastery: number; // 0-100
  recommendedDifficulty: number; // 1-10
  estimatedDaysToMastery: number;
  prerequisites: string[]; // prerequisite topic IDs
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface AdaptiveLearningPlan {
  studentId: string;
  curriculumId: string;
  generatedAt: string;
  totalEstimatedDays: number;
  topicsSequence: LearningPlanTopic[];
  learningPace: 'slow' | 'normal' | 'fast';
  nextRecommendedTopic: LearningPlanTopic | null;
}

/**
 * Generate adaptive learning plan for a student
 */
export async function generateAdaptiveLearningPlan(
  studentId: string,
  curriculumId: string
): Promise<AdaptiveLearningPlan> {
  try {
    // Get all topics in curriculum with prerequisites
    const topicsResult = await query(
      `SELECT id, title, order_index, prerequisites 
       FROM topics 
       WHERE curriculum_id = $1 
       ORDER BY order_index ASC`,
      [curriculumId]
    );

    if (topicsResult.rows.length === 0) {
      throw new Error('No topics found in curriculum');
    }

    const topics = topicsResult.rows;

    // Get student's mastery levels
    const masteryResult = await query(
      `SELECT topic_id,
              COALESCE(mastery_score, mastery_level, 0)::float AS mastery_level,
              COALESCE(confidence_level, 0)::float AS confidence_level
       FROM topic_mastery 
       WHERE student_id = $1`,
      [studentId]
    );

    const masteryMap: Record<string, { mastery: number; confidence: number }> = {};
    for (const row of masteryResult.rows) {
      masteryMap[row.topic_id] = {
        mastery: row.mastery_level,
        confidence: row.confidence_level,
      };
    }

    // Get learning DNA for pace adaptation
    const dnaResult = await query(`SELECT * FROM learning_dna WHERE student_id = $1`, [
      studentId,
    ]);

    const learningDNA = dnaResult.rows[0];
    const pace =
      learningDNA?.pace_type === 'slow'
        ? 'slow'
        : learningDNA?.pace_type === 'fast'
          ? 'fast'
          : 'normal';

    // Score and rank topics
    const scoredTopics = topics.map((topic: any) => {
      const mastery = masteryMap[topic.id]?.mastery || 0;
      const confidence = masteryMap[topic.id]?.confidence || 50;

      // Calculate priority based on mastery gap and prerequisites
      const masteryGap = 100 - mastery;
      const hasPrerequisites = topic.prerequisites && topic.prerequisites.length > 0;

      let priority: 'high' | 'medium' | 'low' = 'medium';

      // High priority: incomplete topics with met prerequisites
      if (mastery < 75) {
        priority = masterMissingHighestWeight(topic, masteryMap, hasPrerequisites);
      } else if (mastery < 95) {
        // Medium priority: topics needing reinforcement
        priority = 'medium';
      } else {
        // Low priority: already mastered
        priority = 'low';
      }

      return {
        topicId: topic.id,
        topicName: topic.title || `Topic ${topic.order_index || 0}`,
        sequence: topic.order_index || 0,
        currentMastery: mastery,
        confidence,
        masteryGap,
        prerequisites: topic.prerequisites || [],
        priority,
        hasPrerequisites,
      };
    });

    // Filter out fully mastered topics unless reinforcement is needed
    const incompleteTopics = scoredTopics.filter((t: any) => t.currentMastery < 95);

    // Sort by: prerequisites met → priority → sequence
    const sortedTopics = incompleteTopics.sort((a, b) => {
      // First, ensure prerequisites are met
      const aPrereqsMet = checkPrerequisitesMet(a.topicId, masteryMap, topics);
      const bPrereqsMet = checkPrerequisitesMet(b.topicId, masteryMap, topics);

      if (aPrereqsMet && !bPrereqsMet) return -1;
      if (!aPrereqsMet && bPrereqsMet) return 1;

      // Then sort by priority
      const priorityOrder: Record<'high' | 'medium' | 'low', number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      const aPriority = a.priority as keyof typeof priorityOrder;
      const bPriority = b.priority as keyof typeof priorityOrder;
      if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      }

      // Finally by sequence
      return a.sequence - b.sequence;
    });

    // Calculate difficulty levels and estimated time
    const planTopics: LearningPlanTopic[] = sortedTopics.map((topic: any, index: number) => {
      const baseDifficulty = Math.max(1, Math.ceil((100 - topic.currentMastery) / 20));
      const adjustedDifficulty = Math.min(
        10,
        Math.max(1, baseDifficulty + (pace === 'fast' ? 2 : pace === 'slow' ? -2 : 0))
      );

      // Estimate time based on mastery gap and pace
      const baseTime = Math.ceil(topic.masteryGap / 15);
      const paceMultiplier = pace === 'slow' ? 1.5 : pace === 'fast' ? 0.75 : 1;
      const estimatedDays = Math.ceil(baseTime * paceMultiplier);

      return {
        topicId: topic.topicId,
        topicName: topic.topicName,
        sequence: index + 1,
        currentMastery: topic.currentMastery,
        recommendedDifficulty: adjustedDifficulty,
        estimatedDaysToMastery: estimatedDays,
        prerequisites: topic.prerequisites,
        priority: topic.priority,
        reasoning: buildReasoningString(topic, pace),
      };
    });

    // Calculate total estimated time
    const totalEstimatedDays = planTopics.reduce((sum, t) => sum + t.estimatedDaysToMastery, 0);

    const nextTopic = planTopics.length > 0 ? planTopics[0] : null;

    return {
      studentId,
      curriculumId,
      generatedAt: new Date().toISOString(),
      totalEstimatedDays,
      topicsSequence: planTopics,
      learningPace: pace,
      nextRecommendedTopic: nextTopic,
    };
  } catch (error) {
    logger.error('Failed to generate adaptive learning plan', { error });
    throw error;
  }
}

/**
 * Get current learning plan for a student
 */
export async function getLearningPlan(
  studentId: string,
  curriculumId: string
): Promise<AdaptiveLearningPlan> {
  // For now, regenerate each time
  // In production, cache with TTL or store in DB
  return generateAdaptiveLearningPlan(studentId, curriculumId);
}

/**
 * Get recommended next topic for a student
 */
export async function getNextRecommendedTopic(
  studentId: string,
  curriculumId: string
): Promise<LearningPlanTopic | null> {
  const plan = await generateAdaptiveLearningPlan(studentId, curriculumId);
  return plan.nextRecommendedTopic;
}

/**
 * Update mastery level and regenerate plan
 */
export async function updateTopicMasteryAndPlan(
  studentId: string,
  topicId: string,
  masteryLevel: number,
  confidenceLevel: number,
  curriculumId: string
): Promise<AdaptiveLearningPlan> {
  try {
    const studentResult = await query(
      `SELECT school_id FROM users WHERE id = $1`,
      [studentId]
    );
    const schoolId = studentResult.rows[0]?.school_id;
    if (!schoolId) {
      throw new Error('Student not found for mastery update');
    }

    // Update mastery in database
    await query(
      `INSERT INTO topic_mastery (student_id, topic_id, school_id, mastery_score, mastery_level, confidence_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4, $5, NOW(), NOW())
       ON CONFLICT (student_id, topic_id) DO UPDATE
       SET mastery_score = $4, mastery_level = $4, confidence_level = $5, updated_at = NOW()`,
      [studentId, topicId, schoolId, masteryLevel, confidenceLevel]
    );

    // Regenerate plan with updated mastery
    return generateAdaptiveLearningPlan(studentId, curriculumId);
  } catch (error) {
    logger.error('Failed to update mastery and plan', { error });
    throw error;
  }
}

/**
 * Check if prerequisites are met for a topic
 */
function checkPrerequisitesMet(
  topicId: string,
  masteryMap: Record<string, any>,
  topics: any[]
): boolean {
  const topic = topics.find((t) => t.id === topicId);

  if (!topic || !topic.prerequisites || topic.prerequisites.length === 0) {
    return true;
  }

  // Check if all prerequisites have 70%+ mastery
  for (const prereqId of topic.prerequisites) {
    const prereqMastery = masteryMap[prereqId]?.mastery || 0;
    if (prereqMastery < 70) {
      return false;
    }
  }

  return true;
}

/**
 * Determine priority with emphasis on prerequisites
 */
function masterMissingHighestWeight(
  topic: any,
  masteryMap: Record<string, any>,
  hasPrerequisites: boolean
): 'high' | 'medium' | 'low' {
  // If prerequisites are not met, high priority
  if (hasPrerequisites && topic.prerequisites.some((p: string) => (masteryMap[p]?.mastery || 0) < 70)) {
    return 'high';
  }

  // If low mastery, high priority
  const mastery = masteryMap[topic.id]?.mastery || 0;
  if (mastery < 50) {
    return 'high';
  }

  return 'medium';
}

/**
 * Build human-readable reasoning for topic recommendation
 */
function buildReasoningString(topic: any, pace: string): string {
  let reasons: string[] = [];

  if (topic.currentMastery === 0) {
    reasons.push('Never attempted');
  } else if (topic.currentMastery < 50) {
    reasons.push('Low mastery');
  } else if (topic.currentMastery < 75) {
    reasons.push('Needs reinforcement');
  }

  if (pace === 'slow') {
    reasons.push('Adapted for slower pace');
  } else if (pace === 'fast') {
    reasons.push('Challenging for accelerated pace');
  }

  if (topic.hasPrerequisites && topic.priority === 'high') {
    reasons.push('Important foundation');
  }

  return reasons.length > 0 ? reasons.join('; ') : 'Recommended for continued learning';
}
