/**
 * lib/repositories/syllabus-repository.ts
 * Data access layer for syllabus management
 * Handles all CRUD operations with tenant isolation
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type {
  Grade,
  Subject,
  Syllabus,
  SyllabusTopic,
  SyllabusUnit,
  TopicDependency,
  SyllabusVersion,
  SyllabusStatus,
  DifficultyLevel,
} from '@/lib/types/syllabi';

const log = createLogger('SyllabusRepository');

// ============================================================================
// GRADES REPOSITORY
// ============================================================================

export const gradesRepository = {
  async create(data: {
    schoolId: string;
    name: string;
    level: number;
  }): Promise<Grade> {
    const result = await query(
      `INSERT INTO grade_levels (school_id, name, level)
       VALUES ($1, $2, $3)
       RETURNING id, school_id, name, level, created_at, updated_at`,
      [data.schoolId, data.name, data.level]
    );

    if (!result.rows[0]) throw new Error('Failed to create grade');
    return mapRowToGrade(result.rows[0]);
  },

  async getById(id: string, schoolId: string): Promise<Grade | null> {
    const result = await query(
      `SELECT id, school_id, name, level, created_at, updated_at
       FROM grade_levels
       WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );
    return result.rows[0] ? mapRowToGrade(result.rows[0]) : null;
  },

  async listBySchool(schoolId: string): Promise<Grade[]> {
    const result = await query(
      `SELECT id, school_id, name, level, created_at, updated_at
       FROM grade_levels
       WHERE school_id = $1
       ORDER BY level ASC`,
      [schoolId]
    );
    return result.rows.map(mapRowToGrade);
  },

  async deleteById(id: string, schoolId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM grade_levels WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );
    return result.rowCount > 0;
  },
};

// ============================================================================
// SUBJECTS REPOSITORY
// ============================================================================

export const subjectsRepository = {
  async create(data: {
    schoolId: string;
    name: string;
    code: string;
  }): Promise<Subject> {
    const result = await query(
      `INSERT INTO subjects (school_id, name, code)
       VALUES ($1, $2, $3)
       RETURNING id, school_id, name, code, created_at, updated_at`,
      [data.schoolId, data.name, data.code]
    );

    if (!result.rows[0]) throw new Error('Failed to create subject');
    return mapRowToSubject(result.rows[0]);
  },

  async getById(id: string, schoolId: string): Promise<Subject | null> {
    const result = await query(
      `SELECT id, school_id, name, code, created_at, updated_at
       FROM subjects
       WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );
    return result.rows[0] ? mapRowToSubject(result.rows[0]) : null;
  },

  async listBySchool(schoolId: string): Promise<Subject[]> {
    const result = await query(
      `SELECT id, school_id, name, code, created_at, updated_at
       FROM subjects
       WHERE school_id = $1
       ORDER BY name ASC`,
      [schoolId]
    );
    return result.rows.map(mapRowToSubject);
  },

  async deleteById(id: string, schoolId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM subjects WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );
    return result.rowCount > 0;
  },
};

// ============================================================================
// SYLLABI REPOSITORY
// ============================================================================

export const syllabiiRepository = {
  async create(data: {
    schoolId: string;
    gradeId: string;
    subjectId: string;
    teacherId: string;
    title: string;
  }): Promise<Syllabus> {
    const result = await query(
      `INSERT INTO syllabi (school_id, grade_id, subject_id, teacher_id, title, status, version)
       VALUES ($1, $2, $3, $4, $5, 'draft', 1)
       RETURNING id, school_id, grade_id, subject_id, teacher_id, title, status, version, published_at, created_at, updated_at`,
      [data.schoolId, data.gradeId, data.subjectId, data.teacherId, data.title]
    );

    if (!result.rows[0]) throw new Error('Failed to create syllabus');
    return mapRowToSyllabus(result.rows[0]);
  },

  async getById(id: string, schoolId: string): Promise<Syllabus | null> {
    const result = await query(
      `SELECT id, school_id, grade_id, subject_id, teacher_id, title, status, version, published_at, created_at, updated_at
       FROM syllabi
       WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );
    return result.rows[0] ? mapRowToSyllabus(result.rows[0]) : null;
  },

  async listBySchool(schoolId: string, filters?: {
    gradeId?: string;
    subjectId?: string;
    status?: SyllabusStatus;
    teacherId?: string;
  }, limit = 50, offset = 0): Promise<{ syllabi: Syllabus[]; total: number }> {
    let whereClause = 'WHERE school_id = $1';
    const params: any[] = [schoolId];
    let paramCount = 2;

    if (filters?.gradeId) {
      whereClause += ` AND grade_id = $${paramCount++}`;
      params.push(filters.gradeId);
    }
    if (filters?.subjectId) {
      whereClause += ` AND subject_id = $${paramCount++}`;
      params.push(filters.subjectId);
    }
    if (filters?.status) {
      whereClause += ` AND status = $${paramCount++}`;
      params.push(filters.status);
    }
    if (filters?.teacherId) {
      whereClause += ` AND teacher_id = $${paramCount++}`;
      params.push(filters.teacherId);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM syllabi ${whereClause}`,
      params
    );

    const listParams = [...params, limit, offset];
    const result = await query(
      `SELECT id, school_id, grade_id, subject_id, teacher_id, title, status, version, published_at, created_at, updated_at
       FROM syllabi
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      listParams
    );

    return {
      syllabi: result.rows.map(mapRowToSyllabus),
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  async update(id: string, schoolId: string, data: {
    title?: string;
    status?: SyllabusStatus;
  }): Promise<Syllabus | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.status) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
      if (data.status === 'published') {
        updates.push(`published_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.length === 0) return this.getById(id, schoolId);

    values.push(id, schoolId);
    const result = await query(
      `UPDATE syllabi SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount + 1} AND school_id = $${paramCount + 2}
       RETURNING id, school_id, grade_id, subject_id, teacher_id, title, status, version, published_at, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapRowToSyllabus(result.rows[0]) : null;
  },

  async delete(id: string, schoolId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM syllabi WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );
    return result.rowCount > 0;
  },
};

// ============================================================================
// SYLLABUS UNITS REPOSITORY
// ============================================================================

export const syllabusUnitsRepository = {
  async create(data: {
    syllabusId: string;
    title: string;
    description?: string;
    orderIndex: number;
  }): Promise<SyllabusUnit> {
    const result = await query(
      `INSERT INTO syllabus_units (syllabus_id, title, description, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id, syllabus_id, title, description, order_index, created_at, updated_at`,
      [data.syllabusId, data.title, data.description || null, data.orderIndex]
    );

    if (!result.rows[0]) throw new Error('Failed to create unit');
    return mapRowToSyllabusUnit(result.rows[0]);
  },

  async getBySyllabusId(syllabusId: string): Promise<SyllabusUnit[]> {
    const result = await query(
      `SELECT id, syllabus_id, title, description, order_index, created_at, updated_at
       FROM syllabus_units
       WHERE syllabus_id = $1
       ORDER BY order_index ASC`,
      [syllabusId]
    );
    return result.rows.map(mapRowToSyllabusUnit);
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    orderIndex?: number;
  }): Promise<SyllabusUnit | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description || null);
    }
    if (data.orderIndex !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(data.orderIndex);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE syllabus_units SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount + 1}
       RETURNING id, syllabus_id, title, description, order_index, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapRowToSyllabusUnit(result.rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM syllabus_units WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },
};

// ============================================================================
// SYLLABUS TOPICS REPOSITORY
// ============================================================================

export const syllabusTopicsRepository = {
  async create(data: {
    syllabusId: string;
    schoolId: string;
    title: string;
    description?: string;
    orderIndex: number;
    learningObjectives: string[];
    difficulty: DifficultyLevel;
    estimatedDurationMinutes?: number;
    syllabusUnitId?: string;
    sourceGradeId?: string;
  }): Promise<SyllabusTopic> {
    const result = await query(
      `INSERT INTO syllabus_topics
       (syllabus_id, school_id, title, description, order_index, learning_objectives, difficulty, estimated_duration_minutes, syllabus_unit_id, source_grade_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, syllabus_id, school_id, title, description, order_index, learning_objectives, difficulty, estimated_duration_minutes, syllabus_unit_id, source_grade_id, created_at, updated_at`,
      [
        data.syllabusId,
        data.schoolId,
        data.title,
        data.description || null,
        data.orderIndex,
        JSON.stringify(data.learningObjectives),
        data.difficulty,
        data.estimatedDurationMinutes || null,
        data.syllabusUnitId || null,
        data.sourceGradeId || null,
      ]
    );

    if (!result.rows[0]) throw new Error('Failed to create topic');
    return mapRowToSyllabusTopic(result.rows[0]);
  },

  async getBySyllabusId(syllabusId: string): Promise<SyllabusTopic[]> {
    const result = await query(
      `SELECT id, syllabus_id, school_id, title, description, order_index, learning_objectives, difficulty, estimated_duration_minutes, syllabus_unit_id, source_grade_id, created_at, updated_at
       FROM syllabus_topics
       WHERE syllabus_id = $1
       ORDER BY order_index ASC`,
      [syllabusId]
    );
    return result.rows.map(mapRowToSyllabusTopic);
  },

  async getById(id: string): Promise<SyllabusTopic | null> {
    const result = await query(
      `SELECT id, syllabus_id, school_id, title, description, order_index, learning_objectives, difficulty, estimated_duration_minutes, syllabus_unit_id, source_grade_id, created_at, updated_at
       FROM syllabus_topics
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? mapRowToSyllabusTopic(result.rows[0]) : null;
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    learningObjectives?: string[];
    difficulty?: DifficultyLevel;
    estimatedDurationMinutes?: number;
  }): Promise<SyllabusTopic | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description || null);
    }
    if (data.learningObjectives) {
      updates.push(`learning_objectives = $${paramCount++}`);
      values.push(JSON.stringify(data.learningObjectives));
    }
    if (data.difficulty) {
      updates.push(`difficulty = $${paramCount++}`);
      values.push(data.difficulty);
    }
    if (data.estimatedDurationMinutes !== undefined) {
      updates.push(`estimated_duration_minutes = $${paramCount++}`);
      values.push(data.estimatedDurationMinutes || null);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE syllabus_topics SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount + 1}
       RETURNING id, syllabus_id, school_id, title, description, order_index, learning_objectives, difficulty, estimated_duration_minutes, syllabus_unit_id, source_grade_id, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapRowToSyllabusTopic(result.rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM syllabus_topics WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },
};

// ============================================================================
// TOPIC DEPENDENCIES REPOSITORY
// ============================================================================

export const topicDependenciesRepository = {
  async create(data: {
    topicId: string;
    dependsOnTopicId?: string;
    dependsOnTopicName?: string;
    dependsOnGradeId?: string;
  }): Promise<TopicDependency> {
    const result = await query(
      `INSERT INTO topic_dependencies (topic_id, depends_on_topic_id, depends_on_topic_name, depends_on_grade_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, topic_id, depends_on_topic_id, depends_on_topic_name, depends_on_grade_id, created_at`,
      [
        data.topicId,
        data.dependsOnTopicId || null,
        data.dependsOnTopicName || null,
        data.dependsOnGradeId || null,
      ]
    );

    if (!result.rows[0]) throw new Error('Failed to create dependency');
    return mapRowToTopicDependency(result.rows[0]);
  },

  async getByTopicId(topicId: string): Promise<TopicDependency[]> {
    const result = await query(
      `SELECT id, topic_id, depends_on_topic_id, depends_on_topic_name, depends_on_grade_id, created_at
       FROM topic_dependencies
       WHERE topic_id = $1`,
      [topicId]
    );
    return result.rows.map(mapRowToTopicDependency);
  },

  async deleteByTopicId(topicId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM topic_dependencies WHERE topic_id = $1`,
      [topicId]
    );
    return result.rowCount > 0;
  },
};

// ============================================================================
// SYLLABUS VERSIONS REPOSITORY
// ============================================================================

export const syllabusVersionsRepository = {
  async create(data: {
    syllabusId: string;
    version: number;
    changedBy?: string;
    changeNote?: string;
    snapshot: Record<string, any>;
  }): Promise<SyllabusVersion> {
    const result = await query(
      `INSERT INTO syllabus_versions (syllabus_id, version, changed_by, change_note, snapshot)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, syllabus_id, version, changed_by, change_note, snapshot, created_at`,
      [
        data.syllabusId,
        data.version,
        data.changedBy || null,
        data.changeNote || null,
        JSON.stringify(data.snapshot),
      ]
    );

    if (!result.rows[0]) throw new Error('Failed to create version');
    return mapRowToSyllabusVersion(result.rows[0]);
  },

  async getBySyllabusId(syllabusId: string): Promise<SyllabusVersion[]> {
    const result = await query(
      `SELECT id, syllabus_id, version, changed_by, change_note, snapshot, created_at
       FROM syllabus_versions
       WHERE syllabus_id = $1
       ORDER BY version DESC`,
      [syllabusId]
    );
    return result.rows.map(mapRowToSyllabusVersion);
  },

  async getByVersion(syllabusId: string, version: number): Promise<SyllabusVersion | null> {
    const result = await query(
      `SELECT id, syllabus_id, version, changed_by, change_note, snapshot, created_at
       FROM syllabus_versions
       WHERE syllabus_id = $1 AND version = $2`,
      [syllabusId, version]
    );
    return result.rows[0] ? mapRowToSyllabusVersion(result.rows[0]) : null;
  },
};

// ============================================================================
// MAPPERS
// ============================================================================

function mapRowToGrade(row: any): Grade {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    level: row.level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSubject(row: any): Subject {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    code: row.code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSyllabus(row: any): Syllabus {
  return {
    id: row.id,
    schoolId: row.school_id,
    gradeId: row.grade_id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    title: row.title,
    status: row.status,
    version: row.version,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSyllabusUnit(row: any): SyllabusUnit {
  return {
    id: row.id,
    syllabusId: row.syllabus_id,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSyllabusTopic(row: any): SyllabusTopic {
  return {
    id: row.id,
    syllabusId: row.syllabus_id,
    schoolId: row.school_id,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    learningObjectives: Array.isArray(row.learning_objectives) 
      ? row.learning_objectives 
      : JSON.parse(row.learning_objectives || '[]'),
    difficulty: row.difficulty,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    syllabusUnitId: row.syllabus_unit_id,
    sourceGradeId: row.source_grade_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTopicDependency(row: any): TopicDependency {
  return {
    id: row.id,
    topicId: row.topic_id,
    dependsOnTopicId: row.depends_on_topic_id,
    dependsOnTopicName: row.depends_on_topic_name,
    dependsOnGradeId: row.depends_on_grade_id,
    createdAt: row.created_at,
  };
}

function mapRowToSyllabusVersion(row: any): SyllabusVersion {
  return {
    id: row.id,
    syllabusId: row.syllabus_id,
    version: row.version,
    changedBy: row.changed_by,
    changeNote: row.change_note,
    snapshot: typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot,
    createdAt: row.created_at,
  };
}
