// app/api/auth/login/route.ts - User login endpoint

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken, generateRefreshToken } from '@/lib/auth/jwt';
import { getDevFallbackUser, isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';
import { isDatabaseFailureMessage } from '@/lib/auth/database-failure';
import { SaaSBillingService } from '@/lib/services/saas-billing';
import { appendAuditLog } from '@/lib/services/audit-service';
import type { LoginRequest, LoginResponse } from '@/lib/types/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('LoginAPI');

interface LoginPayload {
  email: string;
  password: string;
  schoolId?: string; // Optional, required for school users
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let parsedBody: Partial<LoginPayload> = {};

  try {
    parsedBody = (await req.json()) as LoginPayload;
    const email = parsedBody.email?.trim().toLowerCase();
    const password = parsedBody.password;
    const schoolId = parsedBody.schoolId?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query user by email
    let userQuery = 'SELECT id, email, password_hash, role, school_id, first_name, last_name, avatar_url FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true';
    const params: any[] = [email];

    // If schoolId provided, scope to that school
    if (schoolId) {
      userQuery += ' AND school_id = $2';
      params.push(schoolId);
    }

    const result = await query(userQuery, params);

    if (!result.rows[0]) {
      log.warn('Login attempt failed: user not found', { email, schoolId });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatches = await verifyPassword(password, user.password_hash);
    if (!passwordMatches) {
      log.warn('Login attempt failed: password mismatch', { email });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Enforce school payment-gated access for non-SaaS admin users.
    // If billing data/tables are unavailable, don't block auth entirely.
    let schoolAccess: { allowed: boolean; reason?: string } = { allowed: true };
    try {
      schoolAccess = await SaaSBillingService.canUserLogin(user.role, user.school_id);
    } catch (billingError) {
      const billingMessage =
        billingError instanceof Error ? billingError.message : String(billingError || '');

      if (process.env.NODE_ENV === 'production' || !isDatabaseFailureMessage(billingMessage)) {
        throw billingError;
      }

      log.warn('School billing check failed due to DB issue in non-production; allowing login', {
        email,
        schoolId: user.school_id,
        error: billingMessage,
      });
    }

    if (!schoolAccess.allowed) {
      log.warn('Login blocked by school payment status', {
        email,
        schoolId: user.school_id,
        role: user.role,
        reason: schoolAccess.reason,
      });
      return NextResponse.json(
        { error: schoolAccess.reason || 'School access is restricted' },
        { status: 403 }
      );
    }

    // Generate tokens
    const token = await generateToken({
      userId: user.id,
      schoolId: user.school_id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = await generateRefreshToken(user.id, user.school_id);

    // Update last_login_at
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Log audit (non-blocking; auth should not fail due to audit persistence issues)
    try {
      if (user.school_id) {
        await appendAuditLog({
          schoolId: String(user.school_id),
          userId: String(user.id),
          action: 'login',
          resourceType: 'user',
          resourceId: String(user.id),
        });
      }
    } catch (auditError) {
      log.warn('Audit log write failed during login', {
        userId: user.id,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }

    const response: LoginResponse = {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.school_id,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
      },
      expiresIn: 24 * 60 * 60, // 24 hours
    };

    const nextResponse = NextResponse.json(response);

    nextResponse.cookies.set('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    nextResponse.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return nextResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Login error:', error);

    // Surface DB connectivity issues clearly instead of opaque 500.
    if (isDatabaseFailureMessage(message)) {
      // Non-production fallback for local UI development without a running PostgreSQL instance.
      const fallbackUser = parsedBody.email && parsedBody.password
        ? getDevFallbackUser(parsedBody.email, parsedBody.password)
        : null;

      if (fallbackUser) {
        const token = await generateToken({
          userId: fallbackUser.id,
          schoolId: fallbackUser.schoolId,
          role: fallbackUser.role,
          email: fallbackUser.email,
        });
        const refreshToken = await generateRefreshToken(fallbackUser.id, fallbackUser.schoolId);

        const nextResponse = NextResponse.json({
          token,
          refreshToken,
          user: fallbackUser,
          expiresIn: 24 * 60 * 60,
          warning: 'Using development auth fallback because database is unavailable.',
        });

        nextResponse.cookies.set('accessToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        });

        nextResponse.cookies.set('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });

        return nextResponse;
      }

      const devFallbackHint = isDevAuthFallbackEnabled()
        ? {
            devFallback: {
              enabled: true,
              message:
                'Use one of the built-in development users while PostgreSQL is unavailable.',
              examplePrincipal: {
                email: 'principal@school.com',
                password: 'password123',
              },
            },
          }
        : {
            devFallback: {
              enabled: false,
              message: 'Set ENABLE_DEV_AUTH_FALLBACK=true to allow local fallback logins.',
            },
          };

      return NextResponse.json(
        {
          error: 'Database unavailable. Please configure and start PostgreSQL, then retry login.',
          ...devFallbackHint,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}),
      },
      { status: 500 }
    );
  }
}
