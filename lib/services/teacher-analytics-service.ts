/**
 * Teacher Analytics Service
 * Provides comprehensive student performance data for teacher dashboards
 * Includes mastery tracking, intervention alerts, class analytics
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('TeacherAnalyticsService');

export interface StudentPerformance {
  studentId: string;
  studentName: string;
  email: string;
  overallMastery: number; // Average across all topics
  sessionsCompleted: number;
  diagnosticScore: number | null;
  riskLevel: 'low' | 'medium' | 'high'; // Based on mastery gaps
  topicsCount: number;
  masteryByTopic: Array<{
    topicId: string;
    topicName: string;
    mastery: number;
    confidence: number;
    lastUpdated: string;
  }>;
  learningDNA: {
    paceType: string;
    mistakeType: string;
    preferredStyle: string;
  } | null;
  lastActivityAt: string | null;
}

export interface ClassAnalytics {
  totalStudents: number;
  averageMastery: number;
  averageSessionsCompleted: number;
  masteryDistribution: {
    excellent: number; // 80-100%
    proficient: number; // 60-79%
    developing: number; // 40-59%
    beginning: number; // 0-39%
  };
  atRiskStudents: number;
  topPerformers: StudentPerformance[];
  strugglingStudents: StudentPerformance[];
  topicPerformance: Array<{
    topicId: string;
    topicName: string;
    averageMastery: number;
    studentCount: number;
  }>;
}

export interface InterventionAlert {
  studentId: string;
  studentName: string;
  alertType: 'low_mastery' | 'low_confidence' | 'falling_behind' | 'no_progress';
  severity: 'high' | 'medium' | 'low';
  message: string;
  affectedTopics: string[];
  recommendedAction: string;
  timestamp: string;
}

/**
 * Get all students taught by a teacher
 */
export async function getTeacherStudents(
  teacherId: string,
  schoolId: string
): Promise<string[]> {
  try {
    const classResult = await query(
      `SELECT DISTINCT ce.student_id
       FROM class_enrollments ce
       INNER JOIN classes c ON c.id = ce.class_id
       WHERE c.teacher_id = $1 AND c.school_id = $2`,
      [teacherId, schoolId]
    );

    return classResult.rows.map((row: any) => row.student_id);
  } catch (error) {
    logger.error('Failed to get teacher students', { error });
    throw error;
  }
}

/**
 * Get detailed performance for a single student
 */
