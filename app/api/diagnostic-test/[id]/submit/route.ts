/**
 * POST /api/diagnostic-test/[id]/submit
 * Submit test answers and analyze results
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { createLogger } from '@/lib/logger';
import { analyzeDiagnosticTest, getDiagnosticTest } from '@/lib/services/diagnostic-test-service';

const logger = createLogger('SubmitDiagnosticTest');

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { answers } = await req.json(); // { questionId: answer, ... }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'answers object is required' },
        { status: 400 }
      );
    }

    // Get test and verify ownership
    const test = await getDiagnosticTest(id);

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    if (test.student_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to submit this test' },
        { status: 403 }
      );
    }

    // Analyze the test
    const result = await analyzeDiagnosticTest(id, answers);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error('Failed to submit diagnostic test', { error });
    return NextResponse.json(
      { error: 'Failed to submit test' },
      { status: 500 }
    );
  }
}
