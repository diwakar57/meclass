/**
 * Syllabus to Adaptive Class Generator Service
 * Converts teacher syllabus to personalized learning classes for each student
 * based on their learning pace and diagnostic results
 */

import { createLogger } from '@/lib/logger';
import { generateAdaptiveClassPlan } from '@/lib/adaptive-class-generator/engine';
import { query } from '@/lib/db';
import { nanoid } from 'nanoid';
import type {
  TeacherSyllabusInput,
  StudentDiagnosticResult,
  PlanType,
  AdaptiveClassGenerationOutput,
} from '@/lib/adaptive-class-generator/types';

const log = createLogger('SyllabusClassGenerator');

export interface GenerateClassesRequest {
  syllabusId: string;
  teacherId: string;
  schoolId: string;
  studentIds: string[];
  planType?: PlanType;
  allowDefaultPlan?: boolean;
}

export interface GeneratedClassSession {
  id: string;
  syllabusId: string;
  studentId: string;
  topicName: string;
  subtopics: string[];
  objectives: string[];
  difficulty: 'low' | 'medium' | 'high';
  estimatedDurationMinutes: number;
  orderIndex: number;
  paceMultiplier: number; // 0.5x, 1x, 2x based on student pace
  scheduledDate?: Date;
  status: 'scheduled' | 'pending' | 'completed';
}

export interface GenerateClassesResult {
  success: boolean;
  syllabusId: string;
  studentsProcessed: number;
  totalSessionsCreated: number;
  classCollections: {
    studentId: string;
    displayName: string;
    totalSessions: number;
    estimatedCompletionWeeks: number;
    paceRecommendation: string;
  }[];
  errors: { studentId: string; error: string }[];
}

/**
 * Generate personalized learning classes from teacher syllabus
 */
