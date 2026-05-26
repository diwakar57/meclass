/**
 * app/api/syllabi/[id]/publish/route.ts
 * Publish syllabus endpoint - creates version snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/role-guard';
import { syllabusService } from '@/lib/services/syllabus-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('PublishSyllabusAPI');

// POST /api/syllabi/[id]/publish
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const changeNote = (body as any)?.changeNote;

    const published = await syllabusService.publishSyllabus(
      id,
      schoolId,
      userId,
      changeNote
    );

    return NextResponse.json(
      {
        success: true,
        data: published,
        message: `Syllabus "${published.title}" published successfully as version ${published.version}`,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error('Failed to publish syllabus:', error);
    const message = error instanceof Error ? error.message : 'Failed to publish syllabus';
    const status = message.includes('Circular') || message.includes('Cannot') ? 400 : 400;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
