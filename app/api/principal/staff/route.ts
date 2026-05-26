import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createLogger } from '@/lib/logger';
import { appendAuditLog } from '@/lib/services/audit-service';
import { nanoid } from 'nanoid';

const log = createLogger('PrincipalStaffAPI');

type StaffRole = 'teacher' | 'accountant' | 'supervisor' | 'principal' | 'school_admin';

interface CreateStaffPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: StaffRole;
}

function normalizeRole(role: string): StaffRole | null {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'teacher' || normalized === 'accountant' || normalized === 'supervisor' || normalized === 'principal' || normalized === 'school_admin') {
    return normalized;
  }
  return null;
}

async function getRequester(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const requester = await getRequester(request);
    if (!requester || !['principal', 'school_admin', 'saas_admin'].includes(requester.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const schoolId = requester.schoolId;
    if (!schoolId && requester.role !== 'saas_admin') {
      return NextResponse.json({ success: false, error: 'No school context' }, { status: 400 });
    }

    const targetSchoolId = request.nextUrl.searchParams.get('schoolId') || schoolId;
    if (!targetSchoolId) {
      return NextResponse.json({ success: false, error: 'schoolId is required' }, { status: 400 });
    }

    const result = await query(
      `SELECT id, first_name, last_name, email, role, is_active, created_at
       FROM users
       WHERE school_id = $1 AND role IN ('teacher', 'accountant', 'supervisor', 'principal', 'school_admin')
       ORDER BY created_at DESC`,
      [targetSchoolId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    log.error('Failed to list staff', error);
    return NextResponse.json({ success: false, error: 'Failed to list staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requester = await getRequester(request);
    if (!requester || !['principal', 'school_admin', 'saas_admin'].includes(requester.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Partial<CreateStaffPayload>;
    const role = body.role ? normalizeRole(body.role) : null;

    if (!body.firstName?.trim() || !body.lastName?.trim() || !body.email?.trim() || !role) {
      return NextResponse.json({ success: false, error: 'firstName, lastName, email, role are required' }, { status: 400 });
    }

    const schoolId = requester.schoolId;
    if (!schoolId && requester.role !== 'saas_admin') {
      return NextResponse.json({ success: false, error: 'No school context' }, { status: 400 });
    }

    const targetSchoolId = (requester.role === 'saas_admin'
      ? (request.nextUrl.searchParams.get('schoolId') || schoolId)
      : schoolId) || null;

    if (!targetSchoolId) {
      return NextResponse.json({ success: false, error: 'schoolId is required' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
    }

    const temporaryPassword = body.password?.trim() || `Temp-${Math.random().toString(36).slice(2, 10)}!`;
    const passwordHash = await hashPassword(temporaryPassword);

    const insert = await query(
      `INSERT INTO users
       (id, school_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, false)
       RETURNING id, email, role, first_name, last_name, school_id, created_at`,
      [nanoid(), targetSchoolId, email, passwordHash, role, body.firstName.trim(), body.lastName.trim()]
    );

    const user = insert.rows[0];

    await appendAuditLog({
      schoolId: targetSchoolId,
      userId: requester.userId,
      action: 'staff_create',
      resourceType: 'user',
      resourceId: String(user.id),
      changes: { createdUserId: user.id, role: user.role },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        schoolId: user.school_id,
        createdAt: user.created_at,
        temporaryPassword: body.password ? undefined : temporaryPassword,
      },
      message: 'Staff account created successfully',
    });
  } catch (error) {
    log.error('Failed to create staff account', error);
    return NextResponse.json({ success: false, error: 'Failed to create staff account' }, { status: 500 });
  }
}
