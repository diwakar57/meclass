/**
 * Individual Syllabus API Routes - GET/PATCH/DELETE /api/syllabi/[id]
 * Teacher-controlled syllabus management with versioning
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/role-guard';
import { syllabusService } from '@/lib/services/syllabus-service';
import { createLogger } from '@/lib/logger';
import type { UpdateSyllabusRequest } from '@/lib/types/syllabi';

const log = createLogger('SyllabusDetailAPI');

// GET /api/syllabi/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    const { id } = params;

    const syllabus = await syllabusService.getSyllabusWithDetails(id, schoolId, userId);

    return NextResponse.json({
      success: true,
      data: syllabus,
    });
  } catch (error) {
    log.error('Failed to get syllabus:', error);
    const message = error instanceof Error ? error.message : 'Failed to get syllabus';
    const status = message.includes('not found') ? 404 : 400;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

// PATCH /api/syllabi/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    const { id } = params;
    const body: UpdateSyllabusRequest = await req.json();

    const syllabus = await syllabusService.updateSyllabus(id, schoolId, body, userId);

    return NextResponse.json({
      success: true,
      data: syllabus,
      message: 'Syllabus updated successfully',
    });
  } catch (error) {
    log.error('Failed to update syllabus:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update syllabus' },
      { status: 400 }
    );
  }
}

// DELETE /api/syllabi/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId, userId } = auth!;
    const { id } = params;

    await syllabusService.deleteSyllabus(id, schoolId, userId);

    return NextResponse.json({
      success: true,
      message: 'Syllabus deleted successfully',
    });
  } catch (error) {
    log.error('Failed to delete syllabus:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete syllabus';
    const status = message.includes('not found') ? 404 : 400;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
