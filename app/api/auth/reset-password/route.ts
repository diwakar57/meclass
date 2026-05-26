import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createLogger } from '@/lib/logger';

const log = createLogger('ResetPasswordAPI');

const RESET_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

interface ResetPayload {
  token?: string;
  password?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => ({}))) as ResetPayload;
    const token = body.token?.trim();
    const password = body.password?.trim();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and new password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const verified = await jwtVerify(token, RESET_SECRET).catch(() => null);
    if (!verified?.payload) {
      return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 401 });
    }

    if (verified.payload.purpose !== 'password_reset' || !verified.payload.userId) {
      return NextResponse.json({ message: 'Invalid reset token payload' }, { status: 401 });
    }

    const userId = String(verified.payload.userId);
    const passwordHash = await hashPassword(password);

    const updateResult = await query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND is_active = true
       RETURNING id`,
      [passwordHash, userId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    log.info('Password reset successful', { userId });
    return NextResponse.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    log.error('Reset password error', error);
    return NextResponse.json({ message: 'Failed to reset password' }, { status: 500 });
  }
}
