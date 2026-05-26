/**
 * app/api/syllabi/grades/route.ts
 * Grade management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/role-guard';
import { gradesService } from '@/lib/services/syllabus-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('GradesAPI');

interface CreateGradeRequest {
  name: string;
  level: number;
}

// GET /api/syllabi/grades
export async function GET(req: NextRequest) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'schoolId is required for this operation' },
        { status: 400 }
      );
    }
    const grades = await gradesService.listGrades(schoolId, userId);

    return NextResponse.json({
      success: true,
      data: grades,
      count: grades.length,
    });
  } catch (error) {
    log.error('Failed to list grades:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list grades' },
      { status: 400 }
    );
  }
}

// POST /api/syllabi/grades
export async function POST(req: NextRequest) {
  try {
    const { auth, error } = await requireRole(req, ['principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'schoolId is required for this operation' },
        { status: 400 }
      );
    }
    const body = (await req.json()) as Partial<CreateGradeRequest>;

    if (!body.name?.trim() || typeof body.level !== 'number') {
      return NextResponse.json(
        { success: false, error: 'name and level are required' },
        { status: 400 }
      );
    }

    const grade = await gradesService.createGrade(schoolId, body.name.trim(), body.level, userId);

    return NextResponse.json(
      {
        success: true,
        data: grade,
        message: `Grade "${grade.name}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error('Failed to create grade:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create grade' },
      { status: 400 }
    );
  }
}
