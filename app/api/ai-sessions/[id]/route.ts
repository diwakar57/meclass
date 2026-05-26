import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';

export const GET = withRole(
  ['student', 'teacher', 'principal', 'school_admin'],
  async (
    _req: NextRequest,
    auth: AuthContext,
    context?: { params?: { id?: string } } | Promise<{ params?: { id?: string } }>
  ) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
    }

    const resolvedContext =
      context && typeof (context as Promise<any>).then === 'function'
        ? await (context as Promise<any>)
        : context;
    const sessionId = resolvedContext?.params?.id;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session id is required' }, { status: 400 });
    }

    const session = await LearnAIIntegrationService.getSession(sessionId, auth.schoolId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (session.studentId !== auth.userId && !['teacher', 'principal', 'school_admin'].includes(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  }
);
