import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

async function ensureAccess(request: NextRequest): Promise<NextResponse | null> {
  const result = await requireRole(request, ['principal', 'accountant']);
  if (result instanceof NextResponse) {
    return result;
  }
  return null;
}

function normalizeGrades(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry));
      }
      return [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleError = await ensureAccess(request);
    if (roleError) return roleError;

    const result = await db.query(
      `SELECT id, name, description, amount, frequency, applicable_grades
       FROM fee_structures
       WHERE school_id = $1
       ORDER BY name`,
      [authContext.schoolId]
    );

    const feeStructures = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      amount: Number(row.amount || 0),
      frequency: row.frequency,
      applicableGrades: normalizeGrades(row.applicable_grades),
    }));

    return NextResponse.json({ feeStructures });
  } catch (error) {
    logger.error('Failed to fetch fee structures', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleResult = await requireRole(request, ['principal']);
    if (roleResult instanceof NextResponse) {
      return roleResult;
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const description = String(body?.description || '').trim() || null;
    const amount = Number(body?.amount || 0);
    const frequency = String(body?.frequency || '').trim() || null;
    const applicableGrades = Array.isArray(body?.applicableGrades)
      ? body.applicableGrades.map((entry: unknown) => String(entry))
      : [];

    if (!name || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'name and amount are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO fee_structures
       (school_id, name, description, amount, frequency, applicable_grades, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        authContext.schoolId,
        name,
        description,
        amount,
        frequency,
        JSON.stringify(applicableGrades),
        authContext.userId,
      ]
    );

    return NextResponse.json({
      id: result.rows[0].id,
      message: 'Fee structure created successfully',
    });
  } catch (error) {
    logger.error('Failed to create fee structure', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
