import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import * as crypto from 'crypto';

const log = createLogger('2FA Setup API');

interface Setup2FAPayload {
  method: 'totp' | 'sms' | 'email';
  phoneNumber?: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: Setup2FAPayload = await req.json();
    const { method, phoneNumber } = body;

    if (!method || !['totp', 'sms', 'email'].includes(method)) {
      return NextResponse.json({ error: 'Invalid 2FA method' }, { status: 400 });
    }

    if (method === 'sms' && !phoneNumber) {
      return NextResponse.json({ error: 'Phone number required for SMS' }, { status: 400 });
    }

    // Get user
    const userResult = await query(
      'SELECT id, email FROM users WHERE id = $1',
      [auth.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Generate secret based on method
    let secret: string;
    let qrCode: string | null = null;

    if (method === 'totp') {
      // Generate random base32 secret for TOTP
      secret = crypto.randomBytes(32).toString('base64');
      
      // You would normally generate a QR code here using a library like qrcode
      // For now we'll return the secret for manual entry
      qrCode = `otpauth://totp/LearnAI:${user.email}?secret=${secret}&issuer=LearnAI`;
    } else if (method === 'sms') {
      secret = crypto.randomInt(100000, 999999).toString();
      // In production, send SMS with code
      log.info('2FA SMS would be sent', { phoneNumber });
    } else {
      secret = crypto.randomInt(100000, 999999).toString();
      // In production, send email with code
      log.info('2FA email would be sent', { email: user.email });
    }

    // Store pending 2FA setup (not yet verified)
    await query(
      `UPDATE users SET 
        twofa_method = $1, 
        twofa_secret = $2, 
        twofa_pending = true,
        updated_at = now()
       WHERE id = $3`,
      [method, secret, auth.userId]
    );

    log.info('2FA setup initiated', { userId: auth.userId, method });

    const response: any = {
      success: true,
      method,
      message: '2FA setup initiated. Verify your code to complete setup.',
    };

    if (method === 'totp') {
      response.qrCode = qrCode;
      response.secret = secret;
    }

    return NextResponse.json(response);
  } catch (error) {
    log.error('2FA setup error', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}
