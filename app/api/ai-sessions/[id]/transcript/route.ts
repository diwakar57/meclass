import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export const GET = withRole(
  ['student', 'teacher', 'principal', 'school_admin'],
  async (
    req: NextRequest,
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

    const transcriptResult = await query(
      `SELECT *
       FROM session_transcripts
       WHERE session_id = $1 AND school_id = $2`,
      [sessionId, auth.schoolId]
    );

    if (transcriptResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Transcript not found' }, { status: 404 });
    }

    const row = transcriptResult.rows[0];
    const format = req.nextUrl.searchParams.get('format') || 'json';

    if (format === 'plaintext') {
      return new NextResponse(row.plain_text || '', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        sessionId: row.session_id,
        entries: parseJson(row.entries, []),
        plainText: row.plain_text || '',
        wordCount: Number(row.word_count || 0),
        language: row.language || 'en-US',
        generatedAt: row.generated_at,
      },
    });
  }
);
