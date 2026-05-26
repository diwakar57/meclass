/**
 * lib/services/syllabus-service.ts
 * Business logic and validation for syllabus management
 * Handles:
 * - Tenant isolation & authorization
 * - Validation of topics, objectives, dependencies
 * - Circular dependency detection
 * - Version management
 * - Publishing workflow
 */

import { createLogger } from '@/lib/logger';
import * as repo from '@/lib/repositories/syllabus-repository';
import type {
  Grade,
  Subject,
  Syllabus,
  SyllabusTopic,
  SyllabusUnit,
  SyllabusWithDetails,
  SyllabusListItem,
  ListSyllabiiParams,
  ListSyllabiiResult,
  CreateSyllabusRequest,
  UpdateSyllabusRequest,
  CreateSyllabusTopicRequest,
  TopicDependencyInput,
  SyllabusValidationResult,
  ValidationError,
} from '@/lib/types/syllabi';
import { query } from '@/lib/db';

const log = createLogger('SyllabusService');

// ============================================================================
// GRADES SERVICE
// ============================================================================

export const gradesService = {
  /**
   * Create a grade level for a school
   */
  async createGrade(
    schoolId: string,
    name: string,
    level: number,
    requestingUserId: string
  ): Promise<Grade> {
    log.info(`Creating grade "${name}" (level ${level}) for school ${schoolId}`);

    // Verify requester is principal/admin of school
    await verifySchoolAccess(schoolId, requestingUserId, ['principal', 'saas_admin']);

    // Validate
    if (!name || name.trim().length === 0) {
      throw new Error('Grade name is required');
    }
    if (level < 1) {
      throw new Error('Grade level must be positive');
    }

    // Check unique constraint
    const existing = await query(
      `SELECT id FROM grade_levels WHERE school_id = $1 AND (LOWER(name) = LOWER($2) OR level = $3)`,
      [schoolId, name, level]
    );
    if (existing.rows.length > 0) {
      throw new Error(`Grade "${name}" or level ${level} already exists for this school`);
    }

    return await repo.gradesRepository.create({ schoolId, name, level });
  },

  /**
   * List all grades for a school
   */
  async listGrades(schoolId: string, requestingUserId: string): Promise<Grade[]> {
    await verifySchoolAccess(schoolId, requestingUserId);
    return await repo.gradesRepository.listBySchool(schoolId);
  },
};

// ============================================================================
// SUBJECTS SERVICE
// ============================================================================

export const subjectsService = {
  /**
   * Create a subject for a school
   */
  async createSubject(
    schoolId: string,
    name: string,
    code: string,
    requestingUserId: string
  ): Promise<Subject> {
    log.info(`Creating subject "${name}" (${code}) for school ${schoolId}`);

    // Verify requester is principal/admin of school
    await verifySchoolAccess(schoolId, requestingUserId, ['principal', 'saas_admin']);

    // Validate
    if (!name || name.trim().length === 0) {
      throw new Error('Subject name is required');
    }
    if (!code || code.trim().length === 0) {
      throw new Error('Subject code is required');
    }

    // Check unique constraint
    const existing = await query(
      `SELECT id FROM subjects WHERE school_id = $1 AND (LOWER(name) = LOWER($2) OR code = $3)`,
      [schoolId, name, code.toUpperCase()]
    );
    if (existing.rows.length > 0) {
      throw new Error(`Subject "${name}" or code "${code}" already exists for this school`);
    }

    return await repo.subjectsRepository.create({
      schoolId,
      name,
      code: code.toUpperCase(),
    });
  },

  /**
   * List all subjects for a school
   */
  async listSubjects(schoolId: string, requestingUserId: string): Promise<Subject[]> {
    await verifySchoolAccess(schoolId, requestingUserId);
    return await repo.subjectsRepository.listBySchool(schoolId);
  },
};

// ============================================================================
// SYLLABUS SERVICE
// ============================================================================

