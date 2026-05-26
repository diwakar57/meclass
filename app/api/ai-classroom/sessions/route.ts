/**
 * API Route: GET /api/ai-classroom/sessions
 * List AI classroom sessions for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createLogger } from '@/lib/logger';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('ListAIClassroomSessions');

export const GET = withRole(
  ['student', 'teacher', 'principal', 'school_admin'],
  async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Missing tenant scope' }, { status: 401 });
    }

    // 3. GET QUERY PARAMETERS
    const url = new URL(req.url);
    const studentId = url.searchParams.get('studentId') || auth.userId;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // 4. AUTHORIZATION: Can only view own sessions unless teacher/admin
    if (studentId !== auth.userId) {
      if (!['teacher', 'principal', 'school_admin'].includes(auth.role)) {
        return NextResponse.json(
          { error: 'Unauthorized: cannot view other students\' sessions' },
          { status: 403 }
        );
      }
    }

    // 5. FETCH SESSIONS
    const { sessions, total } = await LearnAIIntegrationService.listStudentSessions(
      studentId,
      auth.schoolId,
      limit,
      offset
    );

    logger.info('Sessions listed', {
      studentId,
      count: sessions.length,
      total,
    });

    return NextResponse.json(
      {
        sessions,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      { status: 200 }
    );

  } catch (error) {
    logger.error('Failed to list sessions', { error });
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
});
