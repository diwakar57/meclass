/**
 * Diagnostic Test Service
 * AI-powered diagnostic testing to assess student baseline mastery
 * Creates personalized assessments based on curriculum topics and student grade level
 */

import { query } from '@/lib/db';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('DiagnosticTestService');

export interface DiagnosticTestQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: string[]; // For multiple choice
  correct_answer: string;
  difficulty_level: number; // 1-10
  topic_id: string;
  explanation: string;
  concept_key: string; // Key concept tested
}

export interface DiagnosticTest {
  id: string;
  school_id: string;
  student_id: string;
  curriculum_id: string;
  topic_ids: string[]; // Topics covered in test
  grade_level: number;
  questions: DiagnosticTestQuestion[];
  estimated_duration_minutes: number;
  created_at: string;
  completed_at?: string;
  score?: number;
  analysis?: {
    strengths: string[];
    weaknesses: string[];
    recommended_topics: string[];
    confidence_distribution: Record<string, number>;
  };
}

/**
 * Generate diagnostic test for a student
 */
export async function generateDiagnosticTest(
  studentId: string,
  schoolId: string,
  curriculumId: string,
  gradeLevel: number,
  topicLimit: number = 10
): Promise<DiagnosticTest> {
  try {
    // Get curriculum topics
    const topicsResult = await query(
      `SELECT id, name, description, concepts FROM topics 
       WHERE curriculum_id = $1 
       ORDER BY sequence ASC 
       LIMIT $2`,
      [curriculumId, topicLimit]
    );

    if (topicsResult.rows.length === 0) {
      throw new Error('No topics found for curriculum');
    }

    const topics = topicsResult.rows;
    const topicIds = topics.map(t => t.id);

    // Generate questions using LLM
    const questionsPrompt = buildDiagnosticPrompt(topics, gradeLevel);
    
    let questionsResponse: string;
    try {
      const llmResult = await callLLM(
        {
          model: 'default',
          prompt: questionsPrompt,
          temperature: 0.7,
          maxTokens: 3000,
        },
        'diagnostic-test-generate'
      );
      questionsResponse = llmResult.text;
    } catch (error) {
      logger.error('LLM call failed for diagnostic test', { error });
      throw new Error('Failed to generate diagnostic questions');
    }

    // Parse LLM response to questions
    const questions = parseTestQuestions(questionsResponse, topicIds);

    // Create database record
    const testId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await query(
      `INSERT INTO diagnostic_tests (
        id, school_id, student_id, curriculum_id, topic_ids,
        grade_level, questions, estimated_duration_minutes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        testId,
        schoolId,
        studentId,
        curriculumId,
        JSON.stringify(topicIds),
        gradeLevel,
        JSON.stringify(questions),
        Math.ceil(questions.length * 2.5), // ~2.5 min per question
        createdAt,
      ]
    );

    return {
      id: testId,
      school_id: schoolId,
      student_id: studentId,
      curriculum_id: curriculumId,
      topic_ids: topicIds,
      grade_level: gradeLevel,
      questions,
      estimated_duration_minutes: Math.ceil(questions.length * 2.5),
      created_at: createdAt,
    };
  } catch (error) {
    logger.error('Failed to generate diagnostic test', { error });
    throw error;
  }
}

/**
 * Get a diagnostic test
 */
export async function getDiagnosticTest(testId: string): Promise<DiagnosticTest | null> {
  try {
    const result = await query(
      `SELECT * FROM diagnostic_tests WHERE id = $1`,
      [testId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return mapRowToTest(row);
  } catch (error) {
    logger.error('Failed to get diagnostic test', { error });
    throw error;
  }
}

/**
 * Submit diagnostic test answers and analyze
 */
export async function analyzeDiagnosticTest(
  testId: string,
  answers: Record<string, string> // questionId -> answer
): Promise<{
  score: number;
  analysis: any;
  recommendations: string[];
}> {
  try {
    const test = await getDiagnosticTest(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    // Score the test
    let correctCount = 0;
    const questionScores: Record<string, boolean> = {};

    for (const question of test.questions) {
      const submitted = answers[question.id];
      const isCorrect =
        typeof submitted === 'string' &&
        submitted.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

      if (isCorrect) {
        correctCount++;
      }
      questionScores[question.id] = isCorrect;
    }

    const score = Math.round((correctCount / test.questions.length) * 100);

    // Analyze strengths and weaknesses
    const strengthTopics: Set<string> = new Set();
    const weaknessTopics: Set<string> = new Set();
    const topicScores: Record<string, { correct: number; total: number }> = {};

    for (const question of test.questions) {
      if (!topicScores[question.topic_id]) {
        topicScores[question.topic_id] = { correct: 0, total: 0 };
      }

      topicScores[question.topic_id].total++;
      if (questionScores[question.id]) {
        topicScores[question.topic_id].correct++;
      }
    }

    for (const [topicId, scores] of Object.entries(topicScores)) {
      const percentage = (scores.correct / scores.total) * 100;
      if (percentage >= 75) {
        strengthTopics.add(topicId);
      } else if (percentage <= 50) {
        weaknessTopics.add(topicId);
      }
    }

    // Get topic names
    const topicNamesResult = await query(
      `SELECT id, title FROM topics WHERE id = ANY($1::uuid[])`,
      [Array.from(weaknessTopics)]
    );

    const recommendedTopics = topicNamesResult.rows.map((r: any) => r.title);

    // Update test with analysis
    const analysis = {
      strengths: Array.from(strengthTopics),
      weaknesses: Array.from(weaknessTopics),
      recommended_topics: recommendedTopics,
      confidence_distribution: {
        high: Object.values(questionScores).filter(v => v).length,
        medium: 0,
        low: Object.values(questionScores).filter(v => !v).length,
      },
    };

    await query(
      `UPDATE diagnostic_tests
       SET score = $1,
           analysis = $2,
           analysis_result = $2,
           completed_at = NOW()
       WHERE id = $3`,
      [score, JSON.stringify(analysis), testId]
    );

    // Update topic_mastery for this student
    for (const [topicId, scores] of Object.entries(topicScores)) {
      const masteryLevel = Math.round((scores.correct / scores.total) * 100);

      await query(
        `INSERT INTO topic_mastery (
           student_id, topic_id, school_id, mastery_score, mastery_level,
           confidence_level, attempts, correct_attempts, last_attempted_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $4, $5, 1, CASE WHEN $4 >= 70 THEN 1 ELSE 0 END, NOW(), NOW(), NOW())
         ON CONFLICT (student_id, topic_id) DO UPDATE
         SET mastery_score = $4,
             mastery_level = $4,
             confidence_level = $5,
             attempts = topic_mastery.attempts + 1,
             correct_attempts = topic_mastery.correct_attempts + CASE WHEN $4 >= 70 THEN 1 ELSE 0 END,
             last_attempted_at = NOW(),
             updated_at = NOW()`,
        [test.student_id, topicId, test.school_id, masteryLevel, Math.max(25, masteryLevel - 25)]
      );
    }

    return {
      score,
      analysis,
      recommendations: recommendedTopics,
    };
  } catch (error) {
    logger.error('Failed to analyze diagnostic test', { error });
    throw error;
  }
}

/**
 * List diagnostic tests for a student
 */
export async function listStudentDiagnosticTests(
  studentId: string,
  schoolId: string
): Promise<DiagnosticTest[]> {
  try {
    const result = await query(
      `SELECT * FROM diagnostic_tests 
       WHERE student_id = $1 AND school_id = $2
       ORDER BY created_at DESC`,
      [studentId, schoolId]
    );

    return result.rows.map(mapRowToTest);
  } catch (error) {
    logger.error('Failed to list diagnostic tests', { error });
    throw error;
  }
}

/**
 * Build diagnostic test prompt for LLM
 */
function buildDiagnosticPrompt(topics: any[], gradeLevel: number): string {
  const topicsText = topics
    .map((t: any) => `- ${t.name}: ${t.description}`)
    .join('\n');

  const gradeDescriptions: Record<number, string> = {
    1: 'Grade 1 (Ages 6-7)',
    2: 'Grade 2 (Ages 7-8)',
    3: 'Grade 3 (Ages 8-9)',
    4: 'Grade 4 (Ages 9-10)',
    5: 'Grade 5 (Ages 10-11)',
    6: 'Grade 6 (Ages 11-12)',
    7: 'Grade 7 (Ages 12-13)',
    8: 'Grade 8 (Ages 13-14)',
    9: 'Grade 9 (Ages 14-15)',
    10: 'Grade 10 (Ages 15-16)',
    11: 'Grade 11 (Ages 16-17)',
    12: 'Grade 12 (Ages 17-18)',
  };

  return `You are an expert educational assessment designer. Create a diagnostic test to assess a student's baseline knowledge.

Grade Level: ${gradeDescriptions[gradeLevel] || `Grade ${gradeLevel}`}
Topics to Assess:
${topicsText}

Requirements:
1. Create 12-15 diverse questions covering ALL topics
2. Mix question types: multiple choice (50%), short answer (30%), true/false (20%)
3. Vary difficulty: 40% easy (Level 1-3), 40% medium (Level 4-7), 20% hard (Level 8-10)
4. Make questions age-appropriate and grade-level suitable
5. Each question should test a specific concept

Format EXACTLY as JSON:
{
  "questions": [
    {
      "id": "q1",
      "question_text": "...",
      "question_type": "multiple_choice|short_answer|true_false",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "difficulty_level": 3,
      "topic_id": "topic_name",
      "explanation": "Why this is correct...",
      "concept_key": "concept being tested"
    }
  ]
}

Return ONLY the JSON, no additional text.`;
}

/**
 * Parse LLM response into question objects
 */
function parseTestQuestions(response: string, topicIds: string[]): DiagnosticTestQuestion[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid questions format');
    }

    return parsed.questions.map((q: any, index: number) => ({
      id: q.id || `q${index + 1}`,
      question_text: q.question_text,
      question_type: q.question_type || 'multiple_choice',
      options: q.options,
      correct_answer: q.correct_answer,
      difficulty_level: q.difficulty_level || 5,
      topic_id: q.topic_id || topicIds[index % topicIds.length],
      explanation: q.explanation || '',
      concept_key: q.concept_key || '',
    }));
  } catch (error) {
    logger.error('Failed to parse test questions', { error, response });
    // Return empty array on parse failure
    return [];
  }
}

/**
 * Map database row to DiagnosticTest
 */
function mapRowToTest(row: any): DiagnosticTest {
  return {
    id: row.id,
    school_id: row.school_id,
    student_id: row.student_id,
    curriculum_id: row.curriculum_id,
    topic_ids: row.topic_ids || [],
    grade_level: row.grade_level,
    questions: row.questions || [],
    estimated_duration_minutes: row.estimated_duration_minutes,
    created_at: row.created_at,
    completed_at: row.completed_at,
    score: row.score,
    analysis: row.analysis,
  };
}
