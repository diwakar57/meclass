'use client';

import { useState, useEffect } from 'react';
import {
  SummaryCard, MetricsGrid, ChartCard, DataTable, AlertsPanel, EmptyState
} from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart, EnhancedBarChart, EnhancedDonutChart, HeatmapChart
} from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('SupervisorDashboard');

interface SupervisorAnalytics {
  monthlyActiveUsers: number;
  activeClasses: number;
  platformEngagement: number;
  monthlyUserGrowth: Array<{ label: string; value: number }>;
  classPerformance: Array<{ label: string; value: number }>;
  teacherPerformance: Array<{ label: string; value: number }>;
  riskDistribution: Array<{ label: string; value: number }>;
  schoolComparison: Array<{ label: string; value: number }>;
  teacherMetrics: Array<{ teacher: string; metric: string; value: number }>;
  atRiskSchools: Array<{ schoolId: string; riskScore: number }>;
}

export default function SupervisorDashboard() {
  const [analytics, setAnalytics] = useState<SupervisorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/supervisor/analytics', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setAnalytics(data.data);
      } catch (err) {
        log.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!analytics) return <EmptyState title="No data available" description="Check back soon" />;

  const alerts = analytics.atRiskSchools?.length > 0 ? [{
    id: 'risk',
    type: 'danger' as const,
    title: `${analytics.atRiskSchools.length} Schools at Risk`,
    description: 'Schools showing concerning trends'
  }] : [];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-4xl font-bold text-gray-900">Platform Supervisor Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor platform-wide metrics and school performance</p>
        </header>

        {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

        {/* Platform Metrics */}
        <MetricsGrid columns={4}>
          <SummaryCard
            title="Monthly Active Users"
            value={analytics.monthlyActiveUsers}
            icon="👥"
            backgroundColor="bg-blue-50"
          />
          <SummaryCard
            title="Active Classes"
            value={analytics.activeClasses}
            icon="📚"
            backgroundColor="bg-green-50"
          />
          <SummaryCard
            title="Platform Engagement"
            value={`${analytics.platformEngagement}%`}
            icon="🔥"
            backgroundColor="bg-orange-50"
          />
          <SummaryCard
            title="Schools Monitored"
            value={analytics.schoolComparison.length}
            icon="🏢"
            backgroundColor="bg-purple-50"
          />
        </MetricsGrid>

        {/* Analysis Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="User Growth Trend" description="Last 6 months">
            <EnhancedLineChart data={analytics.monthlyUserGrowth} color="#3b82f6" />
          </ChartCard>

          <ChartCard title="Student Risk Distribution" description="By risk category">
            <EnhancedDonutChart data={analytics.riskDistribution} centerValue="Distribution" />
          </ChartCard>

          <ChartCard title="Class Performance Overview" description="Top performers">
            <EnhancedBarChart data={analytics.classPerformance} color="#10b981" />
          </ChartCard>

          <ChartCard title="Teacher Performance" description="Effectiveness metrics">
            <EnhancedBarChart data={analytics.teacherPerformance} color="#8b5cf6" />
          </ChartCard>

          <ChartCard title="School Comparison" description="Performance metrics">
            <EnhancedBarChart data={analytics.schoolComparison} color="#f59e0b" />
          </ChartCard>

          <ChartCard title="Teacher Metrics Heatmap" description="Teacher × Metric matrix">
            <HeatmapChart 
              data={analytics.teacherMetrics.map((t: any) => ({
                student: t.teacher,
                topic: t.metric,
                value: t.value
              }))} 
            />
          </ChartCard>
        </div>
      </div>
    </main>
  );
}
