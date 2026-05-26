import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth/auth-service';
import type { UserRole } from '@/lib/types/auth';
export { getAuthUser, getSession } from '@/lib/auth/auth-service';

export interface LegacyAuthPayload {
  uid?: string;
  role?: UserRole;
  schoolId?: string;
  email?: string;
}

/**
 * Compatibility helper for legacy routes that still import `@/lib/auth`.
 * New routes should prefer `getAuthUser` from `@/lib/auth/auth-service`.
 */
export async function verifyToken(req: NextRequest): Promise<LegacyAuthPayload> {
  const user = await getAuthUser(req);
  if (!user) {
    return {};
  }

  return {
    uid: user.id,
    role: user.role,
    schoolId: user.schoolId,
    email: user.email,
  };
}
