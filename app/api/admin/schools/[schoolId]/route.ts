import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SchoolService } from '@/lib/services/school';
import { SaaSBillingService } from '@/lib/services/saas-billing';
import { createLogger } from '@/lib/logger';

const log = createLogger('SchoolApprovalAPI');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    // Verify auth
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'saas_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - SaaS admin access required' },
        { status: 403 }
      );
    }

    const { schoolId } = await params;
    const body = await request.json();
    const { action, reason } = body; // 'approve' | 'reject' | 'suspend' | 'activate'

    if (action === 'approve') {
      const school = await SchoolService.approveSchool(schoolId);
      return NextResponse.json({
        success: true,
        data: school,
        message: 'School approved successfully',
      });
    } else if (action === 'reject') {
      const school = await SchoolService.rejectSchool(schoolId);
      return NextResponse.json({
        success: true,
        data: school,
        message: 'School rejected',
      });
    } else if (action === 'suspend') {
      const result = await SaaSBillingService.setSchoolEnabled(
        schoolId,
        false,
        payload.userId,
        reason || 'Suspended by SaaS admin'
      );
      return NextResponse.json({
        success: true,
        data: result,
        message: 'School suspended successfully',
      });
    } else if (action === 'activate') {
      const result = await SaaSBillingService.setSchoolEnabled(
        schoolId,
        true,
        payload.userId,
        reason || 'Activated by SaaS admin'
      );
      return NextResponse.json({
        success: true,
        data: result,
        message: 'School activated successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use approve, reject, suspend, or activate.' },
        { status: 400 }
      );
    }
  } catch (error) {
    log.error('Failed to process school approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
