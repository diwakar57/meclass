import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('2FA Verify API');

interface Verify2FAPayload {
  code: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: Verify2FAPayload = await req.json();
    const { code } = body;

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Verification code required' },
        { status: 400 }
      );
    }

    // Get user with pending 2FA
    const userResult = await query(
      'SELECT id, twofa_secret, twofa_method, twofa_pending FROM users WHERE id = $1',
      [auth.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (!user.twofa_pending) {
      return NextResponse.json(
        { error: 'No pending 2FA setup' },
        { status: 400 }
      );
    }

    // Verify code (simple comparison for now)
    // In production, use proper TOTP verification
    if (code !== user.twofa_secret) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Enable 2FA
    await query(
      `UPDATE users SET 
        twofa_enabled = true, 
        twofa_pending = false,
        updated_at = now()
       WHERE id = $1`,
      [auth.userId]
    );

    log.info('2FA enabled', { userId: auth.userId, method: user.twofa_method });

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      twoFAEnabled: true,
    });
  } catch (error) {
    log.error('2FA verification error', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
