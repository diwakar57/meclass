/**
 * GET /api/diagnostic-test/[id]
 * Get a specific diagnostic test
 *
 * GET /api/diagnostic-test
 * List diagnostic tests for the current student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { createLogger } from '@/lib/logger';
import {
  getDiagnosticTest,
  listStudentDiagnosticTests,
} from '@/lib/services/diagnostic-test-service';
import { query } from '@/lib/db';

const logger = createLogger('GetDiagnosticTest');

export async function GET(
  req: NextRequest,
  { params }: { params?: { id?: string } } = {}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's school
    const userResult = await query(`SELECT school_id FROM users WHERE id = $1`, [
      session.user.id,
    ]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { school_id } = userResult.rows[0];

    // If specific test ID provided
    if (params?.id) {
      const test = await getDiagnosticTest(params.id);

      if (!test) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 });
      }

      // Verify ownership or admin access
      if (
        test.student_id !== session.user.id &&
        session.user.role !== 'principal' &&
        session.user.role !== 'teacher' &&
        session.user.role !== 'saas_admin'
      ) {
        return NextResponse.json(
          { error: 'Not authorized to view this test' },
          { status: 403 }
        );
      }

      return NextResponse.json(test, { status: 200 });
    }

    // List all tests for this student
    const tests = await listStudentDiagnosticTests(session.user.id, school_id);

    return NextResponse.json(
      {
        tests,
        total: tests.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to get diagnostic test', { error });
    return NextResponse.json(
      { error: 'Failed to get test' },
      { status: 500 }
    );
  }
}
