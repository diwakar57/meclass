import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('AccountantBillingAPI');

export async function GET(request: NextRequest) {
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
    if (!payload || payload.role !== 'accountant') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get all school billing records
    const result = await query(
      `SELECT s.id, s.name, s.subscription_plan as plan, s.subscription_status as status,
              COALESCE(s.monthly_fee, 0) as amount, 
              COALESCE(s.next_billing_date, NOW() + INTERVAL '30 days') as due_date,
              s.last_payment_date
       FROM schools s
       WHERE s.subscription_status IS NOT NULL
       ORDER BY s.next_billing_date ASC`
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map((row: any) => ({
        school: {
          id: row.id,
          name: row.name,
          plan: row.plan || 'basic',
          status: row.status || 'active',
        },
        amount: Number(row.amount) || 0,
        dueDate: row.due_date,
        lastPaymentDate: row.last_payment_date,
      })),
    });
  } catch (error) {
    log.error('Failed to get billing records:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get billing records' },
      { status: 500 }
    );
  }
}
