'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart,
  EnhancedBarChart,
  HeatmapChart,
  GaugeChart,
} from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminAnalytics');

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalSchools: number;
    activeSchools: number;
    totalRevenue: number;
    monthlyGrowth: number;
    platformUptime: number;
    avgSessionDuration: number;
  };
  userGrowth: Array<{ month: string; users: number }>;
  roleDistribution: Array<{ role: string; count: number }>;
  revenueBySchool: Array<{ school: string; revenue: number }>;
  platformMetrics: Array<{ metric: string; value: number }>;
  userEngagement: Array<{ day: string; value: number }>;
  schoolPerformance: Array<{
    schoolId: string;
    name: string;
    students: number;
    teachers: number;
    revenue: number;
    avgQuizScore: number;
  }>;
  conversionFunnel: Array<{ stage: string; users: number; conversionRate: number }>;
}

export default function AdminAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  async function fetchAnalytics() {
    try {
      const response = await fetch(`/api/analytics/overview?period=${selectedPeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      log.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Analytics" subtitle="Platform-wide performance metrics">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading platform analytics...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Analytics" subtitle="Platform-wide performance metrics">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load analytics data.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const schoolColumns = [
    {
      key: 'name',
      label: 'School Name',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'students',
      label: 'Students',
      render: (value: number) => <span className="text-center">{value}</span>,
    },
    {
      key: 'teachers',
      label: 'Teachers',
      render: (value: number) => <span className="text-center">{value}</span>,
    },
    {
      key: 'revenue',
      label: 'Monthly Revenue',
      render: (value: number) => <span className="font-bold text-green-600">${value.toLocaleString()}</span>,
    },
    {
      key: 'avgQuizScore',
      label: 'Avg Quiz Score',
      render: (value: number) => (
        <span className={`font-bold ${value >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
          {Math.round(value)}%
        </span>
      ),
    },
  ];

  const conversionColumns = [
    {
      key: 'stage',
      label: 'Funnel Stage',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'users',
      label: 'Users',
      render: (value: number) => <span className="font-bold">{value.toLocaleString()}</span>,
    },
    {
      key: 'conversionRate',
      label: 'Conversion Rate',
      render: (value: number) => (
        <span className={`font-bold ${value >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
          {Math.round(value)}%
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Analytics" subtitle="Platform-wide performance tracking">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Period Selector */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-700">Period:</span>
            {['7d', '30d', '90d', '1y'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '1 Year'}
              </button>
            ))}
          </div>

          {/* Key Metrics Overview */}
          <MetricsGrid columns={4}>
            <SummaryCard
              title="Total Users"
              value={analyticsData.overview.totalUsers.toLocaleString()}
              subtitle={`${analyticsData.overview.activeUsers} active`}
              icon="👥"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Active Schools"
              value={analyticsData.overview.activeSchools}
              subtitle={`of ${analyticsData.overview.totalSchools}`}
              icon="🏫"
              backgroundColor="bg-purple-50"
            />
            <SummaryCard
              title="Total Revenue"
              value={`$${(analyticsData.overview.totalRevenue / 1000).toFixed(1)}K`}
              subtitle={`+${analyticsData.overview.monthlyGrowth}% growth`}
              icon="💰"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Platform Uptime"
              value={`${analyticsData.overview.platformUptime}%`}
              subtitle="Last 30 days"
              icon="✅"
              backgroundColor="bg-green-50"
            />
          </MetricsGrid>

          {/* Primary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="User Growth Trend" description="Active users over time">
              <EnhancedLineChart
                data={analyticsData.userGrowth}
                xKey="month"
                yKey="users"
                color="#3b82f6"
              />
            </ChartCard>

            <ChartCard title="Role Distribution" description="Users by role across platform">
              <EnhancedBarChart data={analyticsData.roleDistribution} color="#8b5cf6" />
            </ChartCard>
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Revenue by School" description="Top performing schools">
              <EnhancedBarChart data={analyticsData.revenueBySchool} color="#f59e0b" />
            </ChartCard>

            <ChartCard title="User Engagement" description="Daily active usage patterns">
              <EnhancedLineChart
                data={analyticsData.userEngagement}
                xKey="day"
                yKey="value"
                color="#10b981"
              />
            </ChartCard>
          </div>

          {/* Gauge Charts for Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <ChartCard title="Session Duration" description="Average minutes per session">
              <GaugeChart
                value={analyticsData.overview.avgSessionDuration}
                maxValue={100}
                color="#3b82f6"
              />
            </ChartCard>
            <ChartCard title="Platform Health" description="Overall system status">
              <GaugeChart
                value={analyticsData.overview.platformUptime}
                maxValue={100}
                color="#10b981"
              />
            </ChartCard>
            <ChartCard title="Monthly Growth" description="Year-over-year growth percentage">
              <GaugeChart
                value={analyticsData.overview.monthlyGrowth}
                maxValue={50}
                color="#f59e0b"
              />
            </ChartCard>
            <ChartCard title="Active Users %" description="Percentage of total users">
              <GaugeChart
                value={(analyticsData.overview.activeUsers / analyticsData.overview.totalUsers) * 100}
                maxValue={100}
                color="#8b5cf6"
              />
            </ChartCard>
          </div>

          {/* School Performance Table */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">School Performance</h3>
              <div className="bg-white rounded-lg shadow">
                <DataTable columns={schoolColumns} data={analyticsData.schoolPerformance} />
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">User Conversion Funnel</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="space-y-4">
                    {analyticsData.conversionFunnel.map((stage, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-2">
                          <span className="font-medium text-gray-700">{stage.stage}</span>
                          <span className="text-sm text-gray-600">{stage.users.toLocaleString()} users</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full"
                            style={{ width: `${stage.conversionRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{Math.round(stage.conversionRate)}% conversion</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                  <DataTable columns={conversionColumns} data={analyticsData.conversionFunnel} />
                </div>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <h4 className="font-bold text-gray-900 mb-2">💡 User Growth Insight</h4>
              <p className="text-sm text-gray-600">
                Platform reached {analyticsData.overview.totalUsers.toLocaleString()} users with{' '}
                {analyticsData.overview.monthlyGrowth}% monthly growth rate.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <h4 className="font-bold text-gray-900 mb-2">💰 Revenue Milestone</h4>
              <p className="text-sm text-gray-600">
                Monthly revenue increased to ${(analyticsData.overview.totalRevenue).toLocaleString()} across{' '}
                {analyticsData.overview.activeSchools} active schools.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <h4 className="font-bold text-gray-900 mb-2">📊 System Performance</h4>
              <p className="text-sm text-gray-600">
                Platform uptime maintained at {analyticsData.overview.platformUptime}% with average session
                duration of {Math.round(analyticsData.overview.avgSessionDuration)} minutes.
              </p>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