export async function getStudentPerformance(
  studentId: string,
  schoolId: string
): Promise<StudentPerformance | null> {
  try {
    // Get student info
    const userResult = await query(
      `SELECT id, email, first_name, last_name FROM users WHERE id = $1 AND school_id = $2`,
      [studentId, schoolId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];

    // Get topic mastery
    const masteryResult = await query(
      `SELECT tm.topic_id, t.title, tm.mastery_score, tm.confidence_level, tm.updated_at
       FROM topic_mastery tm
       JOIN topics t ON tm.topic_id = t.id
       WHERE tm.student_id = $1 AND tm.school_id = $2
       ORDER BY t.order_index ASC NULLS LAST, t.title ASC`,
      [studentId, schoolId]
    );

    const masteryByTopic = masteryResult.rows.map((row: any) => ({
      topicId: row.topic_id,
      topicName: row.title || 'Topic',
      mastery: Number(row.mastery_score || 0),
      confidence: row.confidence_level,
      lastUpdated: row.updated_at,
    }));

    const overallMastery =
      masteryByTopic.length > 0
        ? Math.round(masteryByTopic.reduce((sum, t) => sum + t.mastery, 0) / masteryByTopic.length)
        : 0;

    // Get sessions completed
    const sessionsResult = await query(
      `SELECT COUNT(*) as count FROM ai_classroom_sessions 
       WHERE student_id = $1 AND school_id = $2 AND completed_at IS NOT NULL`,
      [studentId, schoolId]
    );

    const sessionsCompleted = parseInt(sessionsResult.rows[0].count || 0, 10);

    // Get latest diagnostic score
    const diagnosticResult = await query(
      `SELECT score FROM diagnostic_tests 
       WHERE student_id = $1 AND school_id = $2 AND score IS NOT NULL
       ORDER BY completed_at DESC LIMIT 1`,
      [studentId, schoolId]
    );

    const diagnosticScore = diagnosticResult.rows[0]?.score || null;

    // Get learning DNA
    const dnaResult = await query(
      `SELECT pace_type, mistake_type, preferred_style FROM learning_dna WHERE student_id = $1`,
      [studentId]
    );

    const learningDNA = dnaResult.rows[0]
      ? {
          paceType: dnaResult.rows[0].pace_type,
          mistakeType: dnaResult.rows[0].mistake_type,
          preferredStyle: dnaResult.rows[0].preferred_style,
        }
      : null;

    // Get last activity
    const lastActivityResult = await query(
      `SELECT created_at FROM ai_classroom_sessions 
       WHERE student_id = $1 AND school_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [studentId, schoolId]
    );

    const lastActivityAt = lastActivityResult.rows[0]?.created_at || null;

    // Calculate risk level based on mastery
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const lowMasteryCount = masteryByTopic.filter((t) => t.mastery < 50).length;
    const lowMasteryRatio = lowMasteryCount / Math.max(masteryByTopic.length, 1);

    if (lowMasteryRatio > 0.5) {
      riskLevel = 'high';
    } else if (lowMasteryRatio > 0.25) {
      riskLevel = 'medium';
    }

    return {
      studentId,
      studentName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      email: user.email,
      overallMastery,
      sessionsCompleted,
      diagnosticScore,
      riskLevel,
      topicsCount: masteryByTopic.length,
      masteryByTopic,
      learningDNA,
      lastActivityAt,
    };
  } catch (error) {
    logger.error('Failed to get student performance', { error });
    throw error;
  }
}

/**
 * Get class average and distribution analytics
 */
export async function getClassAnalytics(
  teacherId: string,
  schoolId: string,
  curriculumId?: string
): Promise<ClassAnalytics> {
  try {
    // Get all students taught by this teacher
    const studentIds = await getTeacherStudents(teacherId, schoolId);

    if (studentIds.length === 0) {
      return {
        totalStudents: 0,
        averageMastery: 0,
        averageSessionsCompleted: 0,
        masteryDistribution: {
          excellent: 0,
          proficient: 0,
          developing: 0,
          beginning: 0,
        },
        atRiskStudents: 0,
        topPerformers: [],
        strugglingStudents: [],
        topicPerformance: [],
      };
    }

    // Get all student performance data
    const studentPerformances: StudentPerformance[] = [];
    for (const studentId of studentIds) {
      const performance = await getStudentPerformance(studentId, schoolId);
      if (performance) {
        studentPerformances.push(performance);
      }
    }

    // Calculate aggregates
    const totalStudents = studentPerformances.length;
    const averageMastery =
      totalStudents > 0
        ? Math.round(
            studentPerformances.reduce((sum, s) => sum + s.overallMastery, 0) / totalStudents
          )
        : 0;

    const averageSessionsCompleted =
      totalStudents > 0
        ? Math.round(
            studentPerformances.reduce((sum, s) => sum + s.sessionsCompleted, 0) / totalStudents
          )
        : 0;

    // Mastery distribution
    const masteryDistribution = {
      excellent: studentPerformances.filter((s) => s.overallMastery >= 80).length,
      proficient: studentPerformances.filter(
        (s) => s.overallMastery >= 60 && s.overallMastery < 80
      ).length,
      developing: studentPerformances.filter(
        (s) => s.overallMastery >= 40 && s.overallMastery < 60
      ).length,
      beginning: studentPerformances.filter((s) => s.overallMastery < 40).length,
    };

    // At-risk students
    const atRiskStudents = studentPerformances.filter(
      (s) => s.riskLevel === 'high' || s.riskLevel === 'medium'
    ).length;

    // Top and struggling performers
    const sorted = [...studentPerformances].sort((a, b) => b.overallMastery - a.overallMastery);
    const topPerformers = sorted.slice(0, 5);
    const strugglingStudents = sorted.slice(-5).reverse();

    // Topic performance (aggregate)
    const topicPerformanceMap: Record<string, { total: number; count: number; name: string }> =
      {};

    for (const student of studentPerformances) {
      for (const topic of student.masteryByTopic) {
        if (!topicPerformanceMap[topic.topicId]) {
          topicPerformanceMap[topic.topicId] = {
            total: 0,
            count: 0,
            name: topic.topicName,
          };
        }
        topicPerformanceMap[topic.topicId].total += topic.mastery;
        topicPerformanceMap[topic.topicId].count++;
      }
    }

    const topicPerformance = Object.entries(topicPerformanceMap)
      .map(([topicId, data]) => ({
        topicId,
        topicName: data.name,
        averageMastery: Math.round(data.total / data.count),
        studentCount: data.count,
      }))
      .sort((a, b) => a.averageMastery - b.averageMastery); // Lowest first to highlight needs

    return {
      totalStudents,
      averageMastery,
      averageSessionsCompleted,
      masteryDistribution,
      atRiskStudents,
      topPerformers,
      strugglingStudents,
      topicPerformance,
    };
  } catch (error) {
    logger.error('Failed to get class analytics', { error });
    throw error;
  }
}

/**
 * Get intervention alerts for at-risk students
 */
export async function getInterventionAlerts(
  teacherId: string,
  schoolId: string
): Promise<InterventionAlert[]> {
  try {
    const studentIds = await getTeacherStudents(teacherId, schoolId);
    const alerts: InterventionAlert[] = [];

    for (const studentId of studentIds) {
      const performance = await getStudentPerformance(studentId, schoolId);
      if (!performance) continue;

      // Alert: Low mastery in critical topics
      const lowMasteryTopics = performance.masteryByTopic.filter((t) => t.mastery < 40);
      if (lowMasteryTopics.length > 0) {
        alerts.push({
          studentId,
          studentName: performance.studentName,
          alertType: 'low_mastery',
          severity: lowMasteryTopics.length >= 3 ? 'high' : 'medium',
          message: `Low mastery in ${lowMasteryTopics.length} topic(s)`,
          affectedTopics: lowMasteryTopics.map((t) => t.topicName),
          recommendedAction: 'Provide additional support or tutoring for these topics',
          timestamp: new Date().toISOString(),
        });
      }

      // Alert: Low confidence despite mastery
      const lowConfidenceTopics = performance.masteryByTopic.filter(
        (t) => t.confidence < 40 && t.mastery >= 60
      );
      if (lowConfidenceTopics.length > 0) {
        alerts.push({
          studentId,
          studentName: performance.studentName,
          alertType: 'low_confidence',
          severity: 'medium',
          message: `Student lacks confidence in ${lowConfidenceTopics.length} topic(s) despite proficiency`,
          affectedTopics: lowConfidenceTopics.map((t) => t.topicName),
          recommendedAction: 'Encourage practice and provide positive reinforcement',
          timestamp: new Date().toISOString(),
        });
      }

      // Alert: No recent activity
      if (
        performance.lastActivityAt &&
        new Date().getTime() - new Date(performance.lastActivityAt).getTime() > 7 * 24 * 60 * 60 * 1000
      ) {
        // 7 days
        alerts.push({
          studentId,
          studentName: performance.studentName,
          alertType: 'falling_behind',
          severity: 'medium',
          message: 'No recent learning activity (7+ days)',
          affectedTopics: [],
          recommendedAction: 'Check in with student and encourage engagement',
          timestamp: new Date().toISOString(),
        });
      }

      // Alert: High risk level
      if (performance.riskLevel === 'high') {
        alerts.push({
          studentId,
          studentName: performance.studentName,
          alertType: 'no_progress',
          severity: 'high',
          message: 'Student at high risk - significant mastery gaps across multiple topics',
          affectedTopics: performance.masteryByTopic
            .filter((t) => t.mastery < 50)
            .map((t) => t.topicName),
          recommendedAction: 'Schedule intervention meeting and create support plan',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder: Record<'high' | 'medium' | 'low', number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  } catch (error) {
    logger.error('Failed to get intervention alerts', { error });
    throw error;
  }
}

/**
 * Get mastery heatmap data for visualization
 */
export async function getMasteryHeatmap(
  teacherId: string,
  schoolId: string
): Promise<{
  students: string[];
  topics: string[];
  data: number[][];
}> {
  try {
    const studentIds = await getTeacherStudents(teacherId, schoolId);

    // Get all topics
    const topicsResult = await query(
      `SELECT DISTINCT t.id, t.title
       FROM topics t
       JOIN topic_mastery tm ON t.id = tm.topic_id
       WHERE tm.student_id = ANY($1::uuid[])
       ORDER BY t.order_index ASC NULLS LAST, t.title ASC`,
      [studentIds]
    );

    const topics = topicsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.title || 'Topic',
    }));

    if (topics.length === 0) {
      return { students: [], topics: [], data: [] };
    }

    // Build heatmap data
    const studentNames: string[] = [];
    const heatmapData: number[][] = [];

    for (const studentId of studentIds) {
      const performance = await getStudentPerformance(studentId, schoolId);
      if (!performance) continue;

      studentNames.push(performance.studentName);

      const row: number[] = [];
      for (const topic of topics) {
        const mastery = performance.masteryByTopic.find((t) => t.topicId === topic.id)?.mastery || 0;
        row.push(mastery);
      }
      heatmapData.push(row);
    }

    return {
      students: studentNames,
      topics: topics.map((t) => t.name),
      data: heatmapData,
    };
  } catch (error) {
    logger.error('Failed to get mastery heatmap', { error });
    throw error;
  }
}
