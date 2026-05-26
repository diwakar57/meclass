import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { requireRoles, resolveTenantSchoolId } from '@/lib/middleware/role-guard';
import { SyllabusService } from '@/lib/services/syllabus';

const log = createLogger('SyllabusAPI');

const createSyllabusSchema = z.object({
  gradeId: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().min(3).max(255),
  teacherId: z.string().min(1).optional(),
  schoolId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireRoles(request, ['teacher', 'principal', 'saas_admin']);
    if (access.error || !access.auth) {
      return access.error as NextResponse;
    }

    const body = await request.json();
    const parsed = createSyllabusSchema.safeParse(body);

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

    const teacherId = parsed.data.teacherId || access.auth.userId;

    const syllabus = await SyllabusService.createSyllabus({
      schoolId,
      gradeId: parsed.data.gradeId,
      subjectId: parsed.data.subjectId,
      teacherId,
      title: parsed.data.title,
      requesterRole: access.auth.role,
    });

    return NextResponse.json({ success: true, data: syllabus }, { status: 201 });
  } catch (error) {
    log.error('Failed to create syllabus', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create syllabus' },
      { status: 500 }
    );
  }
}
