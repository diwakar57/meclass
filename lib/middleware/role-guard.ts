import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { UserRole } from '@/lib/types/models';

const log = createLogger('RoleGuard');

export interface RequestAuthContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
  email: string;
}

function normalizeRole(role: UserRole): UserRole {
  if (role === 'school_admin') {
    return 'principal';
  }
  return role;
}

export async function getRequestAuthContext(req: NextRequest): Promise<RequestAuthContext | null> {
  const bearerToken = extractTokenFromHeader(req.headers.get('authorization'));
  const cookieToken = req.cookies.get('accessToken')?.value;
  const token = bearerToken || cookieToken;

  if (!token) {
    return null;
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    return null;
  }

  const userResult = await query(
    `SELECT id, email, role, school_id
     FROM users
     WHERE id = $1 AND is_active = true`,
    [decoded.userId]
  );

  if (userResult.rowCount === 0) {
    return null;
  }

  const row = userResult.rows[0];

  return {
    userId: row.id,
    role: row.role,
    schoolId: row.school_id || undefined,
    email: row.email,
  };
}

export async function requireRoles(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ auth?: RequestAuthContext; error?: NextResponse }> {
  const auth = await getRequestAuthContext(req);

  if (!auth) {
    return {
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const role = normalizeRole(auth.role);
  if (!allowedRoles.includes(role)) {
    return {
      error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { auth: { ...auth, role } };
}

/**
 * Backward-compatible alias used by existing API routes.
 * Mirrors the shape `{ auth, error }` expected by callers.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ auth?: RequestAuthContext; error?: NextResponse }> {
  return requireRoles(req, allowedRoles);
}

export function resolveTenantSchoolId(auth: RequestAuthContext, requestedSchoolId?: string): string | null {
  if (auth.role === 'saas_admin') {
    return requestedSchoolId || null;
  }

  if (!auth.schoolId) {
    log.warn('Authenticated non-admin user has no school_id', { userId: auth.userId });
    return null;
  }

  if (requestedSchoolId && requestedSchoolId !== auth.schoolId) {
    log.warn('Cross-tenant school access blocked', {
      userId: auth.userId,
      userSchoolId: auth.schoolId,
      requestedSchoolId,
    });
    return null;
  }

  return auth.schoolId;
}
