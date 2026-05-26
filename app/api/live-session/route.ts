/**
 * Live Session API — /api/live-session
 *
 * POST   — create a new live session (teacher)
 * GET    — list live sessions for the caller's school
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { LiveSessionService } from '@/lib/services/live-session-service';
import type { AuthContext } from '@/lib/types/auth';

// POST /api/live-session — create session
export const POST = withRole(
  ['teacher', 'principal', 'admin'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      const body = await req.json();
      const { title, courseId, scheduledAt } = body;

      if (!title) {
        return NextResponse.json({ error: 'title is required' }, { status: 400 });
      }

      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }

      const session = await LiveSessionService.createSession({
        school_id: auth.schoolId,
        course_id: courseId ?? null,
        teacher_id: auth.userId,
        title,
        scheduled_at: scheduledAt ?? null,
      });

      return NextResponse.json({ success: true, session }, { status: 201 });
    } catch (error) {
      console.error('Create live session error:', error);
      return NextResponse.json({ error: 'Failed to create live session' }, { status: 500 });
    }
  },
);

// GET /api/live-session — list sessions
export const GET = withRole(
  ['teacher', 'principal', 'admin', 'student'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }

      const url = new URL(req.url);
      const status = url.searchParams.get('status') as 'scheduled' | 'live' | 'ended' | null;
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
      const offset = parseInt(url.searchParams.get('offset') ?? '0');

      const sessions = await LiveSessionService.listSessions(auth.schoolId, {
        status: status ?? undefined,
        teacherId: auth.role === 'teacher' ? auth.userId : undefined,
        limit,
        offset,
      });

      return NextResponse.json({ success: true, sessions });
    } catch (error) {
      console.error('List live sessions error:', error);
      return NextResponse.json({ error: 'Failed to list live sessions' }, { status: 500 });
    }
  },
);
