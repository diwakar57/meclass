/**
 * API Route: POST /api/schools/[schoolId]/students/join
 * Student requests to join a school
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { verifyAuth } from '@/lib/middleware/auth';
import { membershipService } from '@/lib/services/entity-service';
import { UserRole } from '@/lib/models/entity-models';

const log = createLogger('API /api/schools/[schoolId]/students/join');

export async function POST(request: NextRequest, { params }: { params: { schoolId: string } }) {
  try {
    const { schoolId } = params;

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only students can join schools
    if (auth.role !== UserRole.STUDENT) {
      return NextResponse.json(
        { error: 'Only students can join schools' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const joinRequest = await membershipService.requestToJoinSchool(
      auth.userId,
      schoolId,
      body.message || undefined,
      auth.userId
    );

    log.info(`Student ${auth.userId} requested to join school ${schoolId}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Join request submitted. Awaiting school approval.',
        data: joinRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    log.error('Error requesting to join school', error);

    if (error.message.includes('already')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || 'Failed to submit join request' }, { status: 500 });
  }
}

/**
 * API Route: GET /api/schools/[schoolId]/students
 * Get approved members of a school
 */
export async function GET(request: NextRequest, { params }: { params: { schoolId: string } }) {
  try {
    const { schoolId } = params;

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Any school member can list members
    if (auth.schoolId !== schoolId && auth.role !== UserRole.SAAS_ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const members = await membershipService.getSchoolMembers(schoolId, auth.userId);

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error: any) {
    log.error('Error fetching school members', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch members' }, { status: 500 });
  }
}
