/**
 * Learning Plan Generation Service
 * Generates personalized learning plans for students based on their learning DNA,
 * diagnostic test results, and teacher-provided syllabi
 */

import { db } from '@/lib/db';
import { CourseCalendarService, CourseService } from '@/lib/services/course-service';
import { ScheduledClassRepository } from '@/lib/repositories/course-repository';
import type {
  LearningPlan,
  LearningDNA,
  ScheduledClass,
  GenerateLearningPlanRequest,
  PersonalizedSyllabus,
  PaceType,
  MistakeType,
  PreferredStyle,
  TeachingStyle,
} from '@/lib/models/course-models';

function parseJsonValue<T>(value: unknown, fallback: T): T {
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

function asDate(value: unknown, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function asPaceType(value: unknown): PaceType {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'fast') return 'fast' as PaceType;
  if (normalized === 'slow') return 'slow' as PaceType;
  return 'medium' as PaceType;
}

function asMistakeType(value: unknown): MistakeType {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'conceptual') return 'conceptual' as MistakeType;
  if (normalized === 'careless') return 'careless' as MistakeType;
  return 'mixed' as MistakeType;
}

function asPreferredStyle(value: unknown): PreferredStyle {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'visual') return 'visual' as PreferredStyle;
  if (normalized === 'text') return 'text' as PreferredStyle;
  if (normalized === 'story') return 'story' as PreferredStyle;
  return 'interactive' as PreferredStyle;
}

function asTeachingStyle(value: unknown): TeachingStyle {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'strict_instructor') return 'strict_instructor' as TeachingStyle;
  if (normalized === 'storyteller') return 'storyteller' as TeachingStyle;
  if (normalized === 'socratic') return 'socratic' as TeachingStyle;
  return 'friendly_tutor' as TeachingStyle;
}

export class LearningPlanGenerationService {
  /**
   * Generate a personalized learning plan for a student
   */
  static async generateLearningPlan(
    data: GenerateLearningPlanRequest
  ): Promise<LearningPlan> {
    // Get course and learning DNA
    const [course, learningDna, calendar, courseTopics] = await Promise.all([
      this.getCourseData(data.courseId),
      this.getLearningDnaData(data.learningDnaId),
      this.getCourseCalendar(data.courseId),
      this.getCourseTopics(data.courseId),
    ]);

    if (!course || !learningDna || !calendar) {
      throw new Error('Missing required data for plan generation');
    }

    // Build personalized syllabus with remediation
    const personalizedSyllabus = await this.buildPersonalizedSyllabus(
      data.basedOnSyllabusId,
      learningDna,
      courseTopics
    );

    // Generate schedule respecting calendar
    const scheduledSessions = await this.generateSchedule(
      data.courseId,
      personalizedSyllabus,
      calendar,
      course.startDate
    );

    // Calculate projected completion date
    const projectedCompletionDate = scheduledSessions.length > 0
      ? scheduledSessions[scheduledSessions.length - 1].scheduledDate
      : course.endDate;

    // Create learning plan record
    const plan = await this.createLearningPlanRecord({
      studentId: data.studentId,
      schoolId: course.schoolId,
      courseId: data.courseId,
      learningDnaId: data.learningDnaId,
      basedOnSyllabusId: data.basedOnSyllabusId,
      originalSyllabus: courseTopics,
      personalizedSyllabus,
      startDate: course.startDate,
      projectedCompletionDate,
    });

    // Store scheduled sessions
    await ScheduledClassRepository.bulkCreateScheduledClasses(
      plan.id,
      scheduledSessions.map((s) => ({
        topicId: s.topicId,
        scheduledDate: s.scheduledDate,
        scheduledTime: s.scheduledTime || this.getDefaultTimeSlot(s.scheduledDate, calendar),
        isRemediationClass: s.isRemediationClass || false,
        estimatedDurationMinutes: s.estimatedDurationMinutes || 45,
      }))
    );

    return plan;
  }

