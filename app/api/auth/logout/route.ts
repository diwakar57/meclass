// app/api/auth/logout/route.ts - User logout endpoint

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { appendAuditLog } from '@/lib/services/audit-service';
import type { AuthContext } from '@/lib/types/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('LogoutAPI');

export const POST = withAuth(async (req: NextRequest, auth: AuthContext) => {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  if (auth.schoolId) {
    try {
      await appendAuditLog({
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'logout',
        resourceType: 'user',
        resourceId: auth.userId,
      });
    } catch (auditError) {
      log.warn('Audit log write failed during logout', {
        userId: auth.userId,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }
  }

  return response;
});
