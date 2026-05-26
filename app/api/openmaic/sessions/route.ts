/**
 * GET /api/ai-classroom/sessions
 * List AI classroom sessions for the current student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { createLogger } from '@/lib/logger';
import { listStudentAIClassroomSessions } from '@/lib/services/ai-classroom-session-service';
import { query } from '@/lib/db';

const logger = createLogger('ListAIClassroomSessions');

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's school_id
    const userResult = await query(
      `SELECT school_id FROM users WHERE id = $1`,
      [session.user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { school_id } = userResult.rows[0];

    // Get pagination params
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    // List student's sessions
    const { sessions, total } = await listStudentAIClassroomSessions(
      session.user.id,
      school_id,
      limit,
      offset
    );

    return NextResponse.json(
      {
        sessions,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to list AI classroom sessions', { error });
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}
