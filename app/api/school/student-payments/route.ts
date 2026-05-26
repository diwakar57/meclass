import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { appendAuditLog } from '@/lib/services/audit-service';
import { logger } from '@/lib/logger';

async function requirePrincipalOrAccountant(request: NextRequest) {
  const roleResult = await requireRole(request, ['principal', 'accountant']);
  if (roleResult instanceof NextResponse) {
    return { error: roleResult };
  }
  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleGate = await requirePrincipalOrAccountant(request);
    if ('error' in roleGate) {
      return roleGate.error;
    }

    const result = await db.query(
      `SELECT
         sp.id,
         sp.student_id,
         sp.fee_id,
         sp.amount,
         sp.due_date,
         sp.status,
         sp.paid_date,
         sp.receipt_id,
         u.first_name,
         u.last_name,
         COALESCE(stp.grade_level, sp.grade, 'N/A') AS grade,
         f.name AS fee_type
       FROM student_payments sp
       INNER JOIN users u ON sp.student_id = u.id
       LEFT JOIN student_profiles stp ON stp.user_id = u.id
       LEFT JOIN fee_structures f ON sp.fee_id = f.id
       WHERE sp.school_id = $1
         AND u.role = 'student'
       ORDER BY sp.due_date DESC NULLS LAST, sp.created_at DESC`,
      [authContext.schoolId]
    );

    const payments = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Student',
      grade: row.grade,
      feeType: row.fee_type || 'General Fee',
      amount: Number(row.amount || 0),
      dueDate: row.due_date,
      status: row.status,
      paidDate: row.paid_date,
      receiptId: row.receipt_id,
    }));

    return NextResponse.json({ payments });
  } catch (error) {
    logger.error('Failed to fetch student payments', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleGate = await requirePrincipalOrAccountant(request);
    if ('error' in roleGate) {
      return roleGate.error;
    }

    const body = await request.json();
    const { studentId, feeId, amount, paymentMethod } = body;

    if (!studentId || !feeId || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'studentId, feeId, and amount are required' },
        { status: 400 }
      );
    }

    const student = await db.query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND school_id = $2
         AND role = 'student'`,
      [studentId, authContext.schoolId]
    );

    if (student.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const receiptId = `RCP-${Date.now()}`;

    const result = await db.query(
      `INSERT INTO student_payments
       (school_id, student_id, fee_id, amount, status, paid_date, payment_method, receipt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, receipt_id`,
      [
        authContext.schoolId,
        studentId,
        feeId,
        amount,
        'paid',
        new Date(),
        paymentMethod || 'manual',
        receiptId,
      ]
    );

    const paymentId = result.rows[0].id;

    await appendAuditLog({
      schoolId: authContext.schoolId,
      userId: authContext.userId,
      action: 'student_payment_recorded',
      resourceType: 'student_payment',
      resourceId: String(paymentId),
      changes: { studentId, feeId, amount, paymentMethod: paymentMethod || 'manual' },
    });

    logger.info('Student payment recorded', { paymentId, studentId, amount });

    return NextResponse.json({
      paymentId,
      receiptId: result.rows[0].receipt_id,
    });
  } catch (error) {
    logger.error('Failed to record student payment', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
