// app/api/auth/refresh/route.ts - Token refresh endpoint

import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateRefreshToken, generateToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';
import { SaaSBillingService } from '@/lib/services/saas-billing';

const log = createLogger('RefreshAPI');

interface RefreshRequest {
  refreshToken: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let refreshToken = req.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      const body = (await req.json().catch(() => ({}))) as Partial<RefreshRequest>;
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Get latest user info
    const result = await query(
      'SELECT id, email, role, school_id FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const schoolAccess = await SaaSBillingService.canUserLogin(user.role, user.school_id);
    if (!schoolAccess.allowed) {
      const blocked = NextResponse.json(
        { error: schoolAccess.reason || 'School access is restricted' },
        { status: 403 }
      );
      blocked.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
      blocked.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });
      return blocked;
    }

    // Rotate tokens
    const token = await generateToken({
      userId: user.id,
      schoolId: user.school_id,
      role: user.role,
      email: user.email,
    });
    const nextRefreshToken = await generateRefreshToken(user.id, user.school_id || undefined);

    const response = NextResponse.json({
      token,
      refreshToken: nextRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.school_id,
      },
      expiresIn: 24 * 60 * 60,
    });

    response.cookies.set('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    response.cookies.set('refreshToken', nextRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    log.error('Refresh error:', error);

    const message = error instanceof Error ? error.message : String(error);
    const isDbDown = message.includes('ECONNREFUSED') || message.includes('connect ECONNREFUSED');

    if (isDbDown && isDevAuthFallbackEnabled()) {
      const accessToken = req.cookies.get('accessToken')?.value;
      if (accessToken) {
        const { verifyToken } = await import('@/lib/auth/jwt');
        const current = await verifyToken(accessToken);

        if (current) {
          const token = await generateToken({
            userId: current.userId,
            schoolId: current.schoolId,
            role: current.role,
            email: current.email,
          });
          const nextRefreshToken = await generateRefreshToken(current.userId, current.schoolId);

          const response = NextResponse.json({
            token,
            refreshToken: nextRefreshToken,
            user: {
              id: current.userId,
              email: current.email,
              role: current.role,
              schoolId: current.schoolId,
            },
            expiresIn: 24 * 60 * 60,
            warning: 'Using development auth fallback because database is unavailable.',
          });

          response.cookies.set('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
          });

          response.cookies.set('refreshToken', nextRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
          });

          return response;
        }
      }
    }

    return NextResponse.json(
      {
        error: isDbDown
          ? 'Database unavailable. Please configure and start PostgreSQL, then retry refresh.'
          : 'Internal server error',
      },
      { status: isDbDown ? 503 : 500 }
    );
  }
}
