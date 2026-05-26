'use client';
// Fixed: null safety on analytics properties

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  SummaryCard, MetricsGrid, ChartCard, AlertsPanel, DataTable, EmptyState
} from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart, EnhancedBarChart, EnhancedDonutChart
} from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

// Null safety applied to all analytics properties
const log = createLogger('PrincipalDashboard');

interface PrincipalAnalytics {
  totalStudents: number;
  totalTeachers: number;
  attendanceTrend: Array<{ label: string; value: number }>;
  subjectPerformance: Array<{ label: string; value: number }>;
  classPerfComparison: Array<{ label: string; value: number }>;
  feeCollection: { collected: number; outstanding: number };
  syllabusCompletion: number;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface ApprovedMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
}

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<PrincipalAnalytics | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<ApprovedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'members'>('overview');

  useEffect(() => {
    if (user?.schoolId) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [user?.schoolId]);

  async function fetchData() {
    if (!user?.schoolId) return;
    try {
      const [analyticsRes, requestsRes, membersRes] = await Promise.all([
        fetch('/api/principal/analytics', { credentials: 'include' }),
        fetch(`/api/principal/schools/${user.schoolId}/join-requests`, { credentials: 'include' }),
        fetch(`/api/principal/schools/${user.schoolId}/members`, { credentials: 'include' })
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data.data);
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setJoinRequests(data.data || []);
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setApprovedMembers(data.data || []);
      }
    } catch (err) {
      log.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(requestId: string) {
    try {
      const response = await fetch(`/api/principal/join-requests/${requestId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      log.error('Failed to approve request', err);
    }
  }

  async function rejectRequest(requestId: string) {
    try {
      const response = await fetch(`/api/principal/join-requests/${requestId}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      log.error('Failed to reject request', err);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  const pendingRequests = joinRequests.filter(r => r.status === 'pending');
  const alerts = [];
  if (pendingRequests.length > 0) {
    alerts.push({
      id: 'requests',
      type: 'info' as const,
      title: `${pendingRequests.length} Join Request${pendingRequests.length !== 1 ? 's' : ''}`,
      description: 'Pending approval from new members',
      action: { label: 'Review', onClick: () => setActiveTab('requests') }
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-4xl font-bold text-gray-900">Principal Dashboard</h1>
          <p className="text-gray-600 mt-2">School management and performance overview</p>
        </header>

        {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium border-b-2 transition ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-3 font-medium border-b-2 transition ${
                activeTab === 'requests'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Join Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 font-medium border-b-2 transition ${
                activeTab === 'members'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Members
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <>
            {/* Key Metrics */}
            <MetricsGrid columns={4}>
              <SummaryCard
                title="Total Students"
                value={analytics?.totalStudents || 0}
                icon="👥"
                backgroundColor="bg-blue-50"
              />
              <SummaryCard
                title="Total Teachers"
                value={analytics?.totalTeachers || 0}
                icon="👨‍🏫"
                backgroundColor="bg-green-50"
              />
              <SummaryCard
                title="Syllabus Completion"
                value={`${analytics?.syllabusCompletion || 0}%`}
                icon="📚"
                backgroundColor="bg-purple-50"
              />
              <SummaryCard
                title="Fee Collection"
                value={`$${((analytics?.feeCollection?.collected || 0) / 1000).toFixed(1)}K`}
                unit={`$${((analytics?.feeCollection?.outstanding || 0) / 1000).toFixed(1)}K outstanding`}
                icon="💰"
                backgroundColor="bg-orange-50"
              />
            </MetricsGrid>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Attendance Trend" description="Last 6 months">
                <EnhancedLineChart data={analytics?.attendanceTrend || []} color="#3b82f6" />
              </ChartCard>

              <ChartCard title="Subject Performance" description="By subject">
                <EnhancedBarChart data={analytics?.subjectPerformance || []} color="#10b981" />
              </ChartCard>

              <ChartCard title="Class Performance Comparison" description="All classes">
                <EnhancedBarChart data={analytics?.classPerfComparison || []} color="#8b5cf6" />
              </ChartCard>

              <ChartCard title="Fee Collection Status" description="Paid vs outstanding">
                <EnhancedDonutChart
                  data={[
                    { label: 'Collected', value: analytics?.feeCollection?.collected || 0 },
                    { label: 'Outstanding', value: analytics?.feeCollection?.outstanding || 0 }
                  ]}
                  centerValue={`${Math.round(((analytics?.feeCollection?.collected || 0) / ((analytics?.feeCollection?.collected || 0) + (analytics?.feeCollection?.outstanding || 0)) || 0) * 100)}%`}
                />
              </ChartCard>
            </div>
          </>
        )}

        {/* Join Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-lg shadow p-6">
            {joinRequests.length === 0 ? (
              <EmptyState title="No join requests" description="All pending requests have been processed" />
            ) : (
              <div className="space-y-4">
                {joinRequests.map(request => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{request.userName}</h4>
                      <p className="text-sm text-gray-600">{request.userEmail}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Status: <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>{request.status}</span>
                      </p>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveRequest(request.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRequest(request.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-lg shadow p-6">
            {approvedMembers.length === 0 ? (
              <EmptyState title="No members yet" description="Approved members will appear here" />
            ) : (
              <DataTable
                columns={[
                  { key: 'userName', label: 'Name' },
                  { key: 'userEmail', label: 'Email' },
                  { key: 'role', label: 'Role' }
                ]}
                data={approvedMembers}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
