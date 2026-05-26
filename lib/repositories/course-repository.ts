/**
 * Course Repository
 * Data access layer for courses, course calendars, and course topics
 */

import { db } from '@/lib/db';
import type {
  Course,
  CourseCalendar,
  CourseTopic,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseStatus,
} from '@/lib/models/course-models';

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value as T;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

// ============================================================================
// COURSE REPOSITORY
// ============================================================================

export class CourseRepository {
  /**
   * Create a new course
   */
  static async createCourse(
    schoolId: string,
    teacherId: string,
    data: CreateCourseRequest
  ): Promise<Course> {
    const query = `
      INSERT INTO courses (
        school_id, teacher_id, grade_id, class_id, subject_id,
        title, description, syllabus_id, status, start_date, end_date,
        total_estimated_sessions, version, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await db.query(query, [
      schoolId,
      teacherId,
      data.gradeId,
      data.classId || null,
      data.subjectId,
      data.title,
      data.description,
      data.syllabusId || null,
      'draft',
      data.startDate,
      data.endDate,
      0, // Will be calculated from topics
      1,
      JSON.stringify(data.metadata || {}),
    ]);

    return this.formatCourse(result.rows[0]);
  }

  /**
   * Get course by ID
   */
  static async getCourse(courseId: string, schoolId: string): Promise<Course | null> {
    const query = `
      SELECT * FROM courses
      WHERE id = $1 AND school_id = $2
    `;

    const result = await db.query(query, [courseId, schoolId]);
    return result.rows.length > 0 ? this.formatCourse(result.rows[0]) : null;
  }

  /**
   * List courses for a teacher
   */
  static async listTeacherCourses(
    schoolId: string,
    teacherId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: CourseStatus;
      gradeId?: string;
    } = {}
  ): Promise<{ courses: Course[]; total: number }> {
    let query = `
      SELECT * FROM courses
      WHERE school_id = $1 AND teacher_id = $2
    `;
    const params: any[] = [schoolId, teacherId];
    let paramCount = 2;

    if (options.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(options.status);
    }

    if (options.gradeId) {
      paramCount++;
      query += ` AND grade_id = $${paramCount}`;
      params.push(options.gradeId);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Apply pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return {
      courses: result.rows.map((row) => this.formatCourse(row)),
      total,
    };
  }

  /**
   * List courses for a grade (principal view)
   */
  static async listCoursesByGrade(
    schoolId: string,
    gradeId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ courses: Course[]; total: number }> {
    let query = `
      SELECT * FROM courses
      WHERE school_id = $1 AND grade_id = $2
      ORDER BY created_at DESC
    `;
    const params: any[] = [schoolId, gradeId];

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM courses WHERE school_id = $1 AND grade_id = $2`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Apply pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query += ` LIMIT $3 OFFSET $4`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return {
      courses: result.rows.map((row) => this.formatCourse(row)),
      total,
    };
  }

