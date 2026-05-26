/**
 * API ENDPOINT: List Test Attempts
 * 
 * List student's test attempts with optional filtering
 * GET /api/test-attempts?limit=20&offset=0&testId=xyz&status=graded
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/middleware/auth'
import { createLogger } from '@/lib/logger'
import { testAttemptRepository } from '@/lib/repositories/test-attempt-repository'
import { TestAttemptListResponse } from '@/lib/types/test-attempts'
import type { AuthContext } from '@/lib/types/auth'

const logger = createLogger('ListTestAttemptsAPI')

function parseBoundedInt(rawValue: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(rawValue || '', 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

function mapPerformanceStatusToMastery(performanceStatus: unknown): string {
  switch (String(performanceStatus || '').toLowerCase()) {
    case 'excellent':
      return 'advanced'
    case 'good':
      return 'proficient'
    case 'satisfactory':
      return 'intermediate'
    default:
      return 'beginner'
  }
}

function normalizeAttemptForDashboard(attempt: any) {
  const totalPoints = Number(attempt?.totalPoints || 0)
  const pointsEarned = Number(attempt?.pointsEarned || 0)
  const percentageScore = Number(attempt?.percentageScore || 0)

  // The student tests UI expects a score/maxScore pair and title/mastery fields.
  const maxScore = totalPoints > 0 ? totalPoints : 100
  const score = totalPoints > 0 ? pointsEarned : Math.round(Math.max(0, Math.min(100, percentageScore)))

  return {
    ...attempt,
    title: attempt?.testName || 'Test Attempt',
    subject: attempt?.testType || undefined,
    score,
    maxScore,
    completedAt: attempt?.completedAt || attempt?.submittedAt || attempt?.startedAt || null,
    duration: attempt?.timeAllowedMinutes || undefined,
    masteryLevel: mapPerformanceStatusToMastery(attempt?.performanceStatus),
  }
}

async function handler(req: NextRequest, auth: AuthContext) {
  try {
    if (req.method !== 'GET') {
      return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
    }

    const searchParams = req.nextUrl.searchParams
    const limit = parseBoundedInt(searchParams.get('limit'), 20, 1, 100)
    const offset = parseBoundedInt(searchParams.get('offset'), 0, 0, 100000)

    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 })
    }

    const schoolId = auth.schoolId
    const userId = auth.userId
    const userRole = auth.role

    let attempts: any[]
    let total: number

    try {
      if (userRole === 'student') {
        // Students see only their own attempts
        const result = await testAttemptRepository.listByStudent(userId, schoolId, limit, offset)
        attempts = result.attempts
        total = result.total
      } else {
        // Teachers/principals can see all student attempts
        // For now, just return the student's attempts if no studentId param
        const studentId = searchParams.get('studentId') || userId
        const result = await testAttemptRepository.listByStudent(studentId, schoolId, limit, offset)
        attempts = result.attempts
        total = result.total
      }
    } catch (queryError) {
      const detail = queryError instanceof Error ? queryError.message : String(queryError)
      logger.error('Test attempts query failed; returning safe fallback payload', { detail })

      return NextResponse.json(
        {
          success: true,
          data: [],
          pagination: {
            total: 0,
            limit,
            offset,
          },
          warning: 'Test attempts are temporarily unavailable for the current schema state',
          ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
        },
        { status: 200 },
      )
    }

    const normalizedAttempts = attempts.map(normalizeAttemptForDashboard)

    const response: TestAttemptListResponse = {
      success: true,
      data: normalizedAttempts,
      pagination: {
        total,
        limit,
        offset,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error('Error listing test attempts', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { success: false, error: 'Failed to list test attempts' },
      { status: 500 },
    )
  }
}

export const GET = withRole(['student', 'teacher', 'principal'], handler)
