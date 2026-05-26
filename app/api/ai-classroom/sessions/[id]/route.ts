/**
 * API Route: GET /api/ai-classroom/sessions/[id]
 * Fetch a single AI classroom session
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createLogger } from '@/lib/logger';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('GetAIClassroomSession');

export const GET = withRole(
  ['student', 'teacher', 'principal', 'school_admin'],
  async (
    req: NextRequest,
    auth: AuthContext,
    context?: { params?: { id?: string } } | Promise<{ params?: { id?: string } }>
  ) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Missing tenant scope' }, { status: 401 });
    }
    const resolvedContext = context && typeof (context as Promise<any>).then === 'function'
      ? await (context as Promise<any>)
      : context;
    const sessionId = resolvedContext?.params?.id;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 3. FETCH SESSION
    const sessionData = await LearnAIIntegrationService.getSession(sessionId, auth.schoolId);

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // 4. AUTHORIZATION: Verify ownership or teaching role
    if (sessionData.studentId !== auth.userId) {
      if (!['teacher', 'principal', 'school_admin'].includes(auth.role)) {
        return NextResponse.json(
          { error: 'Unauthorized: cannot view this session' },
          { status: 403 }
        );
      }
    }

    logger.info('Session retrieved', {
      sessionId,
      studentId: sessionData.studentId,
    });

    return NextResponse.json(sessionData, { status: 200 });

  } catch (error) {
    logger.error('Failed to fetch session', { error });
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
});
