/**
 * GET /api/teacher/heatmap
 * Get mastery heatmap data for visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { createLogger } from '@/lib/logger';
import { getMasteryHeatmap } from '@/lib/services/teacher-analytics-service';
import { query } from '@/lib/db';

const logger = createLogger('MasteryHeatmap');

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'principal')) {
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

    const heatmap = await getMasteryHeatmap(session.user.id, school_id);

    return NextResponse.json(heatmap, { status: 200 });
  } catch (error) {
    logger.error('Failed to get heatmap', { error });
    return NextResponse.json({ error: 'Failed to get heatmap' }, { status: 500 });
  }
}
