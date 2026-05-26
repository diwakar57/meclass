/**
 * API ENDPOINT: Submit Test Attempt
 * 
 * Submits completed test with all answers and confidence scores
 * Auto-grades multiple choice, sends essay/short answer for LLM grading
 * 
 * POST /api/test-attempts/:id/submit
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/middleware/auth'
import { createLogger } from '@/lib/logger'
import { testAttemptRepository, topicPerformanceRepository } from '@/lib/repositories/test-attempt-repository'
import { SubmitTestResponseRequest, TestAttemptResponse, StudentAnswer } from '@/lib/types/test-attempts'
import { query } from '@/lib/db'
import type { AuthContext } from '@/lib/types/auth'

const logger = createLogger('SubmitTestAttemptAPI')

async function handler(
  req: NextRequest,
  auth: AuthContext,
  context?: { params?: { id?: string } } | Promise<{ params?: { id?: string } }>,
) {
  try {
    if (req.method !== 'POST') {
      return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
    }

    const resolvedContext = context && typeof (context as Promise<any>).then === 'function'
      ? await (context as Promise<any>)
      : context
    const id = resolvedContext?.params?.id
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing attempt id' }, { status: 400 })
    }

    const { answers, completedAt } = (await req.json()) as SubmitTestResponseRequest

    const studentId = auth.userId
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 })
    }
    const schoolId = auth.schoolId

    // Load current attempt
    const attempt = await testAttemptRepository.getById(id, schoolId)
    if (!attempt) {
      return NextResponse.json({ success: false, error: 'Test attempt not found' }, { status: 404 })
    }

    // Verify ownership
    if (attempt.studentId !== studentId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Load questions for grading
    const questionsResult = await query<any>(
      `SELECT id, question_text, answer_type, correct_answer, correct_answer_id, points_value
       FROM test_questions
       WHERE test_id = $1
       ORDER BY order_index ASC`,
      [attempt.testId],
    )

    const questions = questionsResult.rows
    const questionMap = new Map(questions.map((q) => [q.id, q]))

    // Grade answers
    let totalPointsEarned = 0
    let totalCorrect = 0

    const processedAnswers: StudentAnswer[] = answers.map((answer) => {
      const question = questionMap.get(answer.questionId)
      if (!question) {
        logger.warn('Question not found during grading', { questionId: answer.questionId })
        return {
          ...answer,
          isCorrect: false,
          pointsEarned: 0,
          gradedBy: 'auto',
          gradedAt: new Date(),
        } as StudentAnswer
      }

      // Auto-grade multiple choice and true/false
      let isCorrect = false
      let pointsEarned = 0

      if (['multiple_choice', 'true_false'].includes(question.answer_type)) {
        isCorrect = gradeMultipleChoice(
          (answer as any).selectedAnswerId || answer.selectedAnswer,
          question.correct_answer_id || question.correct_answer
        )
        pointsEarned = isCorrect ? question.points_value : 0
      } else {
        // Essay/short answer - queued for LLM/manual grading.
        pointsEarned = 0
      }

      if (isCorrect) totalCorrect++
      totalPointsEarned += pointsEarned

      return {
        ...answer,
        isCorrect,
        pointsEarned,
        gradedBy: ['multiple_choice', 'true_false'].includes(question.answer_type) ? 'auto' : 'llm',
        gradedAt: new Date(),
      } as StudentAnswer
    })

    // Calculate total points possible
    const totalPoints = questions.reduce((sum, q) => sum + (q.points_value || 0), 0)
    const percentageScore = totalPoints > 0 ? Math.round((totalPointsEarned / totalPoints) * 100) : 0

    // Update attempt with submission
    const updated = await testAttemptRepository.update(id, schoolId, {
      status: 'submitted',
      submittedAt: new Date(),
      completedAt: completedAt || new Date(),
      totalPoints,
      pointsEarned: totalPointsEarned,
      percentageScore,
      answers: processedAnswers,
      totalQuestionsAnswered: answers.length,
      totalQuestionsCorrect: totalCorrect,
    })

    // Save topic performance
    await topicPerformanceRepository.calculateAndSave(id, schoolId, processedAnswers)

    // Check if any answers need LLM grading
    const needsGrading = processedAnswers.some((a) => a.gradedBy === 'llm')
    if (needsGrading) {
      logger.info('Test submitted, some answers pending LLM grading', {
        attemptId: id,
        studentId,
      })
      // TODO: Queue for LLM grading service
    }

    logger.info('Test attempt submitted', {
      studentId,
      attemptId: id,
      score: percentageScore,
    })

    const response: TestAttemptResponse = {
      success: true,
      data: updated,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error('Error submitting test attempt', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ success: false, error: 'Failed to submit test' }, { status: 500 })
  }
}

/**
 * Grade multiple choice answer
 * Handles single and multiple correct answers
 */
function gradeMultipleChoice(selected: string | string[] | undefined, correct: string | string[]): boolean {
  if (!selected) return false
  if (!correct) return false

  if (typeof selected === 'string' && typeof correct === 'string') {
    return selected === correct
  }

  const selectedArr = Array.isArray(selected) ? selected : [selected]
  const correctArr = Array.isArray(correct) ? correct : [correct]

  if (selectedArr.length !== correctArr.length) return false
  return selectedArr.every((s) => correctArr.includes(s))
}

export const POST = withRole(['student'], handler)
