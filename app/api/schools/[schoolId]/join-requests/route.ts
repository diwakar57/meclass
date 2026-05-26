/**
 * API Route: GET /api/schools/[schoolId]/join-requests
 * List pending join requests for a school (principal only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { verifyAuth } from '@/lib/middleware/auth';
import { membershipService } from '@/lib/services/entity-service';
import { UserRole } from '@/lib/models/entity-models';

const log = createLogger('API /api/schools/[schoolId]/join-requests');

export async function GET(request: NextRequest, { params }: { params: { schoolId: string } }) {
  try {
    const { schoolId } = params;

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only school admin can view join requests
    if (auth.schoolId !== schoolId || auth.role !== UserRole.PRINCIPAL) {
      return NextResponse.json(
        { error: 'Only school principals can view join requests' },
        { status: 403 }
      );
    }

    const requests = await membershipService.getPendingRequests(schoolId, auth.userId);

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    log.error('Error fetching join requests', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch join requests' }, { status: 500 });
  }
}
