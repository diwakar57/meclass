/**
 * API ENDPOINT: Analyze Test Attempt
 * 
 * Performs comprehensive confidence vs performance analysis
 * Returns readiness level, mismatch type, strong/weak topics, and recommendations
 * 
 * POST /api/test-attempts/:id/analyze
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/middleware/auth'
import { createLogger } from '@/lib/logger'
import { testAttemptRepository } from '@/lib/repositories/test-attempt-repository'
import { analyzeTestAttempt, saveAnalysis } from '@/lib/services/test-attempt-analysis-service'
import { ConfidenceAnalysisResponse } from '@/lib/types/test-attempts'
import type { AuthContext } from '@/lib/types/auth'

const logger = createLogger('AnalyzeTestAttemptAPI')

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
    // Students can only analyze their own attempts
    // Teachers can analyze any student's attempt
    if (userRole === 'student' && attempt.studentId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Must be graded to analyze
    if (!['graded', 'reviewed'].includes(attempt.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test must be graded before analysis can be performed',
        },
        { status: 400 },
      )
    }

    // Check if analysis already exists
    // If so, return cached version (optional optimization)
    // For now, always recalculate

    try {
      // Perform analysis
      const analysis = await analyzeTestAttempt(id, schoolId)

      // Save analysis for future reference
      await saveAnalysis(analysis, schoolId)

      logger.info('Test attempt analyzed', {
        attemptId: id,
        studentId: attempt.studentId,
        readinessLevel: analysis.readinessLevel,
        mismatchType: analysis.confidenceMismatchType,
      })

      const response: ConfidenceAnalysisResponse = {
        success: true,
        data: analysis,
      }

      return NextResponse.json(response, { status: 200 })
    } catch (analysisError) {
      logger.error('Error during analysis calculation', {
        attemptId: id,
        error: analysisError instanceof Error ? analysisError.message : String(analysisError),
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to analyze test attempt',
        },
        { status: 500 },
      )
    }
  } catch (error) {
    logger.error('Error in analyze endpoint', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export const POST = withRole(['student', 'teacher', 'principal'], handler)
