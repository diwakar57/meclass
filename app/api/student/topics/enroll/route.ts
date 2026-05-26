import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import type { AuthContext } from '@/lib/types/auth';

export const POST = withRole(['student'], async (req: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const topicId = typeof body?.topicId === 'string' ? body.topicId : '';

  if (!topicId) {
    return NextResponse.json({ success: false, error: 'topicId is required' }, { status: 400 });
  }

  const topicResult = await query(
    `SELECT id
     FROM topics
     WHERE id = $1 AND school_id = $2
     LIMIT 1`,
    [topicId, auth.schoolId]
  );

  if ((topicResult.rowCount || 0) === 0) {
    return NextResponse.json({ success: false, error: 'Topic not found' }, { status: 404 });
  }

  await query(
    `INSERT INTO topic_mastery
      (id, student_id, topic_id, school_id, mastery_score, confidence_level, attempts, correct_attempts, last_attempted_at, updated_at)
     VALUES
      ($1, $2, $3, $4, 0, 0, 0, 0, NULL, CURRENT_TIMESTAMP)
     ON CONFLICT (student_id, topic_id)
     DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
    [randomUUID(), auth.userId, topicId, auth.schoolId]
  );

  return NextResponse.json({
    success: true,
    data: {
      topicId,
      enrolled: true,
    },
  });
});
