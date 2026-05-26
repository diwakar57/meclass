import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { safeCount, safeMonthlySeries, tableExists } from '@/lib/analytics/query-utils';
import { createLogger } from '@/lib/logger';
import type { AuthContext } from '@/lib/types/auth';

const log = createLogger('AdminAnalyticsAPI');

export const GET = withRole(['saas_admin'], async (_req: NextRequest, _auth: AuthContext) => {
  try {
    const totalSchools = await safeCount('schools');

    const activeSubscriptions = await safeCount(
      'schools',
      `WHERE status = 'active' OR subscription_status = 'active'`
    );

    const schoolGrowth = await safeMonthlySeries('schools', 'created_at', 6);

    let monthlyRevenue: Array<{ label: string; value: number }> = [];
    if (await tableExists('invoices')) {
      const revenueRows = await query(
        `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS ym,
                COALESCE(SUM(amount), 0)::float AS revenue
         FROM invoices
         WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
           AND LOWER(status) IN ('paid', 'active', 'pending', 'overdue')
         GROUP BY ym
         ORDER BY ym ASC`
      );

      const map = new Map<string, number>();
      for (const row of revenueRows.rows) {
        map.set(row.ym, Number(row.revenue || 0));
      }

      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue.push({
          label: d.toLocaleString('en-US', { month: 'short' }),
          value: map.get(ym) || 0,
        });
      }
    } else {
      monthlyRevenue = schoolGrowth.map((x) => ({ ...x, value: 0 }));
    }

    const platformUsage = await safeMonthlySeries('lessons', 'created_at', 6);

    const planDistributionResult = await query(
      `SELECT COALESCE(subscription_tier, 'unknown') AS plan, COUNT(*)::int AS count
       FROM schools
       GROUP BY plan
       ORDER BY count DESC`
    ).catch(() => ({ rows: [] as any[] }));

    const planDistribution = (planDistributionResult.rows || []).map((row: any) => ({
      label: String(row.plan),
      value: Number(row.count || 0),
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalSchools,
        activeSubscriptions,
        monthlyRevenue,
        schoolGrowth,
        platformUsage,
        planDistribution,
      },
    });
  } catch (error) {
    log.error('Failed to fetch admin analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});