export const syllabusService = {
  /**
   * Create a new syllabus (starts in draft status)
   */
  async createSyllabus(
    schoolId: string,
    data: CreateSyllabusRequest,
    requestingUserId: string
  ): Promise<Syllabus> {
    log.info(`Teacher ${requestingUserId} creating syllabus for grade=${data.gradeId}, subject=${data.subjectId}`);

    // Verify requester is teacher in the school
    await verifySchoolAccess(schoolId, requestingUserId, ['teacher', 'principal', 'saas_admin']);

    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Syllabus title is required');
    }
    if (!data.gradeId || !data.subjectId) {
      throw new Error('Grade and subject are required');
    }

    // Verify grade & subject exist and belong to this school
    const grade = await repo.gradesRepository.getById(data.gradeId, schoolId);
    if (!grade) {
      throw new Error(`Grade ${data.gradeId} not found or does not belong to this school`);
    }

    const subject = await repo.subjectsRepository.getById(data.subjectId, schoolId);
    if (!subject) {
      throw new Error(`Subject ${data.subjectId} not found or does not belong to this school`);
    }

    // Check for existing unpublished syllabus for same grade/subject
    const existingResult = await query(
      `SELECT id FROM syllabi WHERE school_id = $1 AND grade_id = $2 AND subject_id = $3 AND status != 'archived'`,
      [schoolId, data.gradeId, data.subjectId]
    );
    if (existingResult.rows.length > 0) {
      throw new Error(
        `A ${grade.name} ${subject.name} syllabus already exists. Archive it first to create a new one.`
      );
    }

    const syllabus = await repo.syllabiiRepository.create({
      schoolId,
      gradeId: data.gradeId,
      subjectId: data.subjectId,
      teacherId: requestingUserId,
      title: data.title,
    });

    // Create units if provided
    if (data.units && data.units.length > 0) {
      for (const unit of data.units) {
        await repo.syllabusUnitsRepository.create({
          syllabusId: syllabus.id,
          title: unit.title,
          description: unit.description,
          orderIndex: unit.orderIndex,
        });
      }
    }

    log.info(`Created syllabus ${syllabus.id}`);
    return syllabus;
  },

  /**
   * Get complete syllabus with all related data
   */
  async getSyllabusWithDetails(
    syllabusId: string,
    schoolId: string,
    requestingUserId: string
  ): Promise<SyllabusWithDetails> {
    await verifySchoolAccess(schoolId, requestingUserId);

    const syllabus = await repo.syllabiiRepository.getById(syllabusId, schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    const grade = await repo.gradesRepository.getById(syllabus.gradeId, schoolId);
    const subject = await repo.subjectsRepository.getById(syllabus.subjectId, schoolId);

    if (!grade || !subject) {
      throw new Error('Grade or subject not found');
    }

    // Get teacher info
    const userResult = await query(
      `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
      [syllabus.teacherId]
    );
    const teacher = userResult.rows[0];

    const units = await repo.syllabusUnitsRepository.getBySyllabusId(syllabusId);
    const topics = await repo.syllabusTopicsRepository.getBySyllabusId(syllabusId);
    const dependencies: any[] = [];

    for (const topic of topics) {
      const deps = await repo.topicDependenciesRepository.getByTopicId(topic.id!);
      dependencies.push(...deps);
    }

    // Get published version if published
    let publishedVersion;
    if (syllabus.status === 'published') {
      const versions = await repo.syllabusVersionsRepository.getBySyllabusId(syllabusId);
      publishedVersion = versions.find((v) => v.version === sylllabus.version);
    }

    return {
      syllabus,
      grade,
      subject,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        firstName: teacher.first_name,
        lastName: teacher.last_name,
      },
      units,
      topics,
      dependencies,
      topicCount: topics.length,
      publishedVersion,
    };
  },

  /**
   * List syllabi for a school with filtering
   */
  async listSyllabi(params: ListSyllabiiParams, requestingUserId: string): Promise<ListSyllabiiResult> {
    await verifySchoolAccess(params.schoolId, requestingUserId);

    const { syllabi, total } = await repo.syllabiiRepository.listBySchool(
      params.schoolId,
      {
        gradeId: params.gradeId,
        subjectId: params.subjectId,
        status: params.status,
        teacherId: params.teacherId,
      },
      params.limit || 50,
      params.offset || 0
    );

    // Enrich with display data
    const items: SyllabusListItem[] = await Promise.all(
      syllabi.map(async (s) => {
        const grade = await repo.gradesRepository.getById(s.gradeId, s.schoolId);
        const subject = await repo.subjectsRepository.getById(s.subjectId, s.schoolId);
        const userResult = await query(
          `SELECT first_name, last_name FROM users WHERE id = $1`,
          [s.teacherId]
        );
        const user = userResult.rows[0];

        const topics = await repo.syllabusTopicsRepository.getBySyllabusId(s.id);

        return {
          id: s.id,
          title: s.title,
          gradeName: grade?.name || 'Unknown',
          subjectName: subject?.name || 'Unknown',
          status: s.status,
          version: s.version,
          topicCount: topics.length,
          teacherName: user ? `${user.first_name} ${user.last_name}`.trim() : 'Unknown',
          publishedAt: s.publishedAt,
          updatedAt: s.updatedAt,
        };
      })
    );

    return {
      syllabi: items,
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
    };
  },

  /**
   * Update syllabus metadata
   */
  async updateSyllabus(
    syllabusId: string,
    schoolId: string,
    data: UpdateSyllabusRequest,
    requestingUserId: string
  ): Promise<Syllabus> {
    log.info(`Updating syllabus ${syllabusId}`);

    const syllabus = await repo.syllabiiRepository.getById(syllabusId, schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    // Verify authorization: teacher who created or principal/admin
    await verifySyllabusAccess(syllabus, requestingUserId, ['edit']);

    // Cannot edit published syllabus
    if (syllabus.status === 'published') {
      throw new Error(
        'Cannot edit published syllabus. Create a new version or archive and recreate.'
      );
    }

    return (await repo.syllabiiRepository.update(syllabusId, schoolId, data)) || syllabus;
  },

  /**
   * Delete a syllabus (only draft status)
   */
  async deleteSyllabus(
    syllabusId: string,
    schoolId: string,
    requestingUserId: string
  ): Promise<boolean> {
    log.info(`Deleting syllabus ${syllabusId}`);

    const syllabus = await repo.syllabiiRepository.getById(syllabusId, schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    await verifySyllabusAccess(syllabus, requestingUserId, ['delete']);

    if (syllabus.status !== 'draft') {
      throw new Error(`Cannot delete ${syllabus.status} syllabus. Archive it first.`);
    }

    return await repo.syllabiiRepository.delete(syllabusId, schoolId);
  },

  /**
   * Publish a syllabus (create version snapshot)
   */
  async publishSyllabus(
    syllabusId: string,
    schoolId: string,
    requestingUserId: string,
    changeNote?: string
  ): Promise<Syllabus> {
    log.info(`Publishing syllabus ${syllabusId}`);

    const syllabus = await repo.syllabiiRepository.getById(syllabusId, schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    await verifySyllabusAccess(syllabus, requestingUserId, ['edit']);

    // Validate before publishing
    const validation = await this.validateSyllabus(syllabusId, schoolId);
    if (!validation.valid) {
      throw new Error(
        `Cannot publish: ${validation.errors.map((e) => e.message).join('; ')}`
      );
    }

    // Get current state for snapshot
    const details = await this.getSyllabusWithDetails(syllabusId, schoolId, requestingUserId);

    // Create version snapshot
    const snapshot = {
      title: details.syllabus.title,
      status: 'published',
      units: details.units,
      topics: details.topics,
      dependencies: details.dependencies,
    };

    await repo.syllabusVersionsRepository.create({
      syllabusId,
      version: syllabus.version,
      changedBy: requestingUserId,
      changeNote: changeNote || 'Published syllabus',
      snapshot,
    });

    // Update status
    const updated = await repo.syllabiiRepository.update(syllabusId, schoolId, {
      status: 'published',
    });

    return updated || syllabus;
  },

  /**
   * Comprehensive validation of syllabus
   */
  async validateSyllabus(syllabusId: string, schoolId: string): Promise<SyllabusValidationResult> {
    const syllabus = await repo.syllabiiRepository.getById(syllabusId, schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const circularDependencies: string[][] = [];

    // Get all topics and dependencies
    const topics = await repo.syllabusTopicsRepository.getBySyllabusId(syllabusId);

    if (topics.length === 0) {
      errors.push({
        field: 'topics',
        message: 'Syllabus must have at least one topic',
      });
    }

    // Validate each topic
    topics.forEach((topic) => {
      if (!topic.title || topic.title.trim().length === 0) {
        errors.push({
          field: `topic[${topic.id}].title`,
          message: 'Topic title is required',
          value: topic.title,
        });
      }
      if (!topic.learningObjectives || topic.learningObjectives.length === 0) {
        errors.push({
          field: `topic[${topic.id}].learningObjectives`,
          message: 'Topic must have at least one learning objective',
          value: topic.learningObjectives,
        });
      }
      if (!topic.difficulty) {
        errors.push({
          field: `topic[${topic.id}].difficulty`,
          message: 'Topic difficulty level is required',
          value: topic.difficulty,
        });
      }
    });

    // Check for circular dependencies
    for (const topic of topics) {
      const cycle = await detectCycle(topic.id!, topics);
      if (cycle.length > 0) {
        circularDependencies.push(cycle);
        errors.push({
          field: `topic[${topic.id}].dependencies`,
          message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        });
      }
    }

    // Validate dependencies can be resolved
    for (const topic of topics) {
      const deps = await repo.topicDependenciesRepository.getByTopicId(topic.id!);
      for (const dep of deps) {
        if (!dep.dependsOnTopicId && !dep.dependsOnTopicName) {
          warnings.push(
            `Topic "${topic.title}" has incomplete dependency reference`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      circularDependencies,
    };
  },
};

// ============================================================================
// TOPIC SERVICE
// ============================================================================

export const topicService = {
  /**
   * Add a topic to a syllabus
   */
  async addTopic(
    syllabusId: string,
    schoolId: string,
    data: CreateSyllabusTopicRequest,
    requestingUserId: string
  ): Promise<SyllabusTopic> {
    log.info(`Adding topic "${data.title}" to syllabus ${syllabusId}`);

    const syllabus = await repo.syllabiiRepository.getById(syllabusId, schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    await verifySyllabusAccess(syllabus, requestingUserId, ['edit']);

    if (syllabus.status === 'published') {
      throw new Error('Cannot edit published syllabus');
    }

    // Validate topic data
    const topicErrors = validateTopicData(data);
    if (topicErrors.length > 0) {
      throw new Error(`Topic validation failed: ${topicErrors[0].message}`);
    }

    // Create topic
    const topic = await repo.syllabusTopicsRepository.create({
      syllabusId,
      schoolId,
      title: data.title,
      description: data.description,
      orderIndex: data.orderIndex,
      learningObjectives: data.learningObjectives,
      difficulty: data.difficulty,
      estimatedDurationMinutes: data.estimatedDurationMinutes,
      syllabusUnitId: data.syllabusUnitId,
      sourceGradeId: data.sourceGradeId,
    });

    // Add dependencies if provided
    if (data.dependencies && data.dependencies.length > 0) {
      for (const dep of data.dependencies) {
        await repo.topicDependenciesRepository.create({
          topicId: topic.id!,
          dependsOnTopicId: dep.dependsOnTopicId,
          dependsOnTopicName: dep.dependsOnTopicName,
          dependsOnGradeId: dep.dependsOnGradeId,
        });
      }
    }

    return topic;
  },

  /**
   * Update a topic
   */
  async updateTopic(
    topicId: string,
    syllabusId: string,
    schoolId: string,
    data: { title?: string; description?: string; learningObjectives?: string[]; difficulty?: string; estimatedDurationMinutes?: number },
    requestingUserId: string
  ): Promise<SyllabusTopic> {
    const syllabus = await repo.syllabiiRepository.getById(syllabusId, schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    await verifySyllabusAccess(syllabus, requestingUserId, ['edit']);

    const topic = await repo.syllabusTopicsRepository.getById(topicId);
    if (!topic || topic.syllabusId !== syllabusId) {
      throw new Error('Topic not found');
    }

    const updated = await repo.syllabusTopicsRepository.update(topicId, {
      title: data.title,
      description: data.description,
      learningObjectives: data.learningObjectives,
      difficulty: data.difficulty as any,
      estimatedDurationMinutes: data.estimatedDurationMinutes,
    });

    if (!updated) {
      throw new Error('Failed to update topic');
    }

    return updated;
  },

  /**
   * Delete a topic
   */
  async deleteTopic(
    topicId: string,
    syllabusId: string,
    schoolId: string,
    requestingUserId: string
  ): Promise<boolean> {
    const syllabus = await repo.syllabiiRepository.getById(syllabusId, schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    await verifySyllabusAccess(syllabus, requestingUserId, ['edit']);

    const topic = await repo.syllabusTopicsRepository.getById(topicId);
    if (!topic || topic.syllabusId !== syllabusId) {
      throw new Error('Topic not found');
    }

    // Delete dependencies first
    await repo.topicDependenciesRepository.deleteByTopicId(topicId);

    return await repo.syllabusTopicsRepository.delete(topicId);
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify user has access to school
 */
async function verifySchoolAccess(
  schoolId: string,
  userId: string,
  allowedRoles?: string[]
): Promise<void> {
  const userResult = await query(
    `SELECT school_id, role FROM users WHERE id = $1 AND is_active = true`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found or inactive');
  }

  const user = userResult.rows[0];

  // SaaS admin can access any school
  if (user.role === 'saas_admin') {
    return;
  }

  // Others must belong to school
  if (user.school_id !== schoolId) {
    throw new Error('Unauthorized: user does not belong to this school');
  }

  // Check role if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error(`Unauthorized: user role "${user.role}" not allowed`);
  }
}

/**
 * Verify user has access to specific syllabus
 */
async function verifySyllabusAccess(
  syllabus: Syllabus,
  userId: string,
  actions: string[]
): Promise<void> {
  const userResult = await query(
    `SELECT school_id, role FROM users WHERE id = $1 AND is_active = true`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  // SaaS admin can do anything
  if (user.role === 'saas_admin') {
    return;
  }

  // User must belong to school
  if (user.school_id !== syllabus.schoolId) {
    throw new Error('Unauthorized');
  }

  // For edit: must be the creating teacher or principal
  if (actions.includes('edit')) {
    if (userId !== syllabus.teacherId && user.role !== 'principal') {
      throw new Error('Only the creating teacher or principal can edit');
    }
  }

  // For delete: same as edit
  if (actions.includes('delete')) {
    if (userId !== syllabus.teacherId && user.role !== 'principal') {
      throw new Error('Only the creating teacher or principal can delete');
    }
  }
}

/**
 * Validate topic data
 */
function validateTopicData(data: CreateSyllabusTopicRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Topic title is required',
    });
  }

  if (!data.learningObjectives || data.learningObjectives.length === 0) {
    errors.push({
      field: 'learningObjectives',
      message: 'At least one learning objective is required',
    });
  }

  if (!data.difficulty) {
    errors.push({
      field: 'difficulty',
      message: 'Difficulty level is required',
    });
  }

  const validDifficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
  if (data.difficulty && !validDifficulties.includes(data.difficulty)) {
    errors.push({
      field: 'difficulty',
      message: `Difficulty must be one of: ${validDifficulties.join(', ')}`,
      value: data.difficulty,
    });
  }

  return errors;
}

/**
 * Detect circular dependencies using DFS
 */
async function detectCycle(
  topicId: string,
  allTopics: SyllabusTopic[],
  visited: Set<string> = new Set(),
  path: string[] = []
): Promise<string[]> {
  if (visited.has(topicId)) {
    const cycleStart = path.indexOf(topicId);
    if (cycleStart !== -1) {
      return path.slice(cycleStart).concat([topicId]);
    }
    return [];
  }

  visited.add(topicId);
  path.push(topicId);

  const deps = await repo.topicDependenciesRepository.getByTopicId(topicId);
  for (const dep of deps) {
    if (dep.dependsOnTopicId) {
      const cycle = await detectCycle(
        dep.dependsOnTopicId,
        allTopics,
        new Set(visited),
        [...path]
      );
      if (cycle.length > 0) {
        return cycle;
      }
    }
  }

  return [];
}
