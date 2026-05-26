/**
 * app/api/syllabi/[id]/validate/route.ts
 * Validate syllabus structure endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/role-guard';
import { syllabusService } from '@/lib/services/syllabus-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ValidateSyllabusAPI');

// POST /api/syllabi/[id]/validate
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { auth, error } = await requireRole(req, ['teacher', 'principal', 'saas_admin']);
    if (error) return error;

    const { schoolId } = auth!;
    const { id } = params;

    const validation = await syllabusService.validateSyllabus(id, schoolId);

    return NextResponse.json({
      success: validation.valid,
      data: validation,
      message: validation.valid 
        ? 'Syllabus is valid and ready to publish'
        : `Validation failed: ${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`,
    });
  } catch (error) {
    log.error('Failed to validate syllabus:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to validate' },
      { status: 400 }
    );
  }
}
