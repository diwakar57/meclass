'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('ParentDashboard');

interface Child {
  id: string;
  name: string;
  class: string;
  school: string;
  currentGPA: number;
  recentGrade?: number;
  attendanceRate: number;
  nextMeeting?: string;
}

interface ParentAnalytics {
  children: Child[];
  selectedChild: string;
  childGradeHistory: Array<{ date: string; subject: string; grade: number }>;
  attendanceTrend: Array<{ week: string; rate: number }>;
  upcomingEvents: Array<{ date: string; title: string; type: string }>;
  teacherMessages: Array<{
    id: string;
    from: string;
    message: string;
    date: string;
    read: boolean;
  }>;
  schoolAnnouncements:  Array<{
    id: string;
    title: string;
    content: string;
    date: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  averageChildGPA: number;
  averageAttendance: number;
  unreadMessages: number;
}

export default function ParentDashboardPage() {
  const [analyticsData, setAnalyticsData] = useState<ParentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    fetchParentData();
  }, [selectedChildId]);

  async function fetchParentData() {
    try {
      let url = '/api/parent/dashboard';
      if (selectedChildId) {
        url += `?childId=${selectedChildId}`;
      }
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch parent data');
      const data = await response.json();
      setAnalyticsData(data.data);
      if (!selectedChildId && data.data.children.length > 0) {
        setSelectedChildId(data.data.children[0].id);
      }
    } catch (err) {
      log.error('Failed to load parent dashboard', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkMessageAsRead(messageId: string) {
    try {
      const response = await fetch(`/api/parent/messages/${messageId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark message');
      await fetchParentData();
    } catch (err) {
      log.error('Failed to mark message', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Monitor your children's progress">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading your dashboard...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Monitor your children's progress">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load your dashboard.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const selectedChild = analyticsData.children.find((c) => c.id === selectedChildId) || analyticsData.children[0];

  const columns = [
    {
      key: 'name',
      label: 'Child',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'class',
      label: 'Class',
      render: (value: string) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: 'currentGPA',
      label: 'GPA',
      render: (value: number) => (
        <span className={`font-bold ${value >= 3.5 ? 'text-green-600' : value >= 3.0 ? 'text-yellow-600' : 'text-orange-600'}`}>
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'attendanceRate',
      label: 'Attendance',
      render: (value: number) => (
        <div className="w-32">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${value}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{Math.round(value)}%</p>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Parent Dashboard" subtitle="Your children's academic progress">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Children Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
            <div className="flex gap-2">
              {analyticsData.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedChildId === child.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>

          {/* Child Overview */}
          {selectedChild && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200">
              <h3 className="text-2xl font-bold text-gray-900">{selectedChild.name}</h3>
              <p className="text-gray-700 mt-1">
                {selectedChild.class} • {selectedChild.school}
              </p>
            </div>
          )}

          {/* Key Metrics */}
          <MetricsGrid columns={4}>
            <SummaryCard
              title="Current GPA"
              value={analyticsData.averageChildGPA.toFixed(2)}
              icon="📚"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Attendance"
              value={`${Math.round(analyticsData.averageAttendance)}%`}
              icon="✅"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Unread Messages"
              value={analyticsData.unreadMessages}
              icon="💬"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Upcoming Events"
              value={analyticsData.upcomingEvents.length}
              icon="📅"
              backgroundColor="bg-purple-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Grade History" description="Recent assessment scores">
              <EnhancedBarChart
                data={analyticsData.childGradeHistory.map((g) => ({
                  label: `${g.subject} (${new Date(g.date).toLocaleDateString()})`,
                  value: g.grade,
                }))}
                color="#3b82f6"
              />
            </ChartCard>

            <ChartCard title="Attendance Trend" description="Weekly attendance rate">
              <EnhancedLineChart
                data={analyticsData.attendanceTrend}
                xKey="week"
                yKey="rate"
                color="#10b981"
              />
            </ChartCard>
          </div>

          {/* Upcoming Events */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">📅 Upcoming Events</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyticsData.upcomingEvents.map((event, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <p className="font-bold text-gray-900">{event.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{new Date(event.date).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{event.type}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Messages */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">💬 Teacher Messages</h3>
            <div className="space-y-2">
              {analyticsData.teacherMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg border border-gray-200 ${msg.read ? 'bg-white' : 'bg-blue-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">From: {msg.from}</p>
                      <p className="text-gray-700 mt-2">{msg.message}</p>
                      <p className="text-xs text-gray-500 mt-2">{new Date(msg.date).toLocaleDateString()}</p>
                    </div>
                    {!msg.read && (
                      <button
                        onClick={() => handleMarkMessageAsRead(msg.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium ml-4"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* School Announcements */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">📢 School Announcements</h3>
            <div className="space-y-3">
              {analyticsData.schoolAnnouncements.map((announcement) => {
                const priorityColors: any = {
                  high: 'border-red-300 bg-red-50',
                  medium: 'border-yellow-300 bg-yellow-50',
                  low: 'border-green-300 bg-green-50',
                };
                return (
                  <div key={announcement.id} className={`p-4 rounded-lg border ${priorityColors[announcement.priority]}`}>
                    <p className="font-bold text-gray-900">{announcement.title}</p>
                    <p className="text-gray-700 mt-2">{announcement.content}</p>
                    <p className="text-xs text-gray-500 mt-2">{new Date(announcement.date).toLocaleDateString()}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Children Overview Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">All Children Overview</h3>
            <div className="bg-white rounded-lg shadow">
              <DataTable columns={columns} data={analyticsData.children} />
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
