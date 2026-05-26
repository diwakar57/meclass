import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';
import { isDatabaseFailureMessage } from '@/lib/auth/database-failure';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No token found' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyToken(accessToken);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user from database
    const userResult = await query(
      `SELECT id, email, first_name, last_name, role, school_id, avatar_url, created_at
       FROM users WHERE id = $1 AND is_active = true`,
      [payload.userId]
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        schoolId: user.school_id,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isDbDown = isDatabaseFailureMessage(message);

    if (isDbDown && isDevAuthFallbackEnabled()) {
      const accessToken = request.cookies.get('accessToken')?.value;
      if (accessToken) {
        const payload = await verifyToken(accessToken);
        if (payload) {
          return NextResponse.json({
            success: true,
            user: {
              id: payload.userId,
              email: payload.email,
              role: payload.role,
              schoolId: payload.schoolId,
              firstName: 'Dev',
              lastName: 'User',
            },
            warning: 'Using development auth fallback because database is unavailable.',
          });
        }
      }
    }

    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, error: isDbDown ? 'Database unavailable' : 'Invalid token' },
      { status: isDbDown ? 503 : 401 }
    );
  }
}
