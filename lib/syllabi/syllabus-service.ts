/**
 * Syllabus Database Service - CRUD operations
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import type { TeacherSyllabus, UpdateSyllabusInput, ParsedSyllabusContent } from '@/lib/types/syllabi';

const log = createLogger('SyllabusService');

/**
 * Create a new syllabus
 */
export async function createSyllabus(
  schoolId: string,
  teacherId: string,
  title: string,
  description: string | undefined,
  contentParsed: ParsedSyllabusContent,
  format: 'pdf' | 'text' | 'form'
): Promise<TeacherSyllabus> {
  try {
    const id = nanoid();
    const now = new Date();

    const result = await query(
      `INSERT INTO teacher_syllabi
       (id, school_id, teacher_id, title, description, content_parsed, format, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, school_id, teacher_id, title, description, content_parsed, format, created_at, updated_at`,
      [id, schoolId, teacherId, title, description || null, JSON.stringify(contentParsed), format, now, now]
    );

    if (!result.rows[0]) {
      throw new Error('Failed to create syllabus');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      schoolId: row.school_id,
      teacherId: row.teacher_id,
      title: row.title,
      description: row.description,
      contentParsed: typeof row.content_parsed === 'string'
        ? JSON.parse(row.content_parsed)
        : row.content_parsed,
      format: row.format,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error creating syllabus:', error);
    throw error;
  }
}

/**
 * Get syllabus by ID
 */
export async function getSyllabus(id: string): Promise<TeacherSyllabus | null> {
  try {
    const result = await query(
      `SELECT id, school_id, teacher_id, title, description, content_parsed, format, created_at, updated_at
       FROM teacher_syllabi
       WHERE id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      schoolId: row.school_id,
      teacherId: row.teacher_id,
      title: row.title,
      description: row.description,
      contentParsed: typeof row.content_parsed === 'string'
        ? JSON.parse(row.content_parsed)
        : row.content_parsed,
      format: row.format,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error fetching syllabus:', error);
    throw error;
  }
}

/**
 * List all syllabi for a school
 */
export async function listSyllabi(
  schoolId: string,
  teacherId?: string,
  limit = 50,
  offset = 0
): Promise<TeacherSyllabus[]> {
  try {
    const params: any[] = [schoolId];
    let whereClause = 'school_id = $1';

    if (teacherId) {
      whereClause += ` AND teacher_id = $${params.length + 1}`;
      params.push(teacherId);
    }

    const result = await query(
      `SELECT id, school_id, teacher_id, title, description, content_parsed, format, created_at, updated_at
       FROM teacher_syllabi
       WHERE ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      schoolId: row.school_id,
      teacherId: row.teacher_id,
      title: row.title,
      description: row.description,
      contentParsed: typeof row.content_parsed === 'string'
        ? JSON.parse(row.content_parsed)
        : row.content_parsed,
      format: row.format,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    log.error('Error listing syllabi:', error);
    throw error;
  }
}

/**
 * Update syllabus
 */
export async function updateSyllabus(
  id: string,
  schoolId: string,
  input: UpdateSyllabusInput
): Promise<TeacherSyllabus> {
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIdx++}`);
      values.push(input.title);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      values.push(input.description || null);
    }

    if (input.contentParsed !== undefined) {
      updates.push(`content_parsed = $${paramIdx++}`);
      values.push(JSON.stringify(input.contentParsed));
    }

    updates.push(`updated_at = $${paramIdx++}`);
    values.push(new Date());

    values.push(id);
    values.push(schoolId);

    const result = await query(
      `UPDATE teacher_syllabi
       SET ${updates.join(', ')}
       WHERE id = $${paramIdx++} AND school_id = $${paramIdx++}
       RETURNING id, school_id, teacher_id, title, description, content_parsed, format, created_at, updated_at`,
      values
    );

    if (!result.rows[0]) {
      throw new Error('Syllabus not found or unauthorized');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      schoolId: row.school_id,
      teacherId: row.teacher_id,
      title: row.title,
      description: row.description,
      contentParsed: typeof row.content_parsed === 'string'
        ? JSON.parse(row.content_parsed)
        : row.content_parsed,
      format: row.format,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error updating syllabus:', error);
    throw error;
  }
}

/**
 * Delete syllabus
 */
export async function deleteSyllabus(id: string, schoolId: string): Promise<void> {
  try {
    const result = await query(
      `DELETE FROM teacher_syllabi
       WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );

    if (result.rowCount === 0) {
      throw new Error('Syllabus not found or unauthorized');
    }
  } catch (error) {
    log.error('Error deleting syllabus:', error);
    throw error;
  }
}

/**
 * Count syllabi for a school
 */
export async function countSyllabi(schoolId: string, teacherId?: string): Promise<number> {
  try {
    const params: any[] = [schoolId];
    let whereClause = 'school_id = $1';

    if (teacherId) {
      whereClause += ` AND teacher_id = $${params.length + 1}`;
      params.push(teacherId);
    }

    const result = await query(
      `SELECT COUNT(*) as count FROM teacher_syllabi WHERE ${whereClause}`,
      params
    );

    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (error) {
    log.error('Error counting syllabi:', error);
    throw error;
  }
}
