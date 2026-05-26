/**
 * Proctoring API — /api/proctoring
 *
 * POST — start a new proctoring session
 * GET  — list flagged sessions (teacher/admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { ProctoringService } from '@/lib/services/proctoring-service';
import type { AuthContext } from '@/lib/types/auth';

// POST /api/proctoring — start session
export const POST = withRole(
  ['student'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }

      const body = await req.json();
      const { examAttemptId, examId } = body;

      if (!examAttemptId || !examId) {
        return NextResponse.json(
          { error: 'examAttemptId and examId are required' },
          { status: 400 },
        );
      }

      const session = await ProctoringService.startSession(
        examAttemptId,
        auth.userId,
        auth.schoolId,
        examId,
      );

      return NextResponse.json({ success: true, session }, { status: 201 });
    } catch (error) {
      console.error('Proctoring start error:', error);
      return NextResponse.json({ error: 'Failed to start proctoring session' }, { status: 500 });
    }
  },
);

// GET /api/proctoring — list flagged sessions
export const GET = withRole(
  ['teacher', 'principal', 'admin'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ error: 'School context required' }, { status: 400 });
      }
      const sessions = await ProctoringService.listFlaggedSessions(auth.schoolId);
      return NextResponse.json({ success: true, sessions });
    } catch (error) {
      console.error('Proctoring list error:', error);
      return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
    }
  },
);
