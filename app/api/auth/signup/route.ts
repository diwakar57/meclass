// app/api/auth/signup/route.ts - New user registration
import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { generateToken, generateRefreshToken } from '@/lib/auth/jwt';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('SignupAPI');

interface SignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'principal' | 'accountant' | 'supervisor';
  schoolCode?: string;
}

function isDatabaseFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'econnrefused',
    'connect econnrefused',
    'database',
    'password authentication failed',
    'no pg_hba.conf',
    'sasl',
    'enotfound',
    'database_url',
    'getaddrinfo',
    'timeout expired',
    'invalid connection string',
    'connection terminated unexpectedly',
  ].some((needle) => normalized.includes(needle));
}

function getSchoolCodeFromId(id: string): string {
  return `SCH-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

async function resolveSchoolByCode(inputCode: string): Promise<{ id: string } | null> {
  const raw = inputCode.trim();
  const normalized = raw.toUpperCase();

  // If code looks like SCH-XXXXXXXX, match against school ID prefix.
  const match = normalized.match(/^SCH-([A-Z0-9]{8})$/);
  if (match) {
    const prefix = match[1].toLowerCase();
    const byPrefix = await query(
      `SELECT id
       FROM schools
       WHERE LOWER(REPLACE(CAST(id AS TEXT), '-', '')) LIKE $1
       LIMIT 1`,
      [`${prefix}%`]
    );
    if (byPrefix.rows.length > 0) {
      return { id: byPrefix.rows[0].id };
    }
  }

  // Backward-compatible lookup by school ID or domain.
  const schoolResult = await query(
    `SELECT id FROM schools
     WHERE CAST(id AS TEXT) = $1 OR LOWER(domain) = LOWER($1)
     LIMIT 1`,
    [raw]
  );

  if (schoolResult.rows.length === 0) {
    return null;
  }

  return { id: schoolResult.rows[0].id };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: SignupPayload = await req.json();
    const { email, password, firstName, lastName, role = 'student', schoolCode } = body;
    const normalizedEmail = email?.trim().toLowerCase();

    log.info('Signup request', { email: normalizedEmail, role });

    // Validation
    if (!normalizedEmail || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { message: 'Missing required fields: email, password, firstName, lastName, role' },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    let schoolId: string | null = null;

    // Check email uniqueness
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [normalizedEmail]
    );
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Handle role-specific school validation
    if (role === 'teacher' || role === 'principal' || role === 'accountant' || role === 'supervisor') {
      if (!schoolCode) {
        return NextResponse.json(
          { message: 'School code is required for school staff signup' },
          { status: 400 }
        );
      }

      const school = await resolveSchoolByCode(schoolCode);
      if (!school) {
        return NextResponse.json(
          { message: 'Invalid school code or domain' },
          { status: 400 }
        );
      }

      schoolId = school.id;
    }

    const passwordHash = await hashPassword(password);

    const userResult = await query(
      `INSERT INTO users
       (email, password_hash, first_name, last_name, role, school_id, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true, false)
       RETURNING id, email, first_name, last_name, role, school_id, avatar_url`,
      [normalizedEmail, passwordHash, firstName, lastName, role, schoolId]
    );

    const user = userResult.rows[0];

    log.info('User created', { userId: user.id, email: normalizedEmail, role });

    // Generate tokens
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.school_id || undefined,
    });
    const refreshToken = await generateRefreshToken(user.id, user.school_id || undefined);

    // Set httpOnly cookies
    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          schoolId: user.school_id,
          avatarUrl: user.avatar_url,
          schoolCode: user.school_id ? getSchoolCodeFromId(user.school_id) : null,
        },
        // token,
        // refreshToken,
        expiresIn: 24 * 60 * 60,
      },
      { status: 201 }
    );

    // // Set httpOnly cookies
    // response.cookies.set('accessToken', token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'lax',
    //   maxAge: 60 * 60 * 24,
    //   path: '/',
    // });

    // response.cookies.set('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'lax',
    //   maxAge: 60 * 60 * 24 * 7,
    //   path: '/',
    // });

    return response;
  } catch (error) {
    log.error('Signup error:', error);

    const message = error instanceof Error ? error.message : String(error);
    const isDbDown = isDatabaseFailure(message);

    if (isDbDown) {
      return NextResponse.json(
        {
          message:
            'Database unavailable. Please configure and start PostgreSQL, then retry signup.',
          devFallback: {
            enabled: isDevAuthFallbackEnabled(),
            note:
              isDevAuthFallbackEnabled()
                ? 'While DB is down, login can still use fallback dev accounts (for example: principal@school.com / password123).'
                : 'Development auth fallback is disabled.',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        message: 'Signup failed. Please try again later.',
        ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}),
      },
      { status: 500 }
    );
  }
}
