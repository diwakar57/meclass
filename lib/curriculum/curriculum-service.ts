// lib/curriculum/curriculum-service.ts - Curriculum and topic management

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';

const log = createLogger('CurriculumService');

export interface CurriculumData {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  gradeLevel: string;
  subject: string;
  createdByTeacherId?: string;
  isCore: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicData {
  id: string;
  curriculumId: string;
  schoolId: string;
  title: string;
  description?: string;
  learningObjectives: string[];
  gradeLevel: string;
  orderIndex: number;
  estimatedDurationMinutes?: number;
  prerequisites: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create curriculum
 */
export async function createCurriculum(
  schoolId: string,
  name: string,
  subject: string,
  gradeLevel: string,
  createdByTeacherId?: string
): Promise<CurriculumData> {
  try {
    const id = nanoid();

    const result = await query(
      `INSERT INTO curriculum
       (id, school_id, name, subject, grade_level, created_by_teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, school_id, name, description, grade_level, subject,
                 created_by_teacher_id, is_core, created_at, updated_at`,
      [id, schoolId, name, subject, gradeLevel, createdByTeacherId || null]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      schoolId: row.school_id,
      name: row.name,
      description: row.description,
      gradeLevel: row.grade_level,
      subject: row.subject,
      createdByTeacherId: row.created_by_teacher_id,
      isCore: row.is_core,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error creating curriculum:', error);
    throw error;
  }
}

/**
 * Create topic
 */
export async function createTopic(
  curriculumId: string,
  schoolId: string,
  title: string,
  learningObjectives: string[],
  gradeLevel: string,
  orderIndex: number
): Promise<TopicData> {
  try {
    const id = nanoid();

    const result = await query(
      `INSERT INTO topics
       (id, curriculum_id, school_id, title, learning_objectives, grade_level, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, curriculum_id, school_id, title, description, learning_objectives,
                 grade_level, order_index, estimated_duration_minutes, prerequisites,
                 created_at, updated_at`,
      [id, curriculumId, schoolId, title, learningObjectives, gradeLevel, orderIndex]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      curriculumId: row.curriculum_id,
      schoolId: row.school_id,
      title: row.title,
      description: row.description,
      learningObjectives: row.learning_objectives,
      gradeLevel: row.grade_level,
      orderIndex: row.order_index,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      prerequisites: row.prerequisites,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error creating topic:', error);
    throw error;
  }
}

/**
 * Get topic with all details
 */
export async function getTopic(topicId: string): Promise<TopicData | null> {
  try {
    const result = await query(
      `SELECT id, curriculum_id, school_id, title, description, learning_objectives,
              grade_level, order_index, estimated_duration_minutes, prerequisites,
              created_at, updated_at
       FROM topics WHERE id = $1`,
      [topicId]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      curriculumId: row.curriculum_id,
      schoolId: row.school_id,
      title: row.title,
      description: row.description,
      learningObjectives: row.learning_objectives,
      gradeLevel: row.grade_level,
      orderIndex: row.order_index,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      prerequisites: row.prerequisites,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error fetching topic:', error);
    throw error;
  }
}

/**
 * List topics for curriculum
 */
export async function listTopics(curriculumId: string): Promise<TopicData[]> {
  try {
    const result = await query(
      `SELECT id, curriculum_id, school_id, title, description, learning_objectives,
              grade_level, order_index, estimated_duration_minutes, prerequisites,
              created_at, updated_at
       FROM topics
       WHERE curriculum_id = $1
       ORDER BY order_index ASC`,
      [curriculumId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      curriculumId: row.curriculum_id,
      schoolId: row.school_id,
      title: row.title,
      description: row.description,
      learningObjectives: row.learning_objectives,
      gradeLevel: row.grade_level,
      orderIndex: row.order_index,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      prerequisites: row.prerequisites,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    log.error('Error listing topics:', error);
    throw error;
  }
}

/**
 * List curricula for school
 */
export async function listCurricula(schoolId: string): Promise<CurriculumData[]> {
  try {
    const result = await query(
      `SELECT id, school_id, name, description, grade_level, subject,
              created_by_teacher_id, is_core, created_at, updated_at
       FROM curriculum
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [schoolId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      schoolId: row.school_id,
      name: row.name,
      description: row.description,
      gradeLevel: row.grade_level,
      subject: row.subject,
      createdByTeacherId: row.created_by_teacher_id,
      isCore: row.is_core,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    log.error('Error listing curricula:', error);
    throw error;
  }
}
