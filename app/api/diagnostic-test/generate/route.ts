/**
 * POST /api/diagnostic-test/generate
 * Generate a personalized diagnostic test for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { createLogger } from '@/lib/logger';
import { generateDiagnosticTest } from '@/lib/services/diagnostic-test-service';
import { query } from '@/lib/db';

const logger = createLogger('GenerateDiagnosticTest');

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { curriculumId } = await req.json();

    if (!curriculumId) {
      return NextResponse.json(
        { error: 'curriculumId is required' },
        { status: 400 }
      );
    }

    // Get user's school and grade level
    const userResult = await query(
      `SELECT school_id FROM users WHERE id = $1`,
      [session.user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { school_id } = userResult.rows[0];

    // Get student's grade level
    const profileResult = await query(
      `SELECT grade_level FROM student_profiles WHERE user_id = $1`,
      [session.user.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    const { grade_level } = profileResult.rows[0];

    // Generate the test
    const test = await generateDiagnosticTest(
      session.user.id,
      school_id,
      curriculumId,
      grade_level
    );

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    logger.error('Failed to generate diagnostic test', { error });
    return NextResponse.json(
      { error: 'Failed to generate test' },
      { status: 500 }
    );
  }
}
