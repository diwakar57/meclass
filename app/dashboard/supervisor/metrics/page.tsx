'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart, GaugeChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('SupervisorMetrics');

interface AcademicMetrics {
  schools: Array<{
    schoolId: string;
    schoolName: string;
    studentCount: number;
    teacherCount: number;
    avgGPA: number;
    passRate: number;
    improvementRate: number;
    qualityScore: number;
  }>;
  platformMetrics: {
    totalStudents: number;
    totalTeachers: number;
    averageGPA: number;
    overallPassRate: number;
    studentEngagement: number;
    teacherPerformance: number;
  };
  improvementTrends: Array<{ month: string; passRate: number }>;
  subjectPerformance: Array<{ subject: string; average: number }>;
}

export default function SupervisorMetricsPage() {
  const [metricsData, setMetricsData] = useState<AcademicMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    try {
      const response = await fetch('/api/supervisor/metrics', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetricsData(data.data);
    } catch (err) {
      log.error('Failed to load metrics', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Metrics" subtitle="Academic quality and performance indicators">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading metrics...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!metricsData) {
    return (
      <DashboardLayout title="Metrics" subtitle="Academic quality and performance indicators">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load metrics.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const columns = [
    {
      key: 'schoolName',
      label: 'School',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'studentCount',
      label: 'Students',
      render: (value: number) => <span className="text-center">{value}</span>,
    },
    {
      key: 'teacherCount',
      label: 'Teachers',
      render: (value: number) => <span className="text-center">{value}</span>,
    },
    {
      key: 'avgGPA',
      label: 'Avg GPA',
      render: (value: number) => <span className="font-bold text-blue-600">{value.toFixed(2)}</span>,
    },
    {
      key: 'passRate',
      label: 'Pass Rate',
      render: (value: number) => (
        <span className={`font-bold ${value >= 80 ? 'text-green-600' : 'text-orange-600'}`}>{Math.round(value)}%</span>
      ),
    },
    {
      key: 'qualityScore',
      label: 'Quality Score',
      render: (value: number) => <span className="font-bold text-purple-600">{value.toFixed(1)}/10</span>,
    },
  ];

  return (
    <DashboardLayout title="Academic Metrics" subtitle="Monitor platform-wide quality indicators">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Key Metrics */}
          <MetricsGrid columns={6}>
            <SummaryCard
              title="Total Students"
              value={metricsData.platformMetrics.totalStudents.toLocaleString()}
              icon="👥"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Total Teachers"
              value={metricsData.platformMetrics.totalTeachers.toLocaleString()}
              icon="👨‍🏫"
              backgroundColor="bg-purple-50"
            />
            <SummaryCard
              title="Avg GPA"
              value={metricsData.platformMetrics.averageGPA.toFixed(2)}
              icon="📊"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Pass Rate"
              value={`${Math.round(metricsData.platformMetrics.overallPassRate)}%`}
              icon="✅"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Student Engagement"
              value={`${Math.round(metricsData.platformMetrics.studentEngagement)}%`}
              icon="🎯"
              backgroundColor="bg-orange-50"
            />
            <SummaryCard
              title="Teacher Performance"
              value={`${Math.round(metricsData.platformMetrics.teacherPerformance)}/10`}
              icon="⭐"
              backgroundColor="bg-pink-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Pass Rate Trend" description="Academic performance over time">
              <EnhancedLineChart
                data={metricsData.improvementTrends}
                xKey="month"
                yKey="passRate"
                color="#10b981"
              />
            </ChartCard>

            <ChartCard title="Subject Performance" description="Average scores by subject">
              <EnhancedBarChart data={metricsData.subjectPerformance} color="#3b82f6" />
            </ChartCard>
          </div>

          {/* Gauge Charts for Quality Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartCard title="Overall Pass Rate" description="System-wide performance">
              <GaugeChart
                value={metricsData.platformMetrics.overallPassRate}
                maxValue={100}
                color="#10b981"
              />
            </ChartCard>
            <ChartCard title="Student Engagement" description="Active participation level">
              <GaugeChart
                value={metricsData.platformMetrics.studentEngagement}
                maxValue={100}
                color="#3b82f6"
              />
            </ChartCard>
            <ChartCard title="Teacher Performance" description="Instructor quality rating">
              <GaugeChart
                value={metricsData.platformMetrics.teacherPerformance}
                maxValue={10}
                color="#f59e0b"
              />
            </ChartCard>
          </div>

          {/* Schools Performance Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Schools Performance</h3>
            <div className="bg-white rounded-lg shadow">
              <DataTable columns={columns} data={metricsData.schools} />
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
