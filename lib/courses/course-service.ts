/**
 * Course Database Service - CRUD operations for courses
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import type { Course } from '@/lib/types/courses';

const log = createLogger('CourseService');

/**
 * Create new course record
 */
export async function createCourse(
  schoolId: string,
  studentId: string,
  syllabusId: string,
  title: string,
  description: string,
  status: 'pending' | 'generating' | 'success' | 'failed' = 'pending'
): Promise<Course> {
  try {
    const id = nanoid();
    const now = new Date();

    const result = await query(
      `INSERT INTO courses
       (id, school_id, student_id, syllabus_id, title, description, generation_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, school_id, student_id, syllabus_id, title, description, file_path, file_size,
                 generation_status, error_message, generated_at, created_at, updated_at`,
      [id, schoolId, studentId, syllabusId, title, description, status, now, now]
    );

    if (!result.rows[0]) {
      throw new Error('Failed to create course');
    }

    return rowToCourse(result.rows[0]);
  } catch (error) {
    log.error('Error creating course:', error);
    throw error;
  }
}

/**
 * Get course by ID
 */
export async function getCourse(id: string): Promise<Course | null> {
  try {
    const result = await query(
      `SELECT id, school_id, student_id, syllabus_id, title, description, file_path, file_size,
              generation_status, error_message, generated_at, created_at, updated_at
       FROM courses WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? rowToCourse(result.rows[0]) : null;
  } catch (error) {
    log.error('Error fetching course:', error);
    throw error;
  }
}

/**
 * List all courses for a student
 */
export async function listStudentCourses(
  studentId: string,
  limit = 50,
  offset = 0
): Promise<Course[]> {
  try {
    const result = await query(
      `SELECT id, school_id, student_id, syllabus_id, title, description, file_path, file_size,
              generation_status, error_message, generated_at, created_at, updated_at
       FROM courses
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [studentId, limit, offset]
    );

    return result.rows.map((row: any) => rowToCourse(row));
  } catch (error) {
    log.error('Error listing student courses:', error);
    throw error;
  }
}

/**
 * Update course generation status
 */
export async function updateCourseStatus(
  id: string,
  schoolId: string,
  updates: {
    generationStatus?: 'pending' | 'generating' | 'success' | 'failed';
    filePath?: string;
    fileSize?: number;
    errorMessage?: string;
    generatedAt?: Date;
  }
): Promise<Course> {
  try {
    const updateFields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];
    let paramIdx = 1;

    if (updates.generationStatus !== undefined) {
      updateFields.push(`generation_status = $${paramIdx++}`);
      params.push(updates.generationStatus);
    }

    if (updates.filePath !== undefined) {
      updateFields.push(`file_path = $${paramIdx++}`);
      params.push(updates.filePath || null);
    }

    if (updates.fileSize !== undefined) {
      updateFields.push(`file_size = $${paramIdx++}`);
      params.push(updates.fileSize || null);
    }

    if (updates.errorMessage !== undefined) {
      updateFields.push(`error_message = $${paramIdx++}`);
      params.push(updates.errorMessage || null);
    }

    if (updates.generatedAt !== undefined) {
      updateFields.push(`generated_at = $${paramIdx++}`);
      params.push(updates.generatedAt || null);
    }

    params.push(id);
    params.push(schoolId);

    const result = await query(
      `UPDATE courses
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIdx++} AND school_id = $${paramIdx++}
       RETURNING id, school_id, student_id, syllabus_id, title, description, file_path, file_size,
                 generation_status, error_message, generated_at, created_at, updated_at`,
      params
    );

    if (!result.rows[0]) {
      throw new Error('Course not found or unauthorized');
    }

    return rowToCourse(result.rows[0]);
  } catch (error) {
    log.error('Error updating course status:', error);
    throw error;
  }
}

/**
 * Delete course
 */
export async function deleteCourse(id: string, schoolId: string): Promise<void> {
  try {
    const result = await query(
      `DELETE FROM courses WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );

    if (result.rowCount === 0) {
      throw new Error('Course not found or unauthorized');
    }
  } catch (error) {
    log.error('Error deleting course:', error);
    throw error;
  }
}

/**
 * Count courses for a student
 */
export async function countStudentCourses(studentId: string): Promise<number> {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM courses WHERE student_id = $1`,
      [studentId]
    );

    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (error) {
    log.error('Error counting courses:', error);
    throw error;
  }
}

/**
 * Get all pending course generations (for queue processing)
 */
export async function getPendingCourses(limit = 10): Promise<Course[]> {
  try {
    const result = await query(
      `SELECT id, school_id, student_id, syllabus_id, title, description, file_path, file_size,
              generation_status, error_message, generated_at, created_at, updated_at
       FROM courses
       WHERE generation_status IN ('pending', 'generating')
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row: any) => rowToCourse(row));
  } catch (error) {
    log.error('Error fetching pending courses:', error);
    throw error;
  }
}

/**
 * Convert database row to Course object
 */
function rowToCourse(row: any): Course {
  return {
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    syllabusId: row.syllabus_id,
    title: row.title,
    description: row.description,
    filePath: row.file_path,
    fileSize: row.file_size,
    generationStatus: row.generation_status,
    errorMessage: row.error_message,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
