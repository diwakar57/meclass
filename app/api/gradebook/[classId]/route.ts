import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('GradebookClassAPI');

export const GET = withRole(
  ['teacher', 'principal', 'school_admin'],
  async (_req: NextRequest, auth: AuthContext, context?: { params?: Promise<{ classId: string }> }) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
      }

      const params = await context?.params;
      const classId = params?.classId;

      if (!classId) {
        return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 });
      }

      const teacherScope = auth.role === 'teacher' ? auth.userId : undefined;
      const gradebooks = await lmsPhase2Service.getGradebookForTeacher(auth.schoolId, teacherScope, classId);
      const data = gradebooks[0] || null;

      return NextResponse.json({ success: true, data });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch class gradebook', { detail, role: auth.role, schoolId: auth.schoolId });
      return NextResponse.json({
        success: true,
        data: null,
        warning: 'Class gradebook is unavailable for the current schema',
        ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
      });
    }
  }
);
