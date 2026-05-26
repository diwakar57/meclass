import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { requireRoles, resolveTenantSchoolId } from '@/lib/middleware/role-guard';
import { SyllabusService } from '@/lib/services/syllabus';

const log = createLogger('SyllabusByGradeSubjectAPI');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gradeId: string; subjectId: string }> }
) {
  try {
    const access = await requireRoles(request, [
      'teacher',
      'principal',
      'student',
      'accountant',
      'supervisor',
      'saas_admin',
    ]);

    if (access.error || !access.auth) {
      return access.error as NextResponse;
    }

    const { gradeId, subjectId } = await context.params;
    const requestedSchoolId = request.nextUrl.searchParams.get('schoolId') || undefined;

    const schoolId = resolveTenantSchoolId(access.auth, requestedSchoolId);
    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'Unable to resolve school scope' },
        { status: 400 }
      );
    }

    const syllabus = await SyllabusService.getSyllabusByGradeAndSubject(
      gradeId,
      subjectId,
      schoolId
    );

    if (!syllabus) {
      return NextResponse.json({ success: false, error: 'Syllabus not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: syllabus });
  } catch (error) {
    log.error('Failed to fetch syllabus', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch syllabus' },
      { status: 500 }
    );
  }
}
