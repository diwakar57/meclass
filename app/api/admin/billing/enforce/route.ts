import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { createLogger } from '@/lib/logger';
import { SaaSBillingService } from '@/lib/services/saas-billing';

const log = createLogger('AdminBillingEnforceAPI');

export async function POST(request: NextRequest) {
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

    const summary = await SaaSBillingService.enforceAllSchools(payload.userId);

    return NextResponse.json({
      success: true,
      data: summary,
      message: 'School payment status enforcement completed',
    });
  } catch (error) {
    log.error('Failed to enforce school billing states', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enforce school billing states' },
      { status: 500 }
    );
  }
}
