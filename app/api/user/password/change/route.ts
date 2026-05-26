import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChangePasswordAPI');

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFAToken?: string; // Optional 2FA verification token
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ChangePasswordPayload = await req.json();
    const { currentPassword, newPassword, confirmPassword, twoFAToken } = body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All password fields are required' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Get user and verify current password
    const userResult = await query(
      'SELECT id, password_hash, twofa_enabled FROM users WHERE id = $1',
      [auth.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // If 2FA is enabled, verify token
    if (user.twofa_enabled && !twoFAToken) {
      return NextResponse.json(
        { error: 'Two-factor authentication required', code: 'REQUIRE_2FA' },
        { status: 403 }
      );
    }

    if (user.twofa_enabled && twoFAToken) {
      // Verify 2FA token (implementation depends on your 2FA provider)
      const is2FAValid = await verify2FAToken(auth.userId, twoFAToken);
      if (!is2FAValid) {
        return NextResponse.json(
          { error: 'Invalid two-factor authentication code' },
          { status: 401 }
        );
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [newPasswordHash, auth.userId]
    );

    log.info('Password changed', { userId: auth.userId });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    log.error('Change password error', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}

// Helper function to verify 2FA token
async function verify2FAToken(userId: string, token: string): Promise<boolean> {
  try {
    // This is a placeholder - implement based on your 2FA provider
    // Examples: TOTP verification, SMS verification, etc.
    const result = await query(
      `SELECT id FROM users 
       WHERE id = $1 AND twofa_secret = $2 AND twofa_enabled = true`,
      [userId, token]
    );
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}
