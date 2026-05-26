import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { requireRoles, resolveTenantSchoolId } from '@/lib/middleware/role-guard';
import { SyllabusService } from '@/lib/services/syllabus';

const log = createLogger('SyllabusByIdAPI');

const updateSyllabusSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  changeNote: z.string().max(500).optional(),
  schoolId: z.string().min(1).optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireRoles(request, ['teacher', 'principal', 'saas_admin']);
    if (access.error || !access.auth) {
      return access.error as NextResponse;
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateSyllabusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const schoolId = resolveTenantSchoolId(access.auth, parsed.data.schoolId);
    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'Unable to resolve school scope' },
        { status: 400 }
      );
    }

    const updated = await SyllabusService.updateSyllabus({
      schoolId,
      syllabusId: id,
      requesterId: access.auth.userId,
      requesterRole: access.auth.role,
      title: parsed.data.title,
      status: parsed.data.status,
      changeNote: parsed.data.changeNote,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error('Failed to update syllabus', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update syllabus' },
      { status: 500 }
    );
  }
}
