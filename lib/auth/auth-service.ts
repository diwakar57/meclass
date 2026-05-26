import type { NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { extractTokenFromHeader, verifyToken as verifyJwtToken } from '@/lib/auth/jwt';
import { isDatabaseFailureMessage } from '@/lib/auth/database-failure';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('AuthService');

export interface AuthSessionUser {
  id: string;
  userId: string;
  email: string;
  role: string;
  schoolId?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

async function getTokenFromRequest(req?: NextRequest): Promise<string | null> {
  if (req) {
    const authHeader = req.headers.get('authorization');
    return (
      extractTokenFromHeader(authHeader) ||
      req.cookies.get('accessToken')?.value ||
      req.cookies.get('token')?.value ||
      null
    );
  }

  try {
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    const bearer = extractTokenFromHeader(authHeader);
    if (bearer) {
      return bearer;
    }
  } catch {
    // Request headers are not always available outside request context.
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get('accessToken')?.value || cookieStore.get('token')?.value || null;
  } catch {
    return null;
  }
}

function mapPayloadToUser(payload: {
  userId: string;
  email: string;
  role: string;
  schoolId?: string;
}): AuthSessionUser {
  return {
    id: payload.userId,
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    schoolId: payload.schoolId,
  };
}

export async function getAuthUser(req?: NextRequest): Promise<AuthSessionUser | null> {
  const token = await getTokenFromRequest(req);
  if (!token) {
    return null;
  }

  const decoded = await verifyJwtToken(token);
  if (!decoded) {
    return null;
  }

  try {
    const result = await query(
      `SELECT id, email, role, school_id, first_name, last_name, avatar_url
       FROM users
       WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.id,
      email: row.email,
      role: row.role,
      schoolId: row.school_id || undefined,
      firstName: row.first_name || undefined,
      lastName: row.last_name || undefined,
      avatarUrl: row.avatar_url || undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    if (isDevAuthFallbackEnabled() && isDatabaseFailureMessage(message)) {
      log.warn('Using JWT payload auth fallback because database is unavailable', {
        userId: decoded.userId,
        role: decoded.role,
      });
      return mapPayloadToUser(decoded);
    }

    throw error;
  }
}

export async function getSession(req?: NextRequest): Promise<AuthSessionUser | null> {
  return getAuthUser(req);
}