  /**
   * Build personalized syllabus with remediation topics
   */
  private static async buildPersonalizedSyllabus(
    syllabusId: string,
    learningDna: LearningDNA,
    courseTopics: any[]
  ): Promise<PersonalizedSyllabus> {
    // Start with main topics from course
    const mainTopics = courseTopics.map((topic) => ({
      topicId: topic.topicId,
      title: topic.topicTitle || topic.title,
      estimatedDays: Math.ceil(topic.estimatedSessions * 1.2), // 1-2 days per session
      adjustedDifficulty: this.adjustDifficulty(topic, learningDna),
      differentiation: this.generateDifferentiation(topic, learningDna),
    }));

    // Add remediation topics for weak areas
    const remediationTopics = await Promise.all(
      (learningDna.remediationNeeded || []).map(async (remediation) => {
        const topic = await this.getTopicData(remediation.topicId);
        return {
          topicId: remediation.topicId,
          title: topic?.title || 'Prerequisite Topic',
          prerequisiteOf: courseTopics[0]?.topicId || '', // Link to first main topic
          position: 'before' as const,
          estimatedDays: this.estimateRemediationDays(remediation.priority),
        };
      })
    );

    return {
      remediationTopics,
      mainTopics,
    };
  }

  /**
   * Generate schedule respecting calendar exclusions
   */
  private static async generateSchedule(
    courseId: string,
    syllabus: PersonalizedSyllabus,
    calendar: any,
    startDate: Date
  ): Promise<ScheduledClass[]> {
    const scheduledClasses: ScheduledClass[] = [];
    let currentDate = new Date(startDate);

    // Schedule remediation topics first
    for (const topic of syllabus.remediationTopics) {
      const daysNeeded = topic.estimatedDays;
      const classDays = CourseCalendarService.getNextClassDays(
        currentDate,
        daysNeeded,
        calendar
      );

      classDays.forEach((date) => {
        scheduledClasses.push({
          topicId: topic.topicId,
          scheduledDate: date,
          isRemediationClass: true,
          estimatedDurationMinutes: 45,
        } as any);
      });

      if (classDays.length > 0) {
        currentDate = new Date(classDays[classDays.length - 1]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Schedule main topics
    for (const topic of syllabus.mainTopics) {
      const daysNeeded = topic.estimatedDays;
      const classDays = CourseCalendarService.getNextClassDays(
        currentDate,
        daysNeeded,
        calendar
      );

      classDays.forEach((date) => {
        scheduledClasses.push({
          topicId: topic.topicId,
          scheduledDate: date,
          isRemediationClass: false,
          estimatedDurationMinutes: 45,
        } as any);
      });

      if (classDays.length > 0) {
        currentDate = new Date(classDays[classDays.length - 1]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return scheduledClasses;
  }

  /**
   * Adjust difficulty based on learning DNA
   */
  private static adjustDifficulty(topic: any, learningDna: LearningDNA): number {
    let difficulty = 5; // Default medium difficulty

    // Adjust based on pace
    if (learningDna.learningProfile.paceType === 'fast') {
      difficulty += 2;
    } else if (learningDna.learningProfile.paceType === 'slow') {
      difficulty -= 1;
    }

    // Adjust based on topic strength
    if (topic.masteryScore && topic.masteryScore > 70) {
      difficulty += 1;
    }

    return Math.min(10, Math.max(1, difficulty));
  }

  /**
   * Generate differentiation strategies
   */
  private static generateDifferentiation(topic: any, learningDna: LearningDNA): string {
    const strategies: string[] = [];

    // Based on preferred learning style
    switch (learningDna.learningProfile.preferredStyle) {
      case 'visual':
        strategies.push('Use diagrams, charts, and visual aids');
        break;
      case 'text':
        strategies.push('Use detailed written explanations');
        break;
      case 'interactive':
        strategies.push('Use hands-on activities and practice problems');
        break;
      case 'story':
        strategies.push('Present content through real-world stories and contexts');
        break;
    }

    // Based on mistake type
    if (learningDna.learningProfile.mistakeType === 'conceptual') {
      strategies.push('Focus on foundational concepts with examples');
    } else if (learningDna.learningProfile.mistakeType === 'careless') {
      strategies.push('Include error-checking steps and practice');
    }

    return strategies.join('; ');
  }

  /**
   * Estimate remediation days based on priority
   */
  private static estimateRemediationDays(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Get default time slot for a scheduled class
   */
  private static getDefaultTimeSlot(date: Date, calendar: any): { startTime: string; endTime: string } {
    const dayOfWeek = date.getDay();
    const slots = CourseCalendarService.getClassTimesForDay(dayOfWeek, calendar);
    return slots[0] || { startTime: '09:00', endTime: '10:00' };
  }

  /**
   * Create learning plan record in database
   */
  private static async createLearningPlanRecord(data: any): Promise<LearningPlan> {
    const query = `
      INSERT INTO learning_plans (
        student_id, school_id, course_id, learning_dna_id,
        based_on_syllabus_id, original_syllabus, personalized_syllabus,
        status, start_date, projected_completion_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await db.query(query, [
      data.studentId,
      data.schoolId,
      data.courseId,
      data.learningDnaId,
      data.basedOnSyllabusId,
      JSON.stringify(data.originalSyllabus),
      JSON.stringify(data.personalizedSyllabus),
      'active',
      data.startDate,
      data.projectedCompletionDate,
    ]);

    return this.formatLearningPlan(result.rows[0]);
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private static async getCourseData(courseId: string): Promise<any> {
    const result = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      schoolId: row.school_id,
      title: row.title,
      startDate: asDate(row.start_date, new Date()),
      endDate: asDate(row.end_date, new Date()),
    };
  }

  private static async getLearningDnaData(dnaId: string): Promise<LearningDNA | null> {
    const result = await db.query('SELECT * FROM learning_dna WHERE id = $1', [dnaId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const parsedProfile = parseJsonValue(row.learning_profile, {}) as Record<string, unknown>;
    return {
      id: row.id,
      studentId: row.student_id,
      schoolId: row.school_id,
      generationMethod: row.generation_method || 'diagnostic',
      diagnosticConfidence: Number(row.diagnostic_confidence || 0),
      reportedConfidence: Number(row.reported_confidence || 0),
      confidenceAlignment: row.confidence_alignment || 'aligned',
      learningProfile: {
        paceType: asPaceType(parsedProfile.paceType ?? row.pace_type),
        mistakeType: asMistakeType(parsedProfile.mistakeType ?? row.mistake_type),
        preferredStyle: asPreferredStyle(parsedProfile.preferredStyle ?? row.preferred_style),
        recommendedTeachingStyle: asTeachingStyle(
          parsedProfile.recommendedTeachingStyle ?? parsedProfile.teachingStyle
        ),
      },
      remediationNeeded: parseJsonValue(row.remediation_needed, []),
      generatedAt: asDate(row.generated_at, new Date()),
      version: row.version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static async getCourseCalendar(courseId: string): Promise<any> {
    const result = await db.query(
      'SELECT * FROM course_calendars WHERE course_id = $1',
      [courseId]
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const noClassDates = parseJsonValue<string[]>(row.no_class_dates, []);
    return {
      id: row.id,
      schoolId: row.school_id,
      courseId: row.course_id,
      classSchedule: parseJsonValue(row.class_schedule, {}),
      holidays: parseJsonValue(row.holidays, []),
      noClassDates: noClassDates.map((d: string) => new Date(d)),
      courseEndDate: row.course_end_date ? new Date(row.course_end_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static async getCourseTopics(courseId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT ct.*, t.title
       FROM course_topics ct
       LEFT JOIN topics t ON t.id = ct.topic_id
       WHERE ct.course_id = $1
       ORDER BY ct.order_index ASC`,
      [courseId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      topicTitle: row.title || `Topic ${row.order_index}`,
      estimatedSessions: row.estimated_sessions,
      learningObjectives: parseJsonValue(row.learning_objectives, []),
      masteryScore: row.mastery_score,
    }));
  }

  private static async getTopicData(topicId: string): Promise<any | null> {
    const result = await db.query(
      'SELECT * FROM topics WHERE id = $1',
      [topicId]
    );
    return result.rows[0] || null;
  }

  private static formatLearningPlan(row: any): LearningPlan {
    return {
      id: row.id,
      studentId: row.student_id,
      schoolId: row.school_id,
      courseId: row.course_id,
      learningDnaId: row.learning_dna_id,
      basedOnSyllabusId: row.based_on_syllabus_id,
      originalSyllabus: parseJsonValue(row.original_syllabus, []),
      personalizedSyllabus: parseJsonValue(row.personalized_syllabus, {
        remediationTopics: [],
        mainTopics: [],
      }),
      scheduledSessions: [],
      status: row.status,
      startDate: asDate(row.start_date, new Date()),
      projectedCompletionDate: asDate(row.projected_completion_date, new Date()),
      generatedAt: new Date(row.generated_at || row.created_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
