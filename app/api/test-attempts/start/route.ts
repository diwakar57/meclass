/**
 * API ENDPOINT: Start Test Attempt
 * 
 * Creates a new test attempt when student begins an approved diagnostic test
 * POST /api/test-attempts/start
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/middleware/auth'
import { createLogger } from '@/lib/logger'
import { testAttemptRepository } from '@/lib/repositories/test-attempt-repository'
import { StartTestAttemptRequest, TestAttemptResponse } from '@/lib/types/test-attempts'
import { query } from '@/lib/db'
import type { AuthContext } from '@/lib/types/auth'

const logger = createLogger('StartTestAttemptAPI')

async function handler(req: NextRequest, auth: AuthContext) {
  try {
    if (req.method !== 'POST') {
      return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
    }

    const { testId, timeAllowedMinutes } = (await req.json()) as StartTestAttemptRequest

    // Validate input
    if (!testId) {
      return NextResponse.json({ success: false, error: 'Missing testId' }, { status: 400 })
    }

    const studentId = auth.userId
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 })
    }
    const schoolId = auth.schoolId

    // Verify test exists and belongs to school
    const testResult = await query<any>(
      `SELECT id, name, type FROM diagnostic_tests 
       WHERE id = $1 AND school_id = $2 AND status = 'approved'`,
      [testId, schoolId],
    )

    if (testResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Test not found or not approved' },
        { status: 404 },
      )
    }

    const test = testResult.rows[0]

    // Check if student hasn't already started this test
    const existingResult = await query<any>(
      `SELECT id FROM test_attempts 
       WHERE student_id = $1 AND test_id = $2 AND status IN ('in_progress', 'submitted')`,
      [studentId, testId],
    )

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Test attempt already in progress' },
        { status: 409 },
      )
    }

    // Create test attempt
    const attempt = await testAttemptRepository.create(
      studentId,
      schoolId,
      testId,
      test.name,
      test.type || 'diagnostic',
      timeAllowedMinutes,
    )

    logger.info('Test attempt started', { studentId, testId, attemptId: attempt.id })

    const response: TestAttemptResponse = {
      success: true,
      data: attempt,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    logger.error('Error starting test attempt', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { success: false, error: 'Failed to start test attempt' },
      { status: 500 },
    )
  }
}

export const POST = withRole(['student', 'teacher'], handler)
