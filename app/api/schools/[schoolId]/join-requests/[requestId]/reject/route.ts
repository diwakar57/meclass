/**
 * API Route: POST /api/schools/[schoolId]/join-requests/[requestId]/reject
 * Principal rejects a student join request
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { verifyAuth } from '@/lib/middleware/auth';
import { membershipService } from '@/lib/services/entity-service';
import { UserRole } from '@/lib/models/entity-models';

const log = createLogger('API /api/schools/[schoolId]/join-requests/[requestId]/reject');

export async function POST(
  request: NextRequest,
  { params }: { params: { schoolId: string; requestId: string } }
) {
  try {
    const { schoolId, requestId } = params;

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only principal can reject
    if (auth.schoolId !== schoolId || auth.role !== UserRole.PRINCIPAL) {
      return NextResponse.json(
        { error: 'Only school principals can reject join requests' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const joinRequest = await membershipService.rejectJoinRequest(
      schoolId,
      requestId,
      auth.userId,
      body.reason || undefined
    );

    log.info(`Rejected join request ${requestId}`);

    return NextResponse.json({
      success: true,
      message: 'Join request rejected.',
      data: joinRequest,
    });
  } catch (error: any) {
    log.error('Error rejecting join request', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || 'Failed to reject join request' }, { status: 500 });
  }
}
