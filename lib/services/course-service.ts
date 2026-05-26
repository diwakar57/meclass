/**
 * Course Service
 * Business logic for course creation, management, and operations
 */

import { CourseRepository, CourseCalendarRepository, CourseTopicRepository, ScheduledClassRepository } from '@/lib/repositories/course-repository';
import {
  Course,
  CourseCalendar,
  CourseTopic,
  CreateCourseRequest,
  UpdateCourseRequest,
  SetCalendarRequest,
  AddCourseTopicRequest,
  CourseStats,
  CourseStatus,
} from '@/lib/models/course-models';

export class CourseService {
  /**
   * Create a new course
   */
  static async createCourse(
    schoolId: string,
    teacherId: string,
    data: CreateCourseRequest
  ): Promise<Course> {
    if (!schoolId || !teacherId) {
      throw new Error('School ID and Teacher ID are required');
    }

    if (!data.gradeId || !data.subjectId || !data.title) {
      throw new Error('Grade ID, Subject ID, and Title are required');
    }

    if (data.startDate >= data.endDate) {
      throw new Error('Start date must be before end date');
    }

    return CourseRepository.createCourse(schoolId, teacherId, data);
  }

  /**
   * Get course details
   */
  static async getCourse(courseId: string, schoolId: string): Promise<Course | null> {
    return CourseRepository.getCourse(courseId, schoolId);
  }

  /**
   * List teacher's courses
   */
  static async listTeacherCourses(
    schoolId: string,
    teacherId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: CourseStatus;
      gradeId?: string;
    }
  ): Promise<{ courses: Course[]; total: number; hasMore: boolean }> {
    const { courses, total } = await CourseRepository.listTeacherCourses(schoolId, teacherId, options);

    return {
      courses,
      total,
      hasMore: (options?.offset || 0) + courses.length < total,
    };
  }

  /**
   * Update course
   */
  static async updateCourse(
    courseId: string,
    schoolId: string,
    teacherId: string,
    data: UpdateCourseRequest
  ): Promise<Course | null> {
    // Verify ownership
    const course = await CourseRepository.getCourse(courseId, schoolId);
    if (!course || course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You are not the course owner');
    }

    return CourseRepository.updateCourse(courseId, schoolId, data);
  }

  /**
   * Delete course
   */
  static async deleteCourse(courseId: string, schoolId: string, teacherId: string): Promise<boolean> {
    // Verify ownership
    const course = await CourseRepository.getCourse(courseId, schoolId);
    if (!course || course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You are not the course owner');
    }

    return CourseRepository.deleteCourse(courseId, schoolId);
  }

  /**
   * Set course calendar
   */
  static async setCalendar(
    courseId: string,
    schoolId: string,
    data: SetCalendarRequest
  ): Promise<CourseCalendar> {
    if (!data.classSchedule) {
      throw new Error('Class schedule is required');
    }

    // Validate schedule has at least one day
    const hasDays = Object.values(data.classSchedule).some((day) => day && day.length > 0);
    if (!hasDays) {
      throw new Error('At least one day must have scheduled class times');
    }

    return CourseCalendarRepository.setCourseCalendar(schoolId, courseId, data);
  }

  /**
   * Get calendar for course
   */
  static async getCalendar(courseId: string, schoolId: string): Promise<CourseCalendar | null> {
    return CourseCalendarRepository.getCalendar(courseId, schoolId);
  }

  /**
   * Add topics to course
   */
  static async addTopics(
    courseId: string,
    schoolId: string,
    teacherId: string,
    topics: AddCourseTopicRequest[]
  ): Promise<CourseTopic[]> {
    // Verify ownership
    const course = await CourseRepository.getCourse(courseId, schoolId);
    if (!course || course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You are not the course owner');
    }

    if (topics.length === 0) {
      throw new Error('At least one topic must be provided');
    }

    const addedTopics = await CourseTopicRepository.addTopics(courseId, schoolId, topics);

    // Update course total estimated sessions
    const total = await CourseTopicRepository.getTotalEstimatedSessions(courseId);
    await CourseRepository.updateCourse(courseId, schoolId, {
      metadata: {
        ...course.metadata,
        totalEstimatedSessions: total,
      },
    });

    return addedTopics;
  }

  /**
   * Get topics for course
   */
  static async getTopics(courseId: string, schoolId: string): Promise<CourseTopic[]> {
    return CourseTopicRepository.getTopics(courseId, schoolId);
  }

  /**
   * Get course with full details (for course view page)
   */
  static async getCourseDetails(
    courseId: string,
    schoolId: string
  ): Promise<{
    course: Course;
    calendar: CourseCalendar | null;
    topics: CourseTopic[];
    totalEstimatedSessions: number;
  } | null> {
    const course = await CourseRepository.getCourse(courseId, schoolId);
    if (!course) return null;

    const [calendar, topics] = await Promise.all([
      CourseCalendarRepository.getCalendar(courseId, schoolId),
      CourseTopicRepository.getTopics(courseId, schoolId),
    ]);

    const totalEstimatedSessions = topics.reduce((sum, topic) => sum + topic.estimatedSessions, 0);

    return {
      course,
      calendar,
      topics,
      totalEstimatedSessions,
    };
  }
}

// ============================================================================
// COURSE CALENDAR SERVICE
// ============================================================================

export class CourseCalendarService {
  /**
   * Check if a date is a class day (not a weekend, holiday, or no-class date)
   */
  static isClassDay(
    date: Date,
    calendar: CourseCalendar
  ): boolean {
    // Check if Saturday (6) or Sunday (0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Check if it's a no-class date
    if (calendar.noClassDates.some((d) => this.isSameDay(d, date))) {
      return false;
    }

    // Check if it's a holiday
    if (calendar.holidays.some((h) => date >= h.startDate && date <= h.endDate)) {
      return false;
    }

    return true;
  }

  /**
   * Get next N class days starting from a given date
   */
  static getNextClassDays(
    startDate: Date,
    numDays: number,
    calendar: CourseCalendar
  ): Date[] {
    const classDays: Date[] = [];
    let current = new Date(startDate);
    const calendarEndDate = calendar.courseEndDate
      ? new Date(calendar.courseEndDate)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    while (classDays.length < numDays && current <= calendarEndDate) {
      if (this.isClassDay(current, calendar)) {
        classDays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return classDays;
  }

  /**
   * Get class times for a specific day
   */
  static getClassTimesForDay(dayOfWeek: number, calendar: CourseCalendar): any[] {
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysMap[dayOfWeek];

    return calendar.classSchedule[dayName as keyof typeof calendar.classSchedule] || [];
  }

  /**
   * Helper: Check if two dates are the same day
   */
  private static isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }
}
