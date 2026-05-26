import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createLogger } from '@/lib/logger';

const log = createLogger('2FA Disable API');

interface Disable2FAPayload {
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: Disable2FAPayload = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password required to disable 2FA' },
        { status: 400 }
      );
    }

    // Get user
    const userResult = await query(
      'SELECT id, password_hash, twofa_enabled FROM users WHERE id = $1',
      [auth.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (!user.twofa_enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Disable 2FA
    await query(
      `UPDATE users SET 
        twofa_enabled = false, 
        twofa_method = null,
        twofa_secret = null,
        twofa_pending = false,
        updated_at = now()
       WHERE id = $1`,
      [auth.userId]
    );

    log.info('2FA disabled', { userId: auth.userId });

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
      twoFAEnabled: false,
    });
  } catch (error) {
    log.error('2FA disable error', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
