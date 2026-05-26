import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type {
  Grade,
  Subject,
  Syllabus,
  SyllabusStatus,
  Topic,
  TopicDependency,
} from '@/lib/types/models';

const log = createLogger('SyllabusRepository');

export interface CreateSyllabusInput {
  schoolId: string;
  gradeId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  status?: SyllabusStatus;
}

export interface UpdateSyllabusInput {
  title?: string;
  status?: SyllabusStatus;
  publishedAt?: Date | null;
  version?: number;
}

export interface TopicDependencyInput {
  dependsOnTopicId?: string;
  dependsOnTopicName?: string;
  dependsOnGradeId?: string;
}

export interface AddTopicInput {
  syllabusId: string;
  schoolId: string;
  title: string;
  description?: string;
  orderIndex: number;
  syllabusUnitId?: string;
  sourceGradeId?: string;
  dependencies?: TopicDependencyInput[];
}

export class SyllabusRepository {
  static async findGradeById(id: string, schoolId: string): Promise<Grade | null> {
    const result = await query(
      `SELECT id, school_id, name, level, created_at, updated_at
       FROM grade_levels
       WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.rowToGrade(result.rows[0]);
  }

  static async findSubjectById(id: string, schoolId: string): Promise<Subject | null> {
    const result = await query(
      `SELECT id, school_id, name, code, created_at, updated_at
       FROM subjects
       WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.rowToSubject(result.rows[0]);
  }

  static async createSyllabus(input: CreateSyllabusInput): Promise<Syllabus> {
    try {
      const result = await query(
        `INSERT INTO syllabi (school_id, grade_id, subject_id, teacher_id, title, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, school_id, grade_id, subject_id, teacher_id, title, status, version, published_at, created_at, updated_at`,
        [
          input.schoolId,
          input.gradeId,
          input.subjectId,
          input.teacherId,
          input.title,
          input.status || 'draft',
        ]
      );

      if (result.rowCount === 0) {
        throw new Error('Failed to create syllabus');
      }

      return this.rowToSyllabus(result.rows[0]);
    } catch (error) {
      log.error('Failed to create syllabus:', error);
      throw error;
    }
  }

  static async updateSyllabus(
    id: string,
    schoolId: string,
    input: UpdateSyllabusInput
  ): Promise<Syllabus | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }

    if (input.publishedAt !== undefined) {
      updates.push(`published_at = $${paramIndex++}`);
      values.push(input.publishedAt);
    }

    if (input.version !== undefined) {
      updates.push(`version = $${paramIndex++}`);
      values.push(input.version);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id, schoolId);
      return existing;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    values.push(id, schoolId);

    const result = await query(
      `UPDATE syllabi
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND school_id = $${paramIndex}
       RETURNING id, school_id, grade_id, subject_id, teacher_id, title, status, version, published_at, created_at, updated_at`,
      values
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.rowToSyllabus(result.rows[0]);
  }

