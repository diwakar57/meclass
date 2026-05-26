// app/api/students/profile/route.ts - Get/update student profile

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';

interface StudentProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevelId?: string;
  interests: string[];
  learningStyle?: string;
  avatar?: string;
  twoFAEnabled: boolean;
}

interface StudentProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  gradeLevelId?: string;
  interests?: string[];
  learningStyle?: string;
}

let usersColumnCache: Set<string> | null = null;

async function getUsersColumns(): Promise<Set<string>> {
  if (usersColumnCache) {
    return usersColumnCache;
  }

  const columnResult = await query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'users'`,
  );

  usersColumnCache = new Set(
    (columnResult.rows || []).map((row) => String(row.column_name || '').toLowerCase()),
  );

  return usersColumnCache;
}

function toProfilePayload(row: Record<string, unknown>): StudentProfileResponse {
  return {
    id: String(row.user_id),
    firstName: String(row.first_name || ''),
    lastName: String(row.last_name || ''),
    email: String(row.email || ''),
    gradeLevelId: row.grade_level ? String(row.grade_level) : undefined,
    interests: Array.isArray(row.interests)
      ? row.interests.filter((item): item is string => typeof item === 'string')
      : [],
    learningStyle: row.learning_style ? String(row.learning_style) : undefined,
    avatar: row.avatar_url ? String(row.avatar_url) : undefined,
    twoFAEnabled: Boolean(row.twofa_enabled),
  };
}

async function fetchStudentProfile(userId: string): Promise<StudentProfileResponse | null> {
  const usersColumns = await getUsersColumns();
  const avatarSelect = usersColumns.has('avatar_url')
    ? 'u.avatar_url AS avatar_url'
    : usersColumns.has('avatar')
      ? 'u.avatar AS avatar_url'
      : 'NULL::text AS avatar_url';

  const twoFASelect = usersColumns.has('twofa_enabled')
    ? 'u.twofa_enabled AS twofa_enabled'
    : usersColumns.has('two_fa_enabled')
      ? 'u.two_fa_enabled AS twofa_enabled'
      : 'false AS twofa_enabled';

  const profileResult = await query(
    `SELECT u.id AS user_id, u.first_name, u.last_name, u.email, ${avatarSelect}, ${twoFASelect},
            sp.grade_level, sp.interests, sp.learning_style
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1 AND u.role = 'student' AND u.is_active = true
     LIMIT 1`,
    [userId],
  );

  if (!profileResult.rows[0]) return null;
  return toProfilePayload(profileResult.rows[0]);
}

export const GET = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  try {
    const profile = await fetchStudentProfile(auth.userId);

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Student profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
});

export const PUT = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const body = (await req.json()) as StudentProfileUpdatePayload;

    const normalizedFirstName =
      typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
    const normalizedLastName =
      typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
    const normalizedGradeLevel =
      typeof body.gradeLevelId === 'string' ? body.gradeLevelId.trim() : undefined;
    const normalizedLearningStyle =
      typeof body.learningStyle === 'string' ? body.learningStyle.trim() : undefined;
    const normalizedInterests = Array.isArray(body.interests)
      ? body.interests
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      : undefined;

    if (normalizedFirstName !== undefined && normalizedFirstName.length === 0) {
      return NextResponse.json({ success: false, error: 'First name cannot be empty' }, { status: 400 });
    }

    if (normalizedLastName !== undefined && normalizedLastName.length === 0) {
      return NextResponse.json({ success: false, error: 'Last name cannot be empty' }, { status: 400 });
    }

    const hasUserUpdates =
      normalizedFirstName !== undefined || normalizedLastName !== undefined;
    const hasStudentUpdates =
      normalizedGradeLevel !== undefined ||
      normalizedInterests !== undefined ||
      normalizedLearningStyle !== undefined;

    if (!hasUserUpdates && !hasStudentUpdates) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    if (hasUserUpdates) {
      await query(
        `UPDATE users
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             updated_at = now()
         WHERE id = $3`,
        [normalizedFirstName ?? null, normalizedLastName ?? null, auth.userId],
      );
    }

    if (hasStudentUpdates) {
      await query(
        `INSERT INTO student_profiles (user_id, school_id, grade_level, interests, learning_style)
         VALUES (
           $1,
           COALESCE($2, (SELECT school_id FROM users WHERE id = $1)),
           $3,
           COALESCE($4::text[], '{}'::text[]),
           $5
         )
         ON CONFLICT (user_id)
         DO UPDATE SET
           grade_level = COALESCE(EXCLUDED.grade_level, student_profiles.grade_level),
           interests = COALESCE($4::text[], student_profiles.interests),
           learning_style = COALESCE(EXCLUDED.learning_style, student_profiles.learning_style),
           updated_at = now()`,
        [
          auth.userId,
          auth.schoolId,
          normalizedGradeLevel ?? null,
          normalizedInterests ?? null,
          normalizedLearningStyle ?? null,
        ],
      );
    }

    const updatedProfile = await fetchStudentProfile(auth.userId);
    if (!updatedProfile) {
      return NextResponse.json({ success: false, error: 'Student profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
});
