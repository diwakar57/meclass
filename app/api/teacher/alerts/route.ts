/**
 * GET /api/teacher/alerts
 * Get intervention alerts for at-risk students
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createLogger } from '@/lib/logger';
import { getInterventionAlerts } from '@/lib/services/teacher-analytics-service';
import type { AuthContext } from '@/lib/types/auth';

const logger = createLogger('TeacherAlerts');

export const GET = withRole(['teacher', 'principal', 'school_admin'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Missing tenant scope' }, { status: 401 });
    }

    // Get severity filter from query params
    const severity = (req.nextUrl.searchParams.get('severity') || '').toLowerCase();
    const validSeverities = ['high', 'medium', 'low'];

    const alerts = await getInterventionAlerts(auth.userId, auth.schoolId);

    // Filter by severity if specified
    const filtered =
      severity && validSeverities.includes(severity)
        ? alerts.filter((a) => a.severity === severity)
        : alerts;

    // Count by severity
    const summary = {
      total: filtered.length,
      high: filtered.filter((a) => a.severity === 'high').length,
      medium: filtered.filter((a) => a.severity === 'medium').length,
      low: filtered.filter((a) => a.severity === 'low').length,
    };

    return NextResponse.json(
      {
        alerts: filtered,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to get alerts', { error });
    return NextResponse.json({ error: 'Failed to get alerts' }, { status: 500 });
  }
});
