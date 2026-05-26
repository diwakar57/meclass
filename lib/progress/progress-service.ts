// lib/progress/progress-service.ts - Student progress and mastery tracking

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import { LearningDNAService } from '@/lib/services/learning-dna';
import { updateLearningPlan } from '@/lib/student/learning-journey';

const log = createLogger('ProgressService');

export interface TopicMastery {
  id: string;
  studentId: string;
  topicId: string;
  schoolId: string;
  masteryScore: number; // 0-100
  confidenceLevel: number; // 0-100
  attempts: number;
  correctAttempts: number;
  lastAttemptedAt?: Date;
  masteredAt?: Date;
  updatedAt: Date;
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  lessonId: string;
  topicId?: string;
  schoolId: string;
  score: number;
  maxScore: number;
  timeTakenSeconds: number;
  responses: any[];
  feedback?: any;
  completedAt: Date;
}

/**
 * Record quiz attempt
 */
export async function recordQuizAttempt(
  studentId: string,
  lessonId: string,
  schoolId: string,
  topicId: string | undefined,
  score: number,
  maxScore: number,
  timeTaken: number,
  responses: any[],
  feedback?: any
): Promise<QuizAttempt> {
  try {
    const id = nanoid();
    const now = new Date();

    const result = await query(
      `INSERT INTO quiz_attempts
       (id, student_id, lesson_id, topic_id, school_id, score, max_score,
        time_taken_seconds, responses, feedback, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, student_id, lesson_id, topic_id, school_id, score, max_score,
                 time_taken_seconds, responses, feedback, completed_at`,
      [
        id,
        studentId,
        lessonId,
        topicId || null,
        schoolId,
        score,
        maxScore,
        timeTaken,
        JSON.stringify(responses),
        feedback ? JSON.stringify(feedback) : null,
        now,
      ]
    );

    const row = result.rows[0];

    // Update topic mastery if topicId provided
    if (topicId) {
      await updateTopicMastery(studentId, topicId, schoolId, score / maxScore * 100);
    }

    await LearningDNAService.updateFromSession({
      studentId,
      schoolId,
      topicId,
      score,
      maxScore,
      timeTakenSeconds: timeTaken,
      responses,
      source: 'quiz',
    });

    await updateLearningPlan(studentId, schoolId);

    return {
      id: row.id,
      studentId: row.student_id,
      lessonId: row.lesson_id,
      topicId: row.topic_id,
      schoolId: row.school_id,
      score: row.score,
      maxScore: row.max_score,
      timeTakenSeconds: row.time_taken_seconds,
      responses: JSON.parse(row.responses),
      feedback: row.feedback ? JSON.parse(row.feedback) : undefined,
      completedAt: row.completed_at,
    };
  } catch (error) {
    log.error('Error recording quiz attempt:', error);
    throw error;
  }
}

/**
 * Update topic mastery based on quiz performance
 */
