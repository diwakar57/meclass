import { createLogger } from '@/lib/logger';
import {
  SyllabusRepository,
  type AddTopicInput,
  type TopicDependencyInput,
} from '@/lib/repositories/syllabus';
import { query } from '@/lib/db';
import { appendAuditLog } from '@/lib/services/audit-service';
import type { Syllabus, Topic, TopicDependency, UserRole } from '@/lib/types/models';

const log = createLogger('SyllabusService');

export interface CreateSyllabusInput {
  schoolId: string;
  gradeId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  requesterRole: UserRole;
}

export interface UpdateSyllabusInput {
  schoolId: string;
  syllabusId: string;
  requesterId: string;
  requesterRole: UserRole;
  title?: string;
  status?: 'draft' | 'published' | 'archived';
  changeNote?: string;
}

export interface AddSyllabusTopicInput {
  schoolId: string;
  syllabusId: string;
  requesterId: string;
  requesterRole: UserRole;
  title: string;
  description?: string;
  orderIndex: number;
  syllabusUnitId?: string;
  sourceGradeId?: string;
  dependencies?: TopicDependencyInput[];
}

export class SyllabusService {
  static async createSyllabus(input: CreateSyllabusInput): Promise<Syllabus> {
    await this.validateTeacherSchoolAccess(input.teacherId, input.schoolId, input.requesterRole);

    const grade = await SyllabusRepository.findGradeById(input.gradeId, input.schoolId);
    if (!grade) {
      throw new Error('Grade not found in school scope');
    }

    const subject = await SyllabusRepository.findSubjectById(input.subjectId, input.schoolId);
    if (!subject) {
      throw new Error('Subject not found in school scope');
    }

    const existing = await SyllabusRepository.getSyllabusByGradeAndSubject(
      input.gradeId,
      input.subjectId,
      input.schoolId
    );

    if (existing && existing.status !== 'archived') {
      throw new Error('Active syllabus already exists for selected grade and subject');
    }

    return SyllabusRepository.createSyllabus({
      schoolId: input.schoolId,
      gradeId: input.gradeId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      title: input.title,
      status: 'draft',
    });
  }

  static async updateSyllabus(input: UpdateSyllabusInput): Promise<Syllabus> {
    const existing = await SyllabusRepository.findById(input.syllabusId, input.schoolId);
    if (!existing) {
      throw new Error('Syllabus not found');
    }

    await this.validateTeacherSchoolAccess(existing.teacherId, input.schoolId, input.requesterRole);

    if (input.requesterRole === 'teacher' && existing.teacherId !== input.requesterId) {
      throw new Error('Only syllabus owner teacher can edit this syllabus');
    }

    const snapshot = {
      syllabus: existing,
      topics: await SyllabusRepository.getSyllabusTopics(existing.id, input.schoolId),
    };

    await SyllabusRepository.saveVersionSnapshot(
      existing.id,
      existing.version,
      input.requesterId,
      input.changeNote || 'Syllabus updated',
      snapshot
    );

    const nextVersion = existing.version + 1;
    const publishedAt = input.status === 'published' ? new Date() : existing.publishedAt ?? null;

    const updated = await SyllabusRepository.updateSyllabus(existing.id, input.schoolId, {
      title: input.title,
      status: input.status,
      publishedAt,
      version: nextVersion,
    });

    if (!updated) {
      throw new Error('Failed to update syllabus');
    }

    await appendAuditLog({
      schoolId: input.schoolId,
      userId: input.requesterId,
      action: 'syllabus_update',
      resourceType: 'syllabus',
      resourceId: input.syllabusId,
      changes: {
        previousVersion: existing.version,
        nextVersion,
        status: input.status,
        title: input.title,
      },
    });

    return updated;
  }

  static async getSyllabusByGradeAndSubject(
    gradeId: string,
    subjectId: string,
    schoolId: string
  ): Promise<Syllabus | null> {
    return SyllabusRepository.getSyllabusByGradeAndSubject(gradeId, subjectId, schoolId);
  }

