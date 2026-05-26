'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherPerformance');

interface PerformanceRecord {
  id: string;
  teacherName: string;
  subject: string;
  evaluationDate: string;
  overallRating: number;
  studentSatisfaction: number;
  studentGrowth: number;
  classroomManagement: number;
  curriculumDelivery: number;
  evaluatorName: string;
  feedback: string;
}

interface PerformanceAnalytics {
  totalTeachers: number;
  averageRating: number;
  topPerformers: Array<{ name: string; rating: number }>;
  performanceDistribution: Array<{ rating: string; count: number }>;
  trendData: Array<{ month: string; average: number }>;
  allRecords: PerformanceRecord[];
}

export default function TeacherPerformancePage() {
  const [analyticsData, setAnalyticsData] = useState<PerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>('all');

  useEffect(() => {
    fetchPerformanceData();
  }, [filterSubject]);

  async function fetchPerformanceData() {
    try {
      let url = '/api/admin/teacher-performance';
      if (filterSubject !== 'all') {
        url += `?subject=${filterSubject}`;
      }
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch performance data');
      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      log.error('Failed to load performance data', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Teacher Performance" subtitle="Evaluate and track educator effectiveness">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading performance data...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Teacher Performance" subtitle="Evaluate and track educator effectiveness">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load performance data.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const columns = [
    {
      key: 'teacherName',
      label: 'Teacher',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (value: string) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: 'evaluationDate',
      label: 'Evaluation Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'overallRating',
      label: 'Overall Rating',
      render: (value: number) => (
        <span className={`font-bold ${value >= 4 ? 'text-green-600' : value >= 3 ? 'text-yellow-600' : 'text-orange-600'}`}>
          {value.toFixed(1)}/5
        </span>
      ),
    },
    {
      key: 'studentGrowth',
      label: 'Student Growth',
      render: (value: number) => (
        <div className="w-24">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${value * 20}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{value.toFixed(1)}/5</p>
        </div>
      ),
    },
    {
      key: 'evaluatorName',
      label: 'Evaluator',
      render: (value: string) => <span className="text-gray-600">{value}</span>,
    },
  ];

  return (
    <DashboardLayout title="Teacher Performance Reports" subtitle="Track educator effectiveness and growth">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Key Metrics */}
          <MetricsGrid columns={4}>
            <SummaryCard
              title="Total Teachers"
              value={analyticsData.totalTeachers}
              icon="👨‍🏫"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Average Rating"
              value={analyticsData.averageRating.toFixed(1)}
              icon="⭐"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Top Performers"
              value={analyticsData.topPerformers.length}
              icon="🏆"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Total Evaluations"
              value={analyticsData.allRecords.length}
              icon="📋"
              backgroundColor="bg-purple-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Performance Distribution" description="Teachers by rating">
              <EnhancedBarChart data={analyticsData.performanceDistribution} color="#3b82f6" />
            </ChartCard>

            <ChartCard title="Average Rating Trend" description="Performance over time">
              <EnhancedLineChart
                data={analyticsData.trendData}
                xKey="month"
                yKey="average"
                color="#10b981"
              />
            </ChartCard>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <h3 className="font-bold text-gray-900 mb-4">🏆 Top Performing Teachers</h3>
            <div className="space-y-2">
              {analyticsData.topPerformers.map((teacher, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                  <span className="font-medium text-gray-900">{idx + 1}. {teacher.name}</span>
                  <span className="text-yellow-600 font-bold">{teacher.rating.toFixed(1)}/5</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Records Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">All Performance Evaluations</h3>
            <div className="bg-white rounded-lg shadow">
              <DataTable columns={columns} data={analyticsData.allRecords} />
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
