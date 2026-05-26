// lib/middleware/tenant.ts - Tenant isolation middleware

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('TenantMiddleware');

/**
 * Verify tenant_id matches authenticated user's school_id
 * Prevents cross-tenant data access
 */
export async function verifyTenantAccess(
  auth: AuthContext,
  tenantId: string
): Promise<boolean> {
  // SaaS admin can access any tenant
  if (auth.role === 'saas_admin') {
    return true;
  }

  // Regular users can only access their own school
  if (!auth.schoolId) {
    log.warn('No schoolId in auth context for non-admin user');
    return false;
  }

  // Verify tenant exists
  const result = await query(
    'SELECT id FROM schools WHERE id = $1',
    [tenantId]
  );

  if (!result.rows[0]) {
    log.warn('Tenant not found:', tenantId);
    return false;
  }

  // Verify user belongs to this school
  if (auth.schoolId !== tenantId) {
    log.warn('User attempting cross-tenant access:', {
      userId: auth.userId,
      userSchoolId: auth.schoolId,
      requestedSchoolId: tenantId,
    });
    return false;
  }

  return true;
}

/**
 * Higher-order function to enforce tenant isolation
 * Usage: export const GET = withTenant(async (req, auth, schoolId) => { ... })
 */
export function withTenant(
  handler: (
    req: NextRequest,
    auth: AuthContext,
    schoolId: string
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, { params }: { params: { schoolId: string } }) => {
    const schoolId = params.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
    }

    // Get auth context first (from auth.ts)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Import here to avoid circular dependency
    const { getAuthContext } = await import('./auth');
    const auth = await getAuthContext(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify tenant access
    const hasAccess = await verifyTenantAccess(auth, schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      return await handler(req, auth, schoolId);
    } catch (error) {
      log.error('Handler error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

/**
 * Build a database query that automatically filters by school_id
 * Usage: const filtered = addTenantFilter('users', auth);
 * Result: "users WHERE school_id = $1" with params [$1 = schoolId]
 */
export function getTenantFilter(auth: AuthContext): { clause: string; params: string[] } {
  if (auth.role === 'saas_admin') {
    return { clause: '', params: [] };
  }

  if (!auth.schoolId) {
    throw new Error('Non-admin user has no schoolId');
  }

  return {
    clause: 'AND school_id = $1',
    params: [auth.schoolId],
  };
}