  /**
   * Update course
   */
  static async updateCourse(
    courseId: string,
    schoolId: string,
    data: UpdateCourseRequest
  ): Promise<Course | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      params.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(data.description);
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      params.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      params.push(data.endDate);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(data.status);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      params.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) return this.getCourse(courseId, schoolId);

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(courseId, schoolId);

    const query = `
      UPDATE courses
      SET ${updates.join(', ')}
      WHERE id = $${paramCount + 1} AND school_id = $${paramCount + 2}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows.length > 0 ? this.formatCourse(result.rows[0]) : null;
  }

  /**
   * Delete course (soft delete via status)
   */
  static async deleteCourse(courseId: string, schoolId: string): Promise<boolean> {
    const query = `
      UPDATE courses
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND school_id = $2
    `;

    const result = await db.query(query, [courseId, schoolId]);
    return Number(result.rowCount || 0) > 0;
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private static formatCourse(row: any): Course {
    const metadata = row.metadata
      ? parseJsonField(row.metadata, {
          objectives: [],
          prerequisites: [],
          alignments: [],
        })
      : undefined;

    return {
      id: row.id,
      schoolId: row.school_id,
      teacherId: row.teacher_id,
      gradeId: row.grade_id,
      classId: row.class_id || undefined,
      subjectId: row.subject_id,
      title: row.title,
      description: row.description,
      syllabusId: row.syllabus_id || undefined,
      status: row.status,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      totalEstimatedSessions: row.total_estimated_sessions,
      version: row.version,
      metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// ============================================================================
// COURSE CALENDAR REPOSITORY
// ============================================================================

export class CourseCalendarRepository {
  /**
   * Create or update course calendar
   */
  static async setCourseCalendar(
    schoolId: string,
    courseId: string,
    data: {
      classSchedule: any;
      holidays: any[];
      noClassDates: Date[];
    }
  ): Promise<CourseCalendar> {
    const query = `
      INSERT INTO course_calendars (
        school_id, course_id, class_schedule, holidays, no_class_dates
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (course_id) DO UPDATE SET
        class_schedule = $3,
        holidays = $4,
        no_class_dates = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await db.query(query, [
      schoolId,
      courseId,
      JSON.stringify(data.classSchedule),
      JSON.stringify(data.holidays),
      JSON.stringify(data.noClassDates),
    ]);

    return this.formatCalendar(result.rows[0]);
  }

  /**
   * Get calendar for course
   */
  static async getCalendar(courseId: string, schoolId: string): Promise<CourseCalendar | null> {
    const query = `
      SELECT * FROM course_calendars
      WHERE course_id = $1 AND school_id = $2
    `;

    const result = await db.query(query, [courseId, schoolId]);
    return result.rows.length > 0 ? this.formatCalendar(result.rows[0]) : null;
  }

  private static formatCalendar(row: any): CourseCalendar {
    const noClassDates = parseJsonField<string[]>(row.no_class_dates, []);
    return {
      id: row.id,
      schoolId: row.school_id,
      courseId: row.course_id,
      classSchedule: parseJsonField(row.class_schedule, {}),
      holidays: parseJsonField(row.holidays, []),
      noClassDates: noClassDates.map((d: string) => new Date(d)),
      courseEndDate: row.course_end_date ? new Date(row.course_end_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// ============================================================================
// COURSE TOPIC REPOSITORY
// ============================================================================

export class CourseTopicRepository {
  /**
   * Add topics to course (bulk)
   */
  static async addTopics(courseId: string, schoolId: string, topics: any[]): Promise<CourseTopic[]> {
    if (topics.length === 0) return [];

    const values: any[] = [];
    let valueStr = '';

    topics.forEach((topic, idx) => {
      const baseIdx = idx * 8;
      if (idx > 0) valueStr += ', ';
      valueStr += `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, $${baseIdx + 8})`;

      values.push(
        courseId,
        schoolId,
        topic.topicId,
        topic.orderIndex,
        topic.estimatedSessions,
        topic.assessmentStrategy || 'quiz',
        JSON.stringify(topic.dependsOnTopicIds || []),
        JSON.stringify(topic.learningObjectives || [])
      );
    });

    const query = `
      INSERT INTO course_topics (
        course_id, school_id, topic_id, order_index, estimated_sessions,
        assessment_strategy, depends_on_topic_ids, learning_objectives
      ) VALUES ${valueStr}
      ON CONFLICT (course_id, topic_id) DO UPDATE SET
        order_index = EXCLUDED.order_index,
        estimated_sessions = EXCLUDED.estimated_sessions,
        assessment_strategy = EXCLUDED.assessment_strategy,
        depends_on_topic_ids = EXCLUDED.depends_on_topic_ids,
        learning_objectives = EXCLUDED.learning_objectives,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows.map((row) => this.formatTopic(row));
  }

  /**
   * Get topics for course
   */
  static async getTopics(courseId: string, schoolId: string): Promise<CourseTopic[]> {
    const query = `
      SELECT * FROM course_topics
      WHERE course_id = $1 AND school_id = $2
      ORDER BY order_index ASC
    `;

    const result = await db.query(query, [courseId, schoolId]);
    return result.rows.map((row) => this.formatTopic(row));
  }

  /**
   * Get total estimated sessions for course
   */
  static async getTotalEstimatedSessions(courseId: string): Promise<number> {
    const query = `
      SELECT SUM(estimated_sessions) as total
      FROM course_topics
      WHERE course_id = $1
    `;

    const result = await db.query(query, [courseId]);
    return result.rows[0]?.total || 0;
  }

  private static formatTopic(row: any): CourseTopic {
    return {
      id: row.id,
      courseId: row.course_id,
      topicId: row.topic_id,
      schoolId: row.school_id,
      orderIndex: row.order_index,
      estimatedSessions: row.estimated_sessions,
      dependsOnTopicIds: parseJsonField(row.depends_on_topic_ids, []),
      learningObjectives: parseJsonField(row.learning_objectives, []),
      assessmentStrategy: row.assessment_strategy,
      status: row.status || 'planned',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// ============================================================================
// SCHEDULED CLASS REPOSITORY
// ============================================================================

export class ScheduledClassRepository {
  /**
   * Create scheduled class
   */
  static async createScheduledClass(data: {
    learningPlanId: string;
    topicId: string;
    scheduledDate: Date;
    scheduledTime?: any;
    isRemediationClass: boolean;
    estimatedDurationMinutes: number;
  }): Promise<any> {
    const query = `
      INSERT INTO scheduled_classes (
        learning_plan_id, topic_id, scheduled_date, scheduled_time,
        is_remediation_class, estimated_duration_minutes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
      RETURNING *
    `;

    const result = await db.query(query, [
      data.learningPlanId,
      data.topicId,
      data.scheduledDate,
      data.scheduledTime ? JSON.stringify(data.scheduledTime) : null,
      data.isRemediationClass,
      data.estimatedDurationMinutes,
    ]);

    return this.formatScheduledClass(result.rows[0]);
  }

  /**
   * Bulk create scheduled classes
   */
  static async bulkCreateScheduledClasses(
    planId: string,
    classes: any[]
  ): Promise<any[]> {
    if (classes.length === 0) return [];

    const values: any[] = [];
    let valueStr = '';

    classes.forEach((cls, idx) => {
      const baseIdx = idx * 7;
      if (idx > 0) valueStr += ', ';
      valueStr += `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7})`;

      values.push(
        planId,
        cls.topicId,
        cls.scheduledDate,
        cls.scheduledTime ? JSON.stringify(cls.scheduledTime) : null,
        cls.isRemediationClass,
        cls.estimatedDurationMinutes,
        'scheduled'
      );
    });

    const query = `
      INSERT INTO scheduled_classes (
        learning_plan_id, topic_id, scheduled_date, scheduled_time,
        is_remediation_class, estimated_duration_minutes, status
      ) VALUES ${valueStr}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows.map((row) => this.formatScheduledClass(row));
  }

  /**
   * Get scheduled classes for learning plan
   */
  static async getScheduledClasses(
    learningPlanId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const query = `
      SELECT * FROM scheduled_classes
      WHERE learning_plan_id = $1
      ORDER BY scheduled_date ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [learningPlanId, limit, offset]);
    return result.rows.map((row) => this.formatScheduledClass(row));
  }

  private static formatScheduledClass(row: any): any {
    return {
      id: row.id,
      learningPlanId: row.learning_plan_id,
      topicId: row.topic_id,
      scheduledDate: new Date(row.scheduled_date),
      scheduledTime: parseJsonField(row.scheduled_time, undefined),
      isRemediationClass: row.is_remediation_class,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
