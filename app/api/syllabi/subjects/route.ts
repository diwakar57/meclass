/**
 * app/api/syllabi/subjects/route.ts
 * Subject management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/role-guard';
import { subjectsService } from '@/lib/services/syllabus-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('SubjectsAPI');

interface CreateSubjectRequest {
  name: string;
  code: string;
}

// GET /api/syllabi/subjects
export async function GET(req: NextRequest) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    const subjects = await subjectsService.listSubjects(schoolId, userId);

    return NextResponse.json({
      success: true,
      data: subjects,
      count: subjects.length,
    });
  } catch (error) {
    log.error('Failed to list subjects:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list subjects' },
      { status: 400 }
    );
  }
}

// POST /api/syllabi/subjects
export async function POST(req: NextRequest) {
  try {
    const { auth, error } = await requireRole(req, ['principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    const body: CreateSubjectRequest = await req.json();

    const subject = await subjectsService.createSubject(
      schoolId,
      body.name,
      body.code,
      userId
    );

    return NextResponse.json(
      {
        success: true,
        data: subject,
        message: `Subject "${subject.name}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error('Failed to create subject:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create subject' },
      { status: 400 }
    );
  }
}
