'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EnhancedLineChart, EnhancedBarChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdvancedAnalytics');

interface AnalyticsData {
  revenue: {
    trend: Array<{ date: string; revenue: number; expenses: number }>;
    total: number;
    growth: number;
    comparison: number;
  };
  engagement: {
    daily: Array<{ date: string; logins: number; activities: number; assignments: number }>;
    avgSessionDuration: number;
    returnRate: number;
    retentionRate: number;
  };
  learningOutcomes: {
    passRate: Array<{ month: string; passRate: number; failRate: number }>;
    averageGPA: number;
    improvementRate: number;
    completionRate: number;
  };
  demographics: {
    byRole: Array<{ role: string; count: number }>;
    byGrade: Array<{ grade: string; count: number }>;
    growth: Array<{ month: string; students: number; teachers: number }>;
  };
  performance: {
    topPerformers: Array<{ name: string; score: number }>;
    lowestPerformers: Array<{ name: string; score: number }>;
    subjectPerformance: Array<{ subject: string; avgScore: number }>;
  };
}

export default function AdvancedAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'engagement' | 'learning' | 'performance'>('revenue');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  async function fetchAnalytics() {
    try {
      const response = await fetch(`/api/admin/advanced-analytics?range=${timeRange}`, {
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
      <DashboardLayout title="Advanced Analytics" subtitle="Deep-dive performance insights">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading analytics...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Advanced Analytics" subtitle="Deep-dive performance insights">
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

  return (
    <DashboardLayout title="Advanced Analytics" subtitle="Comprehensive performance analysis">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {(['1M', '3M', '6M', '1Y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      timeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(['revenue', 'engagement', 'learning', 'performance'] as const).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      selectedMetric === metric
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue Analytics */}
          {selectedMetric === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    ${(analyticsData.revenue.total / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Revenue Growth</p>
                  <p className={`text-3xl font-bold mt-2 ${analyticsData.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analyticsData.revenue.growth > 0 ? '+' : ''}{analyticsData.revenue.growth}%
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">YoY Comparison</p>
                  <p className={`text-3xl font-bold mt-2 ${analyticsData.revenue.comparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analyticsData.revenue.comparison > 0 ? '+' : ''}{analyticsData.revenue.comparison}%
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Avg Monthly</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    ${(analyticsData.revenue.total / 3 / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <EnhancedLineChart
                  data={analyticsData.revenue.trend}
                  xKey="date"
                  yKeys={[
                    { key: 'revenue', name: 'Revenue', color: '#10b981' },
                    { key: 'expenses', name: 'Expenses', color: '#ef4444' },
                  ]}
                  title="Revenue vs Expenses Trend"
                />
              </div>
            </div>
          )}

          {/* Engagement Analytics */}
          {selectedMetric === 'engagement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Avg Session Duration</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {analyticsData.engagement.avgSessionDuration.toFixed(1)} mins
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Return Rate</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {analyticsData.engagement.returnRate}%
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Retention Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {analyticsData.engagement.retentionRate}%
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Daily Activities</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {analyticsData.engagement.daily[analyticsData.engagement.daily.length - 1]?.activities || 0}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <EnhancedLineChart
                  data={analyticsData.engagement.daily}
                  xKey="date"
                  yKeys={[
                    { key: 'logins', name: 'Logins', color: '#3b82f6' },
                    { key: 'activities', name: 'Activities', color: '#8b5cf6' },
                    { key: 'assignments', name: 'Assignments', color: '#ec4899' },
                  ]}
                  title="Daily User Engagement"
                />
              </div>
            </div>
          )}

          {/* Learning Outcomes */}
          {selectedMetric === 'learning' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Average GPA</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {analyticsData.learningOutcomes.averageGPA.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Pass Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {analyticsData.learningOutcomes.passRate[analyticsData.learningOutcomes.passRate.length - 1]?.passRate || 0}%
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Improvement Rate</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {analyticsData.learningOutcomes.improvementRate}%
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {analyticsData.learningOutcomes.completionRate}%
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <EnhancedBarChart
                  data={analyticsData.learningOutcomes.passRate}
                  xKey="month"
                  yKeys={[
                    { key: 'passRate', name: 'Pass Rate', color: '#10b981' },
                    { key: 'failRate', name: 'Fail Rate', color: '#ef4444' },
                  ]}
                  title="Pass Rate Trend by Month"
                />
              </div>
            </div>
          )}

          {/* Performance Analytics */}
          {selectedMetric === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="font-bold text-gray-900 mb-4">Top 5 Performers</p>
                  <div className="space-y-3">
                    {analyticsData.performance.topPerformers.map((performer, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-transparent rounded-lg">
                        <span className="text-gray-800 font-medium">
                          <span className="text-green-600 font-bold mr-2">#{idx + 1}</span>
                          {performer.name}
                        </span>
                        <span className="text-lg font-bold text-green-600">{performer.score.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <p className="font-bold text-gray-900 mb-4">Students Needing Support</p>
                  <div className="space-y-3">
                    {analyticsData.performance.lowestPerformers.map((performer, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-transparent rounded-lg">
                        <span className="text-gray-800 font-medium">
                          <span className="text-red-600 font-bold mr-2">⚠️</span>
                          {performer.name}
                        </span>
                        <span className="text-lg font-bold text-red-600">{performer.score.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="font-bold text-gray-900 mb-4">Subject Performance</p>
                <div className="space-y-3">
                  {analyticsData.performance.subjectPerformance.map((subject, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <span className="flex-1 text-gray-700 font-medium">{subject.subject}</span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${Math.min(subject.avgScore, 100)}%` }}
                        />
                      </div>
                      <span className="text-right font-bold text-blue-600 w-12">{subject.avgScore.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Demographics Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="font-bold text-gray-900 mb-4">User Demographics</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-3">By Role</p>
                <div className="space-y-2">
                  {analyticsData.demographics.byRole.map((role, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">{role.role}</span>
                      <span className="font-bold text-blue-600">{role.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-3">By Grade</p>
                <div className="space-y-2">
                  {analyticsData.demographics.byGrade.map((grade, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">{grade.grade}</span>
                      <span className="font-bold text-blue-600">{grade.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
