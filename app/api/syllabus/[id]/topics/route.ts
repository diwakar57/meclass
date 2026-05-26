import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { requireRoles, resolveTenantSchoolId } from '@/lib/middleware/role-guard';
import { SyllabusService } from '@/lib/services/syllabus';

const log = createLogger('SyllabusTopicsAPI');

const topicDependencySchema = z.object({
  dependsOnTopicId: z.string().optional(),
  dependsOnTopicName: z.string().optional(),
  dependsOnGradeId: z.string().optional(),
});

const addTopicSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  orderIndex: z.number().int().min(1),
  syllabusUnitId: z.string().optional(),
  sourceGradeId: z.string().optional(),
  schoolId: z.string().optional(),
  dependencies: z.array(topicDependencySchema).optional(),
});

function normalizeErrorStatus(message: string): number {
  const normalized = message.toLowerCase();
  if (normalized.includes('not found')) return 404;
  if (normalized.includes('forbidden') || normalized.includes('invalid role')) return 403;
  if (normalized.includes('order') || normalized.includes('circular')) return 400;
  return 500;
}

export async function POST(
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
    const parsed = addTopicSchema.safeParse(body);

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

    const topic = await SyllabusService.addTopicToSyllabus({
      schoolId,
      syllabusId: id,
      requesterId: access.auth.userId,
      requesterRole: access.auth.role,
      title: parsed.data.title,
      description: parsed.data.description,
      orderIndex: parsed.data.orderIndex,
      syllabusUnitId: parsed.data.syllabusUnitId,
      sourceGradeId: parsed.data.sourceGradeId,
      dependencies: parsed.data.dependencies,
    });

    return NextResponse.json({ success: true, data: topic }, { status: 201 });
  } catch (error) {
    log.error('Failed to add syllabus topic', error);
    const message = error instanceof Error ? error.message : 'Failed to add topic';
    return NextResponse.json(
      { success: false, error: message },
      { status: normalizeErrorStatus(message) }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const { id } = await context.params;
    const requestedSchoolId = request.nextUrl.searchParams.get('schoolId') || undefined;
    const schoolId = resolveTenantSchoolId(access.auth, requestedSchoolId);

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'Unable to resolve school scope' },
        { status: 400 }
      );
    }

    const topics = await SyllabusService.getSyllabusTopics(id, schoolId);
    return NextResponse.json({ success: true, data: topics });
  } catch (error) {
    log.error('Failed to fetch syllabus topics', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch syllabus topics',
      },
      { status: 500 }
    );
  }
}
