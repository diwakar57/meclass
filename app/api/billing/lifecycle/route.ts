import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/middleware/role-guard';
import { createLogger } from '@/lib/logger';
import { SaaSBillingService } from '@/lib/services/saas-billing';
import { notificationService } from '@/lib/services/notification-service';

const log = createLogger('BillingLifecycleAPI');

export async function POST(request: NextRequest) {
  try {
    const access = await requireRoles(request, ['principal', 'accountant']);
    if (access.error || !access.auth) {
      return access.error ?? NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!access.auth.schoolId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant scope for billing lifecycle operation' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const reason = typeof body.reason === 'string' ? body.reason : undefined;
    const planCode = typeof body.planCode === 'string' ? body.planCode : undefined;
    const monthlyPrice =
      typeof body.monthlyPrice === 'number' && Number.isFinite(body.monthlyPrice)
        ? body.monthlyPrice
        : undefined;
    const studentLimit =
      typeof body.studentLimit === 'number' && Number.isFinite(body.studentLimit)
        ? body.studentLimit
        : undefined;

    const allowedActions = new Set(['start_trial', 'activate', 'pause', 'resume', 'cancel']);
    if (!allowedActions.has(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use one of: start_trial, activate, pause, resume, cancel',
        },
        { status: 400 }
      );
    }

    const result = await SaaSBillingService.transitionSchoolBillingLifecycle(
      access.auth.schoolId,
      action as 'start_trial' | 'activate' | 'pause' | 'resume' | 'cancel',
      access.auth.userId,
      {
        reason,
        planCode,
        monthlyPrice,
        studentLimit,
      }
    );

    try {
      await notificationService.notifyBillingLifecycle({
        schoolId: access.auth.schoolId,
        status: result.lifecycleStatus,
        planCode: result.planCode,
        reason,
        changedByUserId: access.auth.userId,
      });
    } catch (notificationError) {
      log.warn('Billing lifecycle notification dispatch failed', {
        schoolId: access.auth.schoolId,
        action,
        error: notificationError,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to apply billing lifecycle update', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply billing lifecycle update' },
      { status: 500 }
    );
  }
}

