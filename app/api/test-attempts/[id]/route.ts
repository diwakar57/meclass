/**
 * API ENDPOINT: Get Test Attempt Details
 * 
 * Returns full test attempt with all answers and analysis
 * GET /api/test-attempts/:id
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/middleware/auth'
import { createLogger } from '@/lib/logger'
import { testAttemptRepository } from '@/lib/repositories/test-attempt-repository'
import { TestAttemptResponse } from '@/lib/types/test-attempts'
import type { AuthContext } from '@/lib/types/auth'

const logger = createLogger('GetTestAttemptAPI')

async function handler(
  req: NextRequest,
  auth: AuthContext,
  context?: { params?: { id?: string } } | Promise<{ params?: { id?: string } }>,
) {
  try {
    if (req.method !== 'GET') {
      return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
    }

    const resolvedContext = context && typeof (context as Promise<any>).then === 'function'
      ? await (context as Promise<any>)
      : context
    const id = resolvedContext?.params?.id
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing attempt id' }, { status: 400 })
    }

    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 })
    }

    const schoolId = auth.schoolId
    const userId = auth.userId
    const userRole = auth.role

    // Load test attempt
    const attempt = await testAttemptRepository.getById(id, schoolId)
    if (!attempt) {
      return NextResponse.json({ success: false, error: 'Test attempt not found' }, { status: 404 })
    }

    // Verify access
    if (userRole === 'student') {
      // Students can only view their own attempts
      if (attempt.studentId !== userId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
      }
    }
    // Teachers and principals can view student attempts

    const response: TestAttemptResponse = {
      success: true,
      data: attempt,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error('Error fetching test attempt', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test attempt' },
      { status: 500 },
    )
  }
}

export const GET = withRole(['student', 'teacher', 'principal'], handler)
