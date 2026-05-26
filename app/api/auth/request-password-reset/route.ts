import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { sendTransactionalEmail } from '@/lib/utils/email';

const log = createLogger('RequestPasswordResetAPI');

const RESET_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const userResult = await query(
      `SELECT id, email, role, school_id
       FROM users
       WHERE LOWER(email) = LOWER($1) AND is_active = true
       LIMIT 1`,
      [email]
    );

    // Always return generic success to prevent account enumeration.
    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If this email exists, a reset link has been generated.',
      });
    }

    const user = userResult.rows[0];
    const token = await new SignJWT({
      purpose: 'password_reset',
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.school_id || undefined,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(RESET_SECRET);

    const origin = req.nextUrl.origin;
    const resetUrl = `${origin}/auth/reset-password?token=${encodeURIComponent(token)}`;

    await sendTransactionalEmail({
      to: user.email,
      subject: 'Reset your LearnAI password',
      text: `A password reset was requested for your account.\n\nUse this link to set a new password (expires in 30 minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.\n\nDesigned and operated by LearnAI.study`,
      html: `<p>A password reset was requested for your account.</p><p><a href="${resetUrl}">Reset your password</a> (expires in 30 minutes)</p><p>If you did not request this, you can ignore this email.</p><p>Designed and operated by LearnAI.study</p>`,
    });

    log.info('Password reset link generated', { userId: user.id, email: user.email });

    return NextResponse.json({
      success: true,
      message: 'If this email exists, a reset link has been generated.',
      ...(process.env.NODE_ENV !== 'production' ? { resetUrl } : {}),
    });
  } catch (error) {
    log.error('Request password reset error', error);
    return NextResponse.json({ message: 'Failed to process request' }, { status: 500 });
  }
}
