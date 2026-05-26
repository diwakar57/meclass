import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import type { GenerateAIClassroomSessionRequest } from '@/lib/types/ai-classroom';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';

export const GET = withRole(
  ['student', 'teacher', 'principal', 'school_admin'],
  async (req: NextRequest, auth: AuthContext) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
    }

    const requestedStudentId = req.nextUrl.searchParams.get('studentId');
    const studentId = requestedStudentId || auth.userId;
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') || 20), 1), 100);
    const offset = Math.max(Number(req.nextUrl.searchParams.get('offset') || 0), 0);

    if (studentId !== auth.userId && !['teacher', 'principal', 'school_admin'].includes(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { sessions, total } = await LearnAIIntegrationService.listStudentSessions(
      studentId,
      auth.schoolId,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      data: sessions,
      meta: {
        total,
        limit,
        offset,
      },
    });
  }
);

export const POST = withRole(
  ['student', 'teacher', 'principal', 'school_admin'],
  async (req: NextRequest, auth: AuthContext) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing tenant scope' }, { status: 401 });
    }

    const body = (await req.json()) as Partial<GenerateAIClassroomSessionRequest>;
    const studentId = body.studentId || auth.userId;
    const topicId = body.topicId || '';

    if (!topicId) {
      return NextResponse.json({ success: false, error: 'topicId is required' }, { status: 400 });
    }

    if (studentId !== auth.userId && !['teacher', 'principal', 'school_admin'].includes(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (studentId !== auth.userId) {
      const studentCheck = await query(
        `SELECT id FROM users WHERE id = $1 AND school_id = $2 AND role = 'student'`,
        [studentId, auth.schoolId]
      );
      if (studentCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Student not found in your school' },
          { status: 404 }
        );
      }
    }

    const session = await LearnAIIntegrationService.generateAIClassroomSession({
      studentId,
      schoolId: auth.schoolId,
      topicId,
      sessionDuration: body.sessionDuration,
      teachingStyle: body.teachingStyle,
      enableAudio: body.enableAudio,
      enableVideo: body.enableVideo,
      enableInteraction: body.enableInteraction,
      enableQuiz: body.enableQuiz,
      enableWebSearch: body.enableWebSearch,
    });

    return NextResponse.json({
      success: true,
      data: session,
    }, { status: 201 });
  }
);
