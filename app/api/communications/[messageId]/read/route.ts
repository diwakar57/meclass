import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

const ALLOWED_ROLES = [
  'teacher',
  'student',
  'parent',
  'principal',
  'school_admin',
  'accountant',
  'supervisor',
] as const;

export const POST = withRole(
  [...ALLOWED_ROLES],
  async (
    _request: NextRequest,
    auth: AuthContext,
    context?: { params?: Promise<{ messageId: string }> }
  ) => {
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
    }

    const params = await context?.params;
    const messageId = params?.messageId;

    if (!messageId) {
      return NextResponse.json({ success: false, error: 'messageId is required' }, { status: 400 });
    }

    const marked = await lmsPhase2Service.markMessageRead({
      schoolId: auth.schoolId,
      userId: auth.userId,
      messageId,
    });

    if (!marked) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Message marked as read',
      messageId,
    });
  }
);
