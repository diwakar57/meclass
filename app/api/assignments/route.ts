import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

export const GET = withRole(
  ['teacher', 'principal', 'school_admin', 'student', 'parent', 'accountant', 'supervisor'],
  async (_req: NextRequest, auth: AuthContext) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const assignments = await lmsPhase2Service.listAssignments(auth);
    return NextResponse.json({ success: true, data: assignments });
  }
);

export const POST = withRole(
  ['teacher', 'principal', 'school_admin'],
  async (req: NextRequest, auth: AuthContext) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const body = await req.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const dueDate = typeof body?.dueDate === 'string' ? body.dueDate : '';

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    }

    if (!dueDate) {
      return NextResponse.json({ success: false, error: 'dueDate is required' }, { status: 400 });
    }

    const assignment = await lmsPhase2Service.createAssignment({
      schoolId: auth.schoolId,
      actorUserId: auth.userId,
      actorRole: auth.role,
      title,
      description: typeof body?.description === 'string' ? body.description : undefined,
      dueDate,
      classId: typeof body?.classId === 'string' ? body.classId : undefined,
      className: typeof body?.className === 'string' ? body.className : undefined,
      maxScore:
        typeof body?.maxScore === 'number'
          ? body.maxScore
          : typeof body?.maxScore === 'string'
            ? Number(body.maxScore)
            : undefined,
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  }
);
