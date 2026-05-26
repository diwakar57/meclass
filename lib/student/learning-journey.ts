// lib/student/learning-journey.ts - Adaptive learning path engine

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { TopicData } from '@/lib/curriculum/curriculum-service';
import { LearningDNAService } from '@/lib/services/learning-dna';

const log = createLogger('LearningJourney');

export interface LearningJourneyStep {
  type: 'new_topic' | 'revision' | 'enrichment' | 'prerequisite';
  topicId: string;
  title: string;
  reason: string;
  difficulty: number;
}

/**
 * Determine next-recommended topic for student
 * Uses mastery data, curriculum structure, and learning progression
 */
export async function getNextRecommendedTopic(
  studentId: string,
  curriculumId: string,
  schoolId: string
): Promise<LearningJourneyStep | null> {
  try {
    // Get all topics in curriculum
    const topicsResult = await query(
      `SELECT id, title, order_index, prerequisites FROM topics
       WHERE curriculum_id = $1
       ORDER BY order_index ASC`,
      [curriculumId]
    );

    const allTopics = topicsResult.rows;

    // Get student's mastery data
    const masteryResult = await query(
      `SELECT topic_id, mastery_score, mastered_at FROM topic_mastery
       WHERE student_id = $1`,
      [studentId]
    );

    const masteredTopicIds = new Set(
      masteryResult.rows
        .filter((r: any) => r.mastered_at)
        .map((r: any) => r.topic_id)
    );

    const masteryMap = Object.fromEntries(
      masteryResult.rows.map((r: any) => [r.topic_id, r.mastery_score])
    );

    // Algorithm: Find next topic based on curriculum order and prerequisites
    for (const topic of allTopics) {
      // Skip if already mastered
      if (masteredTopicIds.has(topic.id)) continue;

      // Check prerequisites
      const prerequisites = topic.prerequisites || [];
      const prereqsMet = prerequisites.length === 0 || 
        prerequisites.every((prereqId: string) => masteredTopicIds.has(prereqId));

      if (prereqsMet) {
        return {
          type: 'new_topic',
          topicId: topic.id,
          title: topic.title,
          reason: 'Next topic in curriculum sequence',
          difficulty: 5, // Default
        };
      }
    }

    // No new topics: check for revision opportunities (struggling with previous topics)
    for (const topic of allTopics) {
      const score = masteryMap[topic.id];
      if (score && score < 70 && score >= 1) {
        // Struggling: suggest revision
        return {
          type: 'revision',
          topicId: topic.id,
          title: topic.title,
          reason: `Review needed: You scored ${Math.round(score)}% last time`,
          difficulty: Math.max(1, score / 10),
        };
      }
    }

    // All topics mastered: suggest enrichment on last topic
    const lastMasteredTopic = allTopics
      .filter((t: any) => masteredTopicIds.has(t.id))
      .pop();

    if (lastMasteredTopic) {
      return {
        type: 'enrichment',
        topicId: lastMasteredTopic.id,
        title: lastMasteredTopic.title,
        reason: 'Advanced exploration of mastered topic',
        difficulty: 8,
      };
    }

    return null;
  } catch (error) {
    log.error('Error determining next topic:', error);
    throw error;
  }
}

/**
 * Update learning plan based on latest progress
 */
export async function updateLearningPlan(
  studentId: string,
  schoolId: string
): Promise<any> {
  try {
    const dnaInfluence = await LearningDNAService.getInfluenceForStudent(studentId, schoolId);

    // Get next recommended topic
    const learningPlan = await query(
      'SELECT curriculum_id FROM learning_plans WHERE student_id = $1',
      [studentId]
    );

    if (!learningPlan.rows[0]) return null;

    const curriculumId = learningPlan.rows[0].curriculum_id;

    // Determine best next topic
    // (In production, this would be more sophisticated)
    const topicsResult = await query(
      `SELECT t.id, t.order_index
       FROM topics t
       LEFT JOIN topic_mastery tm ON t.id = tm.topic_id AND tm.student_id = $1
       WHERE t.curriculum_id = $2
       AND tm.id IS NULL  -- Not yet attempted
       ORDER BY t.order_index ASC
       LIMIT 1`,
      [studentId, curriculumId]
    );

    if (topicsResult.rows[0]) {
      const nextTopicId = topicsResult.rows[0].id;

      // Update learning plan
      await query(
        `UPDATE learning_plans
         SET current_topic_id = $1,
             adaptive_difficulty = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $3`,
        [nextTopicId, dnaInfluence.adaptiveDifficulty, studentId]
      );
    } else {
      await query(
        `UPDATE learning_plans
         SET adaptive_difficulty = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $2`,
        [dnaInfluence.adaptiveDifficulty, studentId]
      );
    }
  } catch (error) {
    log.error('Error updating learning plan:', error);
    throw error;
  }
}

/**
 * Get student's overall progress in curriculum
 */
export async function getProgressSummary(
  studentId: string,
  curriculumId: string
) {
  try {
    // Total topics in curriculum
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM topics WHERE curriculum_id = $1`,
      [curriculumId]
    );

    // Mastered topics
    const masteredResult = await query(
      `SELECT COUNT(tm.id) as count
       FROM topic_mastery tm
       JOIN topics t ON tm.topic_id = t.id
       WHERE tm.student_id = $1 AND t.curriculum_id = $2 AND tm.mastered_at IS NOT NULL`,
      [studentId, curriculumId]
    );

    // In progress
    const inProgressResult = await query(
      `SELECT COUNT(tm.id) as count
       FROM topic_mastery tm
       JOIN topics t ON tm.topic_id = t.id
       WHERE tm.student_id = $1 AND t.curriculum_id = $2 AND tm.mastered_at IS NULL`,
      [studentId, curriculumId]
    );

    // Average mastery
    const avgResult = await query(
      `SELECT AVG(mastery_score) as avg
       FROM topic_mastery tm
       JOIN topics t ON tm.topic_id = t.id
       WHERE tm.student_id = $1 AND t.curriculum_id = $2`,
      [studentId, curriculumId]
    );

    const total = parseInt(totalResult.rows[0].count);
    const mastered = parseInt(masteredResult.rows[0].count);
    const inProgress = parseInt(inProgressResult.rows[0].count);
    const avgMastery = avgResult.rows[0].avg ? parseFloat(avgResult.rows[0].avg) : 0;

    return {
      totalTopics: total,
      masteredTopics: mastered,
      inProgressTopics: inProgress,
      notStartedTopics: total - mastered - inProgress,
      progressPercentage: total > 0 ? (mastered / total) * 100 : 0,
      averageMasteryScore: avgMastery,
      estimatedCompletion: estimateCompletionDate(inProgress, avgMastery),
    };
  } catch (error) {
    log.error('Error fetching progress summary:', error);
    throw error;
  }
}

/**
 * Estimate when student will complete curriculum
 * Based on current pace and mastery
 */
function estimateCompletionDate(topicsRemaining: number, avgMasteryScore: number): Date {
  // Assume 1-2 topics per week depending on mastery
  const paceMultiplier = avgMasteryScore > 80 ? 1 : 1.5; // Slower if struggling
  const daysPerTopic = 7 * paceMultiplier / 1.5; // Hours per week -> days per topic
  const daysRemaining = topicsRemaining * daysPerTopic;

  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysRemaining);
  return completionDate;
}
