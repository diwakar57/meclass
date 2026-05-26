// lib/middleware/auth.ts - Authentication middleware for API routes

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';
import type { AuthContext } from '@/lib/types/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('AuthMiddleware');

function isDatabaseFailure(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  return (
    message.includes('econnrefused') ||
    message.includes('database_url') ||
    message.includes('connect') ||
    message.includes('postgres') ||
    message.includes('127.0.0.1:5432')
  );
}

/**
 * Extract auth context from request (validates JWT, checks user exists)
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.get('authorization');
  const token =
    extractTokenFromHeader(authHeader) ||
    req.cookies.get('accessToken')?.value ||
    req.cookies.get('token')?.value;

  if (!token) {
    return null;
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    return null;
  }

  try {
    // Verify user still exists in database
    const result = await query(
      'SELECT id, email, role, school_id FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (!result.rows[0]) {
      log.warn('User not found or inactive:', decoded.userId);
      return null;
    }

    return {
      userId: decoded.userId,
      schoolId: decoded.schoolId,
      role: decoded.role,
      email: decoded.email,
    };
  } catch (error) {
    if (isDevAuthFallbackEnabled() && isDatabaseFailure(error)) {
      log.warn('Using JWT-only auth context because DB is unavailable in dev mode', {
        userId: decoded.userId,
        role: decoded.role,
      });
      return {
        userId: decoded.userId,
        schoolId: decoded.schoolId,
        role: decoded.role,
        email: decoded.email,
      };
    }
    throw error;
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return auth;
}

/**
 * Backward-compatible auth verifier used by legacy routes.
 */
export async function verifyAuth(req: NextRequest) {
  return getAuthContext(req);
}

/**
 * Require specific role(s)
 */
export async function requireRole(req: NextRequest, allowedRoles: string[]) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return auth;
}

/**
 * Higher-order function for protected endpoints
 * Usage: export const POST = withAuth(async (req, auth) => { ... })
 */
export function withAuth(
  handler: (req: NextRequest, auth: AuthContext, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      return await handler(req, auth, context);
    } catch (error) {
      log.error('Handler error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

/**
 * Higher-order function for role-protected endpoints
 * Usage: export const POST = withRole(['teacher', 'principal'], async (req, auth) => { ... })
 */
export function withRole(
  allowedRoles: string[],
  handler: (req: NextRequest, auth: AuthContext, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    const auth = await getAuthContext(req);
    if (!auth || !allowedRoles.includes(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
      return await handler(req, auth, context);
    } catch (error) {
      log.error('Handler error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
