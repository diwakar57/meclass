import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('UpdateProfileAPI');

interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateProfilePayload = await req.json();
    const { firstName, lastName, avatarUrl } = body;

    // Validate inputs
    if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0)) {
      return NextResponse.json({ error: 'Invalid firstName' }, { status: 400 });
    }

    if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0)) {
      return NextResponse.json({ error: 'Invalid lastName' }, { status: 400 });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName.trim());
    }

    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName.trim());
    }

    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Add user ID and updated_at
    updates.push(`updated_at = now()`);
    values.push(auth.userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, first_name, last_name, avatar_url, email, role`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result.rows[0];

    log.info('Profile updated', { userId: auth.userId });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    log.error('Profile update error', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
