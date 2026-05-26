/**
 * District Analytics API — /api/district/analytics
 *
 * GET ?view=overview|schools|dropout|teachers|trend
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { DistrictAnalyticsService } from '@/lib/services/district-analytics-service';
import type { AuthContext } from '@/lib/types/auth';

export const GET = withRole(
  ['saas_admin', 'admin'],
  async (req: NextRequest, auth: AuthContext) => {
    try {
      const url = new URL(req.url);
      const view = url.searchParams.get('view') ?? 'overview';
      const districtId =
        url.searchParams.get('districtId') ?? auth.schoolId ?? '';

      if (!districtId) {
        return NextResponse.json(
          { error: 'districtId is required' },
          { status: 400 },
        );
      }

      switch (view) {
        case 'overview': {
          const overview = await DistrictAnalyticsService.getDistrictOverview(districtId);
          return NextResponse.json({ success: true, overview });
        }

        case 'schools': {
          const schools = await DistrictAnalyticsService.getSchoolSummaries(districtId);
          return NextResponse.json({ success: true, schools });
        }

        case 'dropout': {
          const threshold = parseInt(url.searchParams.get('threshold') ?? '50', 10);
          const students = await DistrictAnalyticsService.getDropoutRiskStudents(
            districtId,
            threshold,
          );
          return NextResponse.json({ success: true, students });
        }

        case 'teachers': {
          const teachers =
            await DistrictAnalyticsService.getTeacherEfficiencyMetrics(districtId);
          return NextResponse.json({ success: true, teachers });
        }

        case 'trend': {
          const metric = (url.searchParams.get('metric') ?? 'avg_score') as
            | 'avg_score'
            | 'attendance'
            | 'enrollment';
          const months = parseInt(url.searchParams.get('months') ?? '6', 10);
          const trend = await DistrictAnalyticsService.getMetricTrend(
            districtId,
            metric,
            months,
          );
          return NextResponse.json({ success: true, trend });
        }

        default:
          return NextResponse.json({ error: 'Unknown view' }, { status: 400 });
      }
    } catch (error) {
      console.error('District analytics error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch district analytics' },
        { status: 500 },
      );
    }
  },
);
