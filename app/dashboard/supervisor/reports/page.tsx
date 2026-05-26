'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('SupervisorReports');

interface AcademicReport {
  schoolId: string;
  schoolName: string;
  totalStudents: number;
  averageGPA: number;
  passingRate: number;
  improvementRate: number;
  teacherQualityRating: number;
  studentEngagement: number;
  generatedDate: string;
  reportType: 'monthly' | 'quarterly' | 'annual';
}

interface SupervisorAnalytics {
  totalSchools: number;
  averageAcademicPerformance: number;
  topPerformingSchools: Array<{ name: string; score: number }>;
  improvingSchools: Array<{ name: string; improvement: number }>;
  concernSchools: Array<{ name: string; score: number }>;
  performanceTrend: Array<{ month: string; average: number }>;
  subjectPerformance: Array<{ subject: string; average: number }>;
  allReports: AcademicReport[];
}

export default function SupervisorReportsPage() {
  const [analyticsData, setAnalyticsData] = useState<SupervisorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  useEffect(() => {
    fetchReports();
  }, [filterType]);

  async function fetchReports() {
    try {
      const response = await fetch(`/api/supervisor/reports?type=${filterType}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      log.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadReport(reportId: string) {
    try {
      const response = await fetch(`/api/supervisor/reports/${reportId}/download`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to download report');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      a.click();
    } catch (err) {
      log.error('Failed to download report', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Reports" subtitle="Academic quality and performance reports">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading reports...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Reports" subtitle="Academic quality and performance reports">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load reports.</p>
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
      key: 'totalStudents',
      label: 'Students',
      render: (value: number) => <span className="text-center">{value}</span>,
    },
    {
      key: 'averageGPA',
      label: 'Avg GPA',
      render: (value: number) => <span className="font-bold text-blue-600">{value.toFixed(2)}</span>,
    },
    {
      key: 'passingRate',
      label: 'Passing Rate',
      render: (value: number) => (
        <span className={`font-bold ${value >= 80 ? 'text-green-600' : value >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
          {Math.round(value)}%
        </span>
      ),
    },
    {
      key: 'improvementRate',
      label: 'Improvement',
      render: (value: number) => <span className="text-green-600 font-bold">+{Math.round(value)}%</span>,
    },
    {
      key: 'generatedDate',
      label: 'Report Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout title="Academic Reports" subtitle="School-wide academic quality tracking">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Report Type Filter */}
          <div className="flex gap-2">
            {(['monthly', 'quarterly', 'annual'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-6 py-2 rounded-lg font-medium ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Key Metrics */}
          <MetricsGrid columns={4}>
            <SummaryCard
              title="Total Schools"
              value={analyticsData.totalSchools}
              icon="🏫"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Avg Academic Performance"
              value={`${Math.round(analyticsData.averageAcademicPerformance)}/100`}
              icon="📊"
              backgroundColor="bg-purple-50"
            />
            <SummaryCard
              title="Top Performers"
              value={analyticsData.topPerformingSchools.length}
              icon="⭐"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Concern Areas"
              value={analyticsData.concernSchools.length}
              icon="⚠️"
              backgroundColor="bg-red-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Performance Trend" description="Academic average over time">
              <EnhancedLineChart
                data={analyticsData.performanceTrend}
                xKey="month"
                yKey="average"
                color="#3b82f6"
              />
            </ChartCard>

            <ChartCard title="Subject Performance" description="Average scores by subject">
              <EnhancedBarChart data={analyticsData.subjectPerformance} color="#10b981" />
            </ChartCard>
          </div>

          {/* Top Performers & Improvents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <h3 className="font-bold text-gray-900 mb-4">⭐ Top Performing Schools</h3>
              <div className="space-y-3">
                {analyticsData.topPerformingSchools.map((school, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{school.name}</span>
                    <span className="text-green-600 font-bold">{Math.round(school.score)}/100</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <h3 className="font-bold text-gray-900 mb-4">📈 Most Improving Schools</h3>
              <div className="space-y-3">
                {analyticsData.improvingSchools.map((school, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{school.name}</span>
                    <span className="text-blue-600 font-bold">+{Math.round(school.improvement)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Concern Areas */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <h3 className="font-bold text-gray-900 mb-4">⚠️ Schools Needing Support</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyticsData.concernSchools.map((school, idx) => (
                <div key={idx} className="p-4 bg-red-50 rounded">
                  <p className="font-bold text-gray-900">{school.name}</p>
                  <p className="text-sm text-red-600 mt-1">Performance: {Math.round(school.score)}/100</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reports Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Reports</h3>
            <div className="bg-white rounded-lg shadow">
              <DataTable columns={columns} data={analyticsData.allReports} />
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
