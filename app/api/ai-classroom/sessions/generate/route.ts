/**
 * API Route: POST /api/ai-classroom/sessions/generate
 * Generate a new AI classroom session
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createLogger } from '@/lib/logger';
import { query } from '@/lib/db';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';
import type { GenerateAIClassroomSessionRequest } from '@/lib/types/ai-classroom';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('GenerateAIClassroomSession');

export const POST = withRole(
  ['student', 'teacher', 'principal', 'school_admin'],
  async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json(
        { error: 'Missing tenant scope' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json() as Partial<GenerateAIClassroomSessionRequest>;

    // 3. BUILD & VALIDATE REQUEST
    const request: GenerateAIClassroomSessionRequest = {
      studentId: body.studentId || auth.userId, // Default to self
      schoolId: auth.schoolId,
      topicId: body.topicId || '',
      sessionDuration: body.sessionDuration,
      teachingStyle: body.teachingStyle,
      enableVideo: body.enableVideo,
      enableAudio: body.enableAudio,
      enableInteraction: body.enableInteraction,
      enableQuiz: body.enableQuiz,
    };

    if (!request.topicId) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'topicId is required'
        },
        { status: 400 }
      );
    }

    // Ensure student belongs to same school (tenant isolation)
    if (request.studentId !== auth.userId) {
      // Only teachers/admins can request sessions for other students
      if (!['teacher', 'principal', 'school_admin'].includes(auth.role)) {
        return NextResponse.json(
          { error: 'Unauthorized: cannot generate session for other students' },
          { status: 403 }
        );
      }

      // Verify target student belongs to same school
      const studentResult = await query(
        `SELECT school_id FROM users WHERE id = $1 AND school_id = $2`,
        [request.studentId, auth.schoolId]
      );

      if (!studentResult.rows[0]) {
        return NextResponse.json(
          { error: 'Student not found or not in your school' },
          { status: 404 }
        );
      }
    }

    // 4. GENERATE SESSION
    const response = await LearnAIIntegrationService.generateAIClassroomSession(request);

    logger.info('Session generated successfully', {
      sessionId: response.sessionId,
      studentId: request.studentId,
      topicId: request.topicId,
    });

    return NextResponse.json(response, { status: 202 });

  } catch (error) {
    logger.error('Failed to generate AI classroom session', { error });

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate session',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});