export async function updateTopicMastery(
  studentId: string,
  topicId: string,
  schoolId: string,
  newScore: number
): Promise<TopicMastery> {
  try {
    // Check if mastery record exists
    const existing = await query(
      `SELECT * FROM topic_mastery WHERE student_id = $1 AND topic_id = $2`,
      [studentId, topicId]
    );

    let result;

    if (existing.rows[0]) {
      // Update existing
      const prev = existing.rows[0];
      const newAttempts = prev.attempts + 1;
      const newCorrect = prev.correct_attempts + (newScore >= 80 ? 1 : 0);
      const avgScore = ((prev.mastery_score * prev.attempts) + newScore) / newAttempts;

      result = await query(
        `UPDATE topic_mastery
         SET attempts = $1, correct_attempts = $2, mastery_score = $3,
             confidence_level = $4, last_attempted_at = CURRENT_TIMESTAMP,
             mastered_at = CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE mastered_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $6 AND topic_id = $7
         RETURNING id, student_id, topic_id, school_id, mastery_score, confidence_level,
                   attempts, correct_attempts, last_attempted_at, mastered_at, updated_at`,
        [
          newAttempts,
          newCorrect,
          avgScore,
          (newCorrect / newAttempts) * 100, // confidence = % correct
          newScore >= 80, // Mark as mastered if score >= 80
          studentId,
          topicId,
        ]
      );
    } else {
      // Create new
      const id = nanoid();
      result = await query(
        `INSERT INTO topic_mastery
         (id, student_id, topic_id, school_id, mastery_score, confidence_level,
          attempts, correct_attempts, last_attempted_at, mastered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, 
                 CASE WHEN $9 THEN CURRENT_TIMESTAMP ELSE NULL END)
         RETURNING id, student_id, topic_id, school_id, mastery_score, confidence_level,
                   attempts, correct_attempts, last_attempted_at, mastered_at, updated_at`,
        [
          id,
          studentId,
          topicId,
          schoolId,
          newScore,
          newScore >= 80 ? 100 : newScore, // Initial confidence
          1,
          newScore >= 80 ? 1 : 0,
          newScore >= 80, // Mark as mastered if score >= 80
        ]
      );
    }

    const row = result.rows[0];
    return {
      id: row.id,
      studentId: row.student_id,
      topicId: row.topic_id,
      schoolId: row.school_id,
      masteryScore: row.mastery_score,
      confidenceLevel: row.confidence_level,
      attempts: row.attempts,
      correctAttempts: row.correct_attempts,
      lastAttemptedAt: row.last_attempted_at,
      masteredAt: row.mastered_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error updating topic mastery:', error);
    throw error;
  }
}

/**
 * Get student's mastery for a topic
 */
export async function getTopicMastery(
  studentId: string,
  topicId: string
): Promise<TopicMastery | null> {
  try {
    const result = await query(
      `SELECT id, student_id, topic_id, school_id, mastery_score, confidence_level,
              attempts, correct_attempts, last_attempted_at, mastered_at, updated_at
       FROM topic_mastery
       WHERE student_id = $1 AND topic_id = $2`,
      [studentId, topicId]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      studentId: row.student_id,
      topicId: row.topic_id,
      schoolId: row.school_id,
      masteryScore: row.mastery_score,
      confidenceLevel: row.confidence_level,
      attempts: row.attempts,
      correctAttempts: row.correct_attempts,
      lastAttemptedAt: row.last_attempted_at,
      masteredAt: row.mastered_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error fetching topic mastery:', error);
    throw error;
  }
}

/**
 * Get all quiz attempts for student
 */
export async function getStudentQuizAttempts(
  studentId: string,
  limit = 50,
  offset = 0
) {
  try {
    const result = await query(
      `SELECT id, student_id, lesson_id, topic_id, school_id, score, max_score,
              time_taken_seconds, responses, feedback, completed_at
       FROM quiz_attempts
       WHERE student_id = $1
       ORDER BY completed_at DESC
       LIMIT $2 OFFSET $3`,
      [studentId, limit, offset]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      lessonId: row.lesson_id,
      topicId: row.topic_id,
      schoolId: row.school_id,
      score: row.score,
      maxScore: row.max_score,
      timeTakenSeconds: row.time_taken_seconds,
      responses: JSON.parse(row.responses),
      feedback: row.feedback ? JSON.parse(row.feedback) : undefined,
      completedAt: row.completed_at,
    }));
  } catch (error) {
    log.error('Error fetching quiz attempts:', error);
    throw error;
  }
}

/**
 * Get class-level progress summary
 */
export async function getClassProgressSummary(classId: string) {
  try {
    // Get all students in class
    const students = await query(
      `SELECT DISTINCT ce.student_id
       FROM class_enrollments ce
       WHERE ce.class_id = $1`,
      [classId]
    );

    const summaries = [];

    for (const enrollmentRow of students.rows) {
      const studentId = enrollmentRow.student_id;

      // Get user info
      const userResult = await query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [studentId]
      );

      // Get progress stats
      const statsResult = await query(
        `SELECT COUNT(*) as total_topics, 
                SUM(CASE WHEN mastered_at IS NOT NULL THEN 1 ELSE 0 END) as mastered_topics,
                AVG(mastery_score) as avg_mastery
         FROM topic_mastery WHERE student_id = $1`,
        [studentId]
      );

      if (userResult.rows[0]) {
        summaries.push({
          studentId,
          firstName: userResult.rows[0].first_name,
          lastName: userResult.rows[0].last_name,
          email: userResult.rows[0].email,
          totalTopics: parseInt(statsResult.rows[0].total_topics || 0),
          masteredTopics: parseInt(statsResult.rows[0].mastered_topics || 0),
          avgMastery: statsResult.rows[0].avg_mastery ? parseFloat(statsResult.rows[0].avg_mastery) : 0,
        });
      }
    }

    return summaries;
  } catch (error) {
    log.error('Error fetching class progress summary:', error);
    throw error;
  }
}
