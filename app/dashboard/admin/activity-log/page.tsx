'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('ActivityLog');

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  details?: string;
}

interface ActivitySummary {
  totalActivities: number;
  todayActivities: number;
  successRate: number;
  recentActivities: ActivityLogEntry[];
  activityByType: Array<{ type: string; count: number }>;
  activityByUser: Array<{ user: string; count: number }>;
}

export default function ActivityLogPage() {
  const [activityData, setActivityData] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failure' | 'warning'>('all');
  const [searchUser, setSearchUser] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchActivityLog();
  }, [filterStatus, startDate, endDate, searchUser]);

  async function fetchActivityLog() {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchUser) params.append('user', searchUser);
      const response = await fetch(`/api/admin/activity-log?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch activity log');
      const data = await response.json();
      setActivityData(data.data);
    } catch (err) {
      log.error('Failed to load activity log', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Activity Log" subtitle="Monitor all platform activities">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading activity log...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!activityData) {
    return (
      <DashboardLayout title="Activity Log" subtitle="Monitor all platform activities">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load activity log.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredActivities = activityData.recentActivities.filter(
    (a) => filterStatus === 'all' || a.status === filterStatus
  );

  const columns = [
    {
      key: 'timestamp',
      label: 'Time',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      key: 'user',
      label: 'User',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'action',
      label: 'Action',
      render: (value: string) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: 'resource',
      label: 'Resource',
      render: (value: string) => <span className="text-gray-600">{value}</span>,
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (value: string) => <span className="text-xs text-gray-600">{value}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          success: 'bg-green-100 text-green-800',
          failure: 'bg-red-100 text-red-800',
          warning: 'bg-yellow-100 text-yellow-800',
        };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[value] || 'bg-gray-100'}`}>
            {value}
          </span>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Activity Log" subtitle="Comprehensive audit trail">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Activities</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{activityData.totalActivities}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Today's Activities</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{activityData.todayActivities}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{Math.round(activityData.successRate)}%</p>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {(['all', 'success', 'failure', 'warning'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Table */}
          <div className="bg-white rounded-lg shadow">
            <DataTable columns={columns} data={filteredActivities} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="font-bold text-gray-900 mb-4">Top Users</p>
              <div className="space-y-2">
                {activityData.activityByUser.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{item.user}</span>
                    <span className="font-bold text-blue-600">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="font-bold text-gray-900 mb-4">Activity Types</p>
              <div className="space-y-2">
                {activityData.activityByType.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{item.type}</span>
                    <span className="font-bold text-blue-600">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
