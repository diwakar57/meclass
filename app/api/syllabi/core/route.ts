/**
 * app/api/syllabi/core/route.ts
 * Core syllabi endpoints: list, create, view, update, delete, publish
 * Authentication required: Teacher or Principal
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/role-guard';
import { syllabusService, gradesService, subjectsService } from '@/lib/services/syllabus-service';
import { createLogger } from '@/lib/logger';
import type {
  CreateSyllabusRequest,
  UpdateSyllabusRequest,
  ListSyllabiiParams,
} from '@/lib/types/syllabi';

const log = createLogger('SyllabusAPI');

// GET /api/syllabi/core?gradeId=&subjectId=&status=&teacherId=
export async function GET(req: NextRequest) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId } = auth!;
    const params = new URLSearchParams(req.nextUrl.search);

    const listParams: ListSyllabiiParams = {
      schoolId,
      gradeId: params.get('gradeId') || undefined,
      subjectId: params.get('subjectId') || undefined,
      status: (params.get('status') as any) || undefined,
      teacherId: params.get('teacherId') || undefined,
      limit: parseInt(params.get('limit') || '50'),
      offset: parseInt(params.get('offset') || '0'),
    };

    const result = await syllabusService.listSyllabi(listParams, auth!.userId);

    return NextResponse.json({
      success: true,
      data: result.syllabi,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    log.error('Failed to list syllabi:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list syllabi' },
      { status: 400 }
    );
  }
}

// POST /api/syllabi/core
export async function POST(req: NextRequest) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    const body: CreateSyllabusRequest = await req.json();

    const syllabus = await syllabusService.createSyllabus(schoolId, body, userId);

    return NextResponse.json(
      {
        success: true,
        data: syllabus,
        message: `Syllabus "${syllabus.title}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error('Failed to create syllabus:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create syllabus' },
      { status: 400 }
    );
  }
}
