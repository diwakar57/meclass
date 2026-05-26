/**
 * API Route: GET /api/ai-classroom/sessions/[id]/transcript
 * Get complete transcript of a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createLogger } from '@/lib/logger';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('GetTranscript');

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

    // 3. VERIFY SESSION ACCESS
    const sessionData = await LearnAIIntegrationService.getSession(sessionId, auth.schoolId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (sessionData.studentId !== auth.userId && !['teacher', 'principal', 'school_admin'].includes(auth.role)) {
      return NextResponse.json(
        { error: 'Unauthorized: cannot view this transcript' },
        { status: 403 }
      );
    }

    // 4. FETCH TRANSCRIPT
    const transcriptResult = await query(
      `SELECT * FROM session_transcripts 
       WHERE session_id = $1 AND school_id = $2`,
      [sessionId, auth.schoolId]
    );

    if (!transcriptResult.rows[0]) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    const row = transcriptResult.rows[0];

    // 5. GET FORMAT PREFERENCE FROM QUERY
    const url = new URL(req.url);
    const format = (url.searchParams.get('format') || 'json') as 'json' | 'plaintext';

    if (format === 'plaintext') {
      // Return as plain text
      return new NextResponse(row.plain_text || '', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="session-${sessionId}-transcript.txt"`,
        },
      });
    }

    // Return as JSON (default)
    const transcript = {
      id: row.id,
      sessionId: row.session_id,
      entries: typeof row.entries === 'string' ? JSON.parse(row.entries) : row.entries,
      plainText: row.plain_text,
      wordCount: row.word_count,
      language: row.language,
      generatedAt: row.generated_at,
      createdAt: row.created_at,
    };

    logger.info('Transcript retrieved', {
      sessionId,
      wordCount: row.word_count,
    });

    return NextResponse.json(transcript, { status: 200 });

  } catch (error) {
    logger.error('Failed to get transcript', { error });
    return NextResponse.json(
      { error: 'Failed to get transcript' },
      { status: 500 }
    );
  }
});
