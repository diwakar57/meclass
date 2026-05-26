/**
 * Live Session Detail API — /api/live-session/[id]
 *
 * GET    — get session details
 * PATCH  — update session (start, end, update transcript/summary/recording)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { LiveSessionService } from '@/lib/services/live-session-service';
import type { AuthContext } from '@/lib/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/live-session/[id]
export const GET = withRole(
  ['teacher', 'principal', 'admin', 'student'],
  async (req: NextRequest, auth: AuthContext, ctx: RouteContext) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }
      const { id } = await ctx.params;
      const session = await LiveSessionService.getSession(id, auth.schoolId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      const analytics = await LiveSessionService.getSessionAnalytics(id, auth.schoolId);
      return NextResponse.json({ success: true, session, analytics });
    } catch (error) {
      console.error('Get live session error:', error);
      return NextResponse.json({ error: 'Failed to get live session' }, { status: 500 });
    }
  },
);

// PATCH /api/live-session/[id]
export const PATCH = withRole(
  ['teacher', 'principal', 'admin'],
  async (req: NextRequest, auth: AuthContext, ctx: RouteContext) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }
      const { id } = await ctx.params;
      const body = await req.json();
      const { action, ...updates } = body;

      let session;
      if (action === 'start') {
        session = await LiveSessionService.startSession(id, auth.userId);
      } else if (action === 'end') {
        session = await LiveSessionService.endSession(id, auth.userId);
      } else {
        // General update (transcript, summary, recording, etc.)
        session = await LiveSessionService.updateSession(id, {
          recording_url: updates.recordingUrl ?? undefined,
          transcript: updates.transcript ?? undefined,
          ai_summary: updates.aiSummary ?? undefined,
          participant_count: updates.participantCount ?? undefined,
          metadata: updates.metadata ?? undefined,
        });
      }

      return NextResponse.json({ success: true, session });
    } catch (error) {
      console.error('Update live session error:', error);
      return NextResponse.json({ error: 'Failed to update live session' }, { status: 500 });
    }
  },
);