  static async addTopicToSyllabus(input: AddSyllabusTopicInput): Promise<Topic> {
    const syllabus = await SyllabusRepository.findById(input.syllabusId, input.schoolId);
    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    await this.validateTeacherSchoolAccess(syllabus.teacherId, input.schoolId, input.requesterRole);

    if (input.requesterRole === 'teacher' && syllabus.teacherId !== input.requesterId) {
      throw new Error('Only syllabus owner teacher can add topics');
    }

    await this.validateTopicOrder(input.syllabusId, input.schoolId, input.orderIndex);

    if (input.dependencies?.length) {
      await this.validateNoCircularDependency(input.syllabusId, input.schoolId, input.dependencies);
    }

    const topic = await SyllabusRepository.addTopicToSyllabus({
      syllabusId: input.syllabusId,
      schoolId: input.schoolId,
      title: input.title,
      description: input.description,
      orderIndex: input.orderIndex,
      syllabusUnitId: input.syllabusUnitId,
      sourceGradeId: input.sourceGradeId,
      dependencies: input.dependencies,
    });

    await appendAuditLog({
      schoolId: input.schoolId,
      userId: input.requesterId,
      action: 'syllabus_topic_add',
      resourceType: 'syllabus_topic',
      resourceId: topic.id,
      changes: { syllabusId: input.syllabusId, orderIndex: input.orderIndex },
    });

    return topic;
  }

  static async getSyllabusTopics(
    syllabusId: string,
    schoolId: string
  ): Promise<Array<Topic & { dependencies: TopicDependency[] }>> {
    const topics = await SyllabusRepository.getSyllabusTopics(syllabusId, schoolId);
    const withDeps = await Promise.all(
      topics.map(async (topic) => ({
        ...topic,
        dependencies: await SyllabusRepository.getDependenciesForTopic(topic.id),
      }))
    );

    return withDeps;
  }

  private static async validateTeacherSchoolAccess(
    teacherId: string,
    schoolId: string,
    requesterRole: UserRole
  ): Promise<void> {
    if (!['teacher', 'principal', 'school_admin', 'saas_admin'].includes(requesterRole)) {
      throw new Error('Invalid role for syllabus operation');
    }

    if (requesterRole === 'saas_admin') {
      return;
    }

    const result = await query(
      `SELECT id
       FROM users
       WHERE id = $1 AND school_id = $2 AND role IN ('teacher', 'principal', 'school_admin') AND is_active = true`,
      [teacherId, schoolId]
    );

    if (result.rowCount === 0) {
      throw new Error('Teacher does not belong to this school');
    }
  }

  private static async validateTopicOrder(
    syllabusId: string,
    schoolId: string,
    orderIndex: number
  ): Promise<void> {
    if (orderIndex <= 0) {
      throw new Error('Topic order must be greater than zero');
    }

    const topics = await SyllabusRepository.getSyllabusTopics(syllabusId, schoolId);
    const duplicate = topics.some((topic) => topic.orderIndex === orderIndex);
    if (duplicate) {
      throw new Error('Topic order index already exists in syllabus');
    }
  }

  private static async validateNoCircularDependency(
    syllabusId: string,
    schoolId: string,
    dependencies: TopicDependencyInput[]
  ): Promise<void> {
    const edges = await SyllabusRepository.getDependencyEdgesForSyllabus(syllabusId, schoolId);

    for (const dep of dependencies) {
      if (!dep.dependsOnTopicId) {
        continue;
      }

      const hasCycle = this.pathExists(edges, dep.dependsOnTopicId, dep.dependsOnTopicId, 0);
      if (hasCycle) {
        throw new Error('Circular dependency detected in topic prerequisites');
      }
    }
  }

  private static pathExists(
    edges: Array<{ topicId: string; dependsOnTopicId: string }>,
    current: string,
    target: string,
    depth: number,
    visited: Set<string> = new Set()
  ): boolean {
    if (depth > 40) {
      return false;
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);

    const outgoing = edges
      .filter((edge) => edge.topicId === current)
      .map((edge) => edge.dependsOnTopicId);

    for (const next of outgoing) {
      if (next === target) {
        return true;
      }

      if (this.pathExists(edges, next, target, depth + 1, visited)) {
        return true;
      }
    }

    return false;
  }
}
