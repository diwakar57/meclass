import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { createLogger } from '@/lib/logger';
import { SaaSBillingService } from '@/lib/services/saas-billing';

const log = createLogger('AdminSchoolBillingStatusAPI');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'saas_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - SaaS admin access required' },
        { status: 403 }
      );
    }

    const { schoolId } = await params;
    const evaluation = await SaaSBillingService.evaluateSchoolPaymentStatus(schoolId, payload.userId);

    return NextResponse.json({ success: true, data: evaluation });
  } catch (error) {
    log.error('Failed to evaluate school billing status', error);
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate school billing status' },
      { status: 500 }
    );
  }
}