  static async findById(id: string, schoolId: string): Promise<Syllabus | null> {
    const result = await query(
      `SELECT id, school_id, grade_id, subject_id, teacher_id, title, status, version, published_at, created_at, updated_at
       FROM syllabi
       WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.rowToSyllabus(result.rows[0]);
  }

  static async getSyllabusByGradeAndSubject(
    gradeId: string,
    subjectId: string,
    schoolId: string
  ): Promise<Syllabus | null> {
    const result = await query(
      `SELECT id, school_id, grade_id, subject_id, teacher_id, title, status, version, published_at, created_at, updated_at
       FROM syllabi
       WHERE grade_id = $1 AND subject_id = $2 AND school_id = $3
       ORDER BY version DESC
       LIMIT 1`,
      [gradeId, subjectId, schoolId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.rowToSyllabus(result.rows[0]);
  }

  static async addTopicToSyllabus(input: AddTopicInput): Promise<Topic> {
    const result = await query(
      `INSERT INTO syllabus_topics
       (syllabus_id, syllabus_unit_id, school_id, title, description, order_index, source_grade_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, syllabus_id, syllabus_unit_id, school_id, title, description, order_index, source_grade_id, created_at, updated_at`,
      [
        input.syllabusId,
        input.syllabusUnitId || null,
        input.schoolId,
        input.title,
        input.description || null,
        input.orderIndex,
        input.sourceGradeId || null,
      ]
    );

    if (result.rowCount === 0) {
      throw new Error('Failed to add topic');
    }

    const topic = this.rowToTopic(result.rows[0]);

    if (input.dependencies?.length) {
      for (const dep of input.dependencies) {
        await query(
          `INSERT INTO topic_dependencies (topic_id, depends_on_topic_id, depends_on_topic_name, depends_on_grade_id)
           VALUES ($1, $2, $3, $4)`,
          [
            topic.id,
            dep.dependsOnTopicId || null,
            dep.dependsOnTopicName || null,
            dep.dependsOnGradeId || null,
          ]
        );
      }
    }

    return topic;
  }

  static async getSyllabusTopics(syllabusId: string, schoolId: string): Promise<Topic[]> {
    const result = await query(
      `SELECT id, syllabus_id, syllabus_unit_id, school_id, title, description, order_index, source_grade_id, created_at, updated_at
       FROM syllabus_topics
       WHERE syllabus_id = $1 AND school_id = $2
       ORDER BY order_index ASC`,
      [syllabusId, schoolId]
    );

    return result.rows.map((row: any) => this.rowToTopic(row));
  }

  static async getDependenciesForTopic(topicId: string): Promise<TopicDependency[]> {
    const result = await query(
      `SELECT id, topic_id, depends_on_topic_id, depends_on_topic_name, depends_on_grade_id, created_at
       FROM topic_dependencies
       WHERE topic_id = $1`,
      [topicId]
    );

    return result.rows.map((row: any) => this.rowToTopicDependency(row));
  }

  static async getDependencyEdgesForSyllabus(
    syllabusId: string,
    schoolId: string
  ): Promise<Array<{ topicId: string; dependsOnTopicId: string }>> {
    const result = await query(
      `SELECT td.topic_id, td.depends_on_topic_id
       FROM topic_dependencies td
       INNER JOIN syllabus_topics st ON st.id = td.topic_id
       WHERE st.syllabus_id = $1
         AND st.school_id = $2
         AND td.depends_on_topic_id IS NOT NULL`,
      [syllabusId, schoolId]
    );

    return result.rows.map((row: any) => ({
      topicId: row.topic_id,
      dependsOnTopicId: row.depends_on_topic_id,
    }));
  }

  static async saveVersionSnapshot(
    syllabusId: string,
    version: number,
    changedBy: string,
    changeNote: string,
    snapshot: unknown
  ): Promise<void> {
    await query(
      `INSERT INTO syllabus_versions (syllabus_id, version, changed_by, change_note, snapshot)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (syllabus_id, version) DO NOTHING`,
      [syllabusId, version, changedBy, changeNote, JSON.stringify(snapshot)]
    );
  }

  private static rowToGrade(row: any): Grade {
    return {
      id: row.id,
      schoolId: row.school_id,
      name: row.name,
      level: row.level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static rowToSubject(row: any): Subject {
    return {
      id: row.id,
      schoolId: row.school_id,
      name: row.name,
      code: row.code,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static rowToSyllabus(row: any): Syllabus {
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

  private static rowToTopic(row: any): Topic {
    return {
      id: row.id,
      syllabusId: row.syllabus_id,
      syllabusUnitId: row.syllabus_unit_id,
      schoolId: row.school_id,
      title: row.title,
      description: row.description,
      orderIndex: row.order_index,
      sourceGradeId: row.source_grade_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static rowToTopicDependency(row: any): TopicDependency {
    return {
      id: row.id,
      topicId: row.topic_id,
      dependsOnTopicId: row.depends_on_topic_id,
      dependsOnTopicName: row.depends_on_topic_name,
      dependsOnGradeId: row.depends_on_grade_id,
      createdAt: row.created_at,
    };
  }
}