export async function generateClassesFromSyllabus(
  req: GenerateClassesRequest
): Promise<GenerateClassesResult> {
  const result: GenerateClassesResult = {
    success: false,
    syllabusId: req.syllabusId,
    studentsProcessed: 0,
    totalSessionsCreated: 0,
    classCollections: [],
    errors: [],
  };

  try {
    // Fetch teacher syllabus
    const syllabusQuery = await query(
      `SELECT content_parsed FROM teacher_syllabi WHERE id = $1 AND teacher_id = $2 AND school_id = $3`,
      [req.syllabusId, req.teacherId, req.schoolId]
    );

    if (!syllabusQuery.rows[0]) {
      throw new Error('Syllabus not found or unauthorized');
    }

    const syllabusContent = syllabusQuery.rows[0].content_parsed;
    const teacherSyllabusInput: TeacherSyllabusInput = {
      syllabusId: req.syllabusId,
      teacherId: req.teacherId,
      structured: syllabusContent,
    };

    // Process each student
    for (const studentId of req.studentIds) {
      try {
        // Fetch student diagnostic result if available
        let studentDiagnostic: StudentDiagnosticResult | undefined;
        
        const diagnosticQuery = await query(
          `SELECT diagnostic_result FROM learning_dna WHERE student_id = $1 LIMIT 1`,
          [studentId]
        );

        if (diagnosticQuery.rows[0]?.diagnostic_result) {
          studentDiagnostic = diagnosticQuery.rows[0].diagnostic_result;
        }

        // Generate adaptive class plan
        const generatedPlan = generateAdaptiveClassPlan({
          teacherSyllabus: teacherSyllabusInput,
          studentDiagnostic,
          selectedPlanType: req.planType,
          allowDefaultPlanWithoutDiagnostic: req.allowDefaultPlan ?? true,
          runAiPlanningPrompt: false,
        });

        // Create scheduled classes from the generated roadmap
        const classSessionsCreated = await createScheduledClassesFromRoadmap({
          syllabusId: req.syllabusId,
          studentId,
          schoolId: req.schoolId,
          roadmap: generatedPlan.generatedClassRoadmap,
          diagnosticProfile: generatedPlan.studentDiagnosticProfile,
          paceRecommendation: generatedPlan.planRecommendation,
        });

        result.studentsProcessed++;
        result.totalSessionsCreated += classSessionsCreated.length;

        // Fetch student name for summary
        const studentQuery = await query(
          `SELECT first_name, last_name FROM users WHERE id = $1`,
          [studentId]
        );

        const studentName = studentQuery.rows[0]
          ? `${studentQuery.rows[0].first_name} ${studentQuery.rows[0].last_name}`
          : studentId;

        result.classCollections.push({
          studentId,
          displayName: studentName,
          totalSessions: classSessionsCreated.length,
          estimatedCompletionWeeks: Math.ceil(classSessionsCreated.length / 5), // ~5 sessions per week
          paceRecommendation: generatedPlan.planRecommendation,
        });

        log.info(`Generated ${classSessionsCreated.length} classes for student ${studentId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({ studentId, error: errorMessage });
        log.error(`Failed to generate classes for student ${studentId}:`, error);
      }
    }

    result.success = result.studentsProcessed > 0;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to generate classes from syllabus:', error);
    result.errors.push({ studentId: 'all', error: message });
    return result;
  }
}

/**
 * Create scheduled classes from generated roadmap
 */
async function createScheduledClassesFromRoadmap(params: {
  syllabusId: string;
  studentId: string;
  schoolId: string;
  roadmap: any; // GeneratedClassRoadmap type
  diagnosticProfile: any;
  paceRecommendation: string;
}): Promise<GeneratedClassSession[]> {
  const sessions: GeneratedClassSession[] = [];

  try {
    // Get or create learning plan for student
    let learningPlanId: string;
    
    const existingPlan = await db.query(
      `SELECT id FROM learning_plans WHERE student_id = $1 AND school_id = $2 LIMIT 1`,
      [params.studentId, params.schoolId]
    );

    if (existingPlan.rows[0]) {
      learningPlanId = existingPlan.rows[0].id;
    } else {
      learningPlanId = nanoid();
      await query(
        `INSERT INTO learning_plans (id, student_id, school_id, status, plan_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [learningPlanId, params.studentId, params.schoolId, 'active', 'adaptive', new Date(), new Date()]
      );
    }

    // Determine pace multiplier (0.5x slow, 1x standard, 2x fast)
    const paceMultiplier = params.paceRecommendation === 'slow' ? 0.5 : 
                          params.paceRecommendation === 'fast' ? 2 : 1;

    // Extract topics from roadmap and create scheduled classes
    if (params.roadmap?.phases && Array.isArray(params.roadmap.phases)) {
      let globalOrderIndex = 0;
      let currentDate = new Date();

      for (const phase of params.roadmap.phases) {
        if (phase.topics && Array.isArray(phase.topics)) {
          for (const topic of phase.topics) {
            globalOrderIndex++;

            // Estimate duration based on difficulty and pace
            const baseMinutes = topic.difficultyLevel === 'advanced' ? 90 :
                              topic.difficultyLevel === 'intermediate' ? 60 : 45;
            const estimatedMinutes = Math.round(baseMinutes / paceMultiplier);

            const sessionId = nanoid();
            
            // Create scheduled class
            await query(
              `INSERT INTO scheduled_classes (
                id, learning_plan_id, topic_id, topic_name, subtopics, 
                objectives, difficulty, estimated_duration_minutes, 
                order_index, pace_multiplier, scheduled_date, status, 
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                sessionId,
                learningPlanId,
                nanoid(), // topic_id
                topic.name || `Topic ${globalOrderIndex}`,
                JSON.stringify(topic.subtopics || []),
                JSON.stringify(topic.objectives || []),
                topic.difficultyLevel || 'intermediate',
                estimatedMinutes,
                globalOrderIndex,
                paceMultiplier,
                currentDate,
                'pending',
                new Date(),
                new Date(),
              ]
            );

            sessions.push({
              id: sessionId,
              syllabusId: params.syllabusId,
              studentId: params.studentId,
              topicName: topic.name || `Topic ${globalOrderIndex}`,
              subtopics: topic.subtopics || [],
              objectives: topic.objectives || [],
              difficulty: topic.difficultyLevel || 'intermediate',
              estimatedDurationMinutes: estimatedMinutes,
              orderIndex: globalOrderIndex,
              paceMultiplier,
              scheduledDate: currentDate,
              status: 'pending',
            });

            // Schedule next class (add days based on pace)
            const daysToAdd = paceMultiplier === 0.5 ? 3 : 
                            paceMultiplier === 2 ? 1 : 2;
            currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          }
        }
      }
    }

    log.info(`Created ${sessions.length} scheduled classes for learning plan ${learningPlanId}`);
    return sessions;
  } catch (error) {
    log.error('Failed to create scheduled classes:', error);
    throw error;
  }
}

/**
 * Get generated classes for a student
 */
export async function getStudentGeneratedClasses(studentId: string, schoolId: string) {
  try {
    const result = await query(
      `SELECT 
        sc.id, sc.topic_name, sc.subtopics, sc.objectives, 
        sc.difficulty, sc.estimated_duration_minutes, 
        sc.order_index, sc.pace_multiplier, sc.scheduled_date, sc.status,
        lp.id as learning_plan_id
       FROM scheduled_classes sc
       JOIN learning_plans lp ON sc.learning_plan_id = lp.id
       WHERE lp.student_id = $1 AND lp.school_id = $2
       ORDER BY sc.order_index ASC`,
      [studentId, schoolId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      topicName: row.topic_name,
      subtopics: typeof row.subtopics === 'string' ? JSON.parse(row.subtopics) : row.subtopics,
      objectives: typeof row.objectives === 'string' ? JSON.parse(row.objectives) : row.objectives,
      difficulty: row.difficulty,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      orderIndex: row.order_index,
      paceMultiplier: row.pace_multiplier,
      scheduledDate: row.scheduled_date,
      status: row.status,
      learningPlanId: row.learning_plan_id,
    }));
  } catch (error) {
    log.error('Failed to get student generated classes:', error);
    throw error;
  }
}
