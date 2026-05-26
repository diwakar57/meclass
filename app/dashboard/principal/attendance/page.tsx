'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('PrincipalAttendance');

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  classId: string;
  className: string;
  remarks?: string;
}

interface AttendanceAnalytics {
  totalStudents: number;
  averageAttendanceRate: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  weeklyTrend: Array<{ day: string; rate: number }>;
  monthlyTrend: Array<{ month: string; rate: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  chronicallyAbsent: Array<{ studentName: string; absences: number }>;
  recentRecords: AttendanceRecord[];
  byClass: Array<{ className: string; rate: number }>;
}

export default function PrincipalAttendancePage() {
  const [analyticsData, setAnalyticsData] = useState<AttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterClass, setFilterClass] = useState<string>('all');

  useEffect(() => {
    fetchAttendanceData();
  }, [filterDate, filterClass]);

  async function fetchAttendanceData() {
    try {
      const params = new URLSearchParams({ date: filterDate });
      if (filterClass !== 'all') params.append('class', filterClass);
      const response = await fetch(`/api/principal/attendance?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch attendance');
      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      log.error('Failed to load attendance data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAttendance(studentId: string, status: string) {
    try {
      const response = await fetch('/api/principal/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId, status, date: filterDate }),
      });
      if (!response.ok) throw new Error('Failed to mark attendance');
      await fetchAttendanceData();
    } catch (err) {
      log.error('Failed to mark attendance', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Attendance" subtitle="Track student attendance patterns">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading attendance data...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Attendance" subtitle="Track student attendance patterns">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load attendance data.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const columns = [
    {
      key: 'studentName',
      label: 'Student',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'className',
      label: 'Class',
      render: (value: string) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          present: 'bg-green-100 text-green-800',
          absent: 'bg-red-100 text-red-800',
          late: 'bg-yellow-100 text-yellow-800',
          excused: 'bg-blue-100 text-blue-800',
        };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[value] || 'bg-gray-100'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (value?: string) => <span className="text-gray-600">{value || '—'}</span>,
    },
  ];

  return (
    <DashboardLayout title="Attendance" subtitle="Monitor student attendance trends">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Filters */}
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Key Metrics */}
          <MetricsGrid columns={5}>
            <SummaryCard
              title="Total Students"
              value={analyticsData.totalStudents}
              icon="👥"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Present Today"
              value={analyticsData.presentToday}
              icon="✅"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Absent Today"
              value={analyticsData.absentToday}
              icon="❌"
              backgroundColor="bg-red-50"
            />
            <SummaryCard
              title="Late Today"
              value={analyticsData.lateToday}
              icon="⏰"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Avg Attendance"
              value={`${Math.round(analyticsData.averageAttendanceRate)}%`}
              icon="📊"
              backgroundColor="bg-purple-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Weekly Trend" description="Attendance rate by day">
              <EnhancedLineChart
                data={analyticsData.weeklyTrend}
                xKey="day"
                yKey="rate"
                color="#10b981"
              />
            </ChartCard>

            <ChartCard title="Monthly Trend" description="Attendance rate by month">
              <EnhancedLineChart
                data={analyticsData.monthlyTrend}
                xKey="month"
                yKey="rate"
                color="#3b82f6"
              />
            </ChartCard>
          </div>

          {/* Status Distribution & By Class */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Status Distribution" description="Today's attendance breakdown">
              <EnhancedBarChart data={analyticsData.statusDistribution} color="#f59e0b" />
            </ChartCard>

            <ChartCard title="By Class" description="Attendance rate per class">
              <EnhancedBarChart data={analyticsData.byClass} color="#8b5cf6" />
            </ChartCard>
          </div>

          {/* Chronically Absent */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <h3 className="font-bold text-gray-900 mb-4">⚠️ Chronic Absenteeism</h3>
            <div className="space-y-2">
              {analyticsData.chronicallyAbsent.map((student, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <span className="font-medium text-gray-900">{student.studentName}</span>
                  <span className="text-red-600 font-bold">{student.absences} absences</span>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Records */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Records</h3>
            <div className="bg-white rounded-lg shadow">
              <DataTable columns={columns} data={analyticsData.recentRecords} />
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
