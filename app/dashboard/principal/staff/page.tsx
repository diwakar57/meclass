'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('PrincipalStaffManagement');

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'admin' | 'counselor' | 'principal';
  department: string;
  joinDate: string;
  yearsOfExperience: number;
  performanceRating: number;
  assignedClasses: number;
  studentCount: number;
  averageStudentScore: number;
  attendanceRate: number;
  professionDevelopmentHours: number;
  certifications: string[];
  status: 'active' | 'on-leave' | 'inactive';
}

interface StaffAnalytics {
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  byRole: Array<{ role: string; count: number }>;
  byDepartment: Array<{ department: string; count: number }>;
  averagePerformance: number;
  studentTeacherRatio: number;
  averageExperience: number;
  averageAttendance: number;
  allStaff: StaffMember[];
  retentionRate: number;
}

export default function PrincipalStaffManagementPage() {
  const [analyticsData, setAnalyticsData] = useState<StaffAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<'all' | 'teacher' | 'admin' | 'counselor' | 'principal'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'on-leave' | 'inactive'>('active');
  const [showNewStaffModal, setShowNewStaffModal] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'teacher',
    department: '',
    experience: 0,
  });

  useEffect(() => {
    fetchStaffAnalytics();
  }, []);

  async function fetchStaffAnalytics() {
    try {
      const response = await fetch('/api/principal/staff', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch staff analytics');
      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      log.error('Failed to load staff analytics', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleHireStaff() {
    try {
      const response = await fetch('/api/principal/staff/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newStaff),
      });
      if (!response.ok) throw new Error('Failed to hire staff');
      await fetchStaffAnalytics();
      setShowNewStaffModal(false);
      setNewStaff({ name: '', email: '', role: 'teacher', department: '', experience: 0 });
    } catch (err) {
      log.error('Failed to hire staff', err);
    }
  }

  async function handleUpdateStaff(staffId: string, updates: any) {
    try {
      const response = await fetch(`/api/principal/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update staff');
      await fetchStaffAnalytics();
    } catch (err) {
      log.error('Failed to update staff', err);
    }
  }

  async function handleTerminateStaff(staffId: string) {
    if (!confirm('Are you sure you want to terminate this staff member?')) return;
    try {
      const response = await fetch(`/api/principal/staff/${staffId}/terminate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to terminate staff');
      await fetchStaffAnalytics();
    } catch (err) {
      log.error('Failed to terminate staff', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Staff Management" subtitle="Manage school staff and personnel">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading staff data...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Staff Management" subtitle="Manage school staff and personnel">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load staff data. Please try again later.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredStaff = analyticsData.allStaff.filter(
    (s) =>
      (filterRole === 'all' || s.role === filterRole) &&
      (filterStatus === 'all' || s.status === filterStatus)
  );

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (value: string) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: 'yearsOfExperience',
      label: 'Experience',
      render: (value: number) => <span className="text-center">{value} years</span>,
    },
    {
      key: 'performanceRating',
      label: 'Performance',
      render: (value: number) => (
        <span className={`font-bold ${value >= 4 ? 'text-green-600' : value >= 3 ? 'text-yellow-600' : 'text-orange-600'}`}>
          {value.toFixed(1)}/5.0
        </span>
      ),
    },
    {
      key: 'attendanceRate',
      label: 'Attendance',
      render: (value: number) => (
        <div className="w-24">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${value}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{Math.round(value)}%</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          active: 'bg-green-100 text-green-800',
          'on-leave': 'bg-yellow-100 text-yellow-800',
          inactive: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[value] || 'bg-gray-100'}`}>
            {value.replace('-', ' ')}
          </span>
        );
      },
    },
    {
      key: 'id',
      label: 'Action',
      render: (value: string) => (
        <button
          onClick={() => setExpandedStaff(expandedStaff === value ? null : value)}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Staff Management" subtitle="Manage educators and support staff">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Hire New Staff Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewStaffModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              + Hire Staff
            </button>
          </div>

          {/* New Staff Modal */}
          {showNewStaffModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 w-96 shadow-lg">
                <h3 className="text-lg font-bold mb-4">Hire New Staff Member</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="email@school.edu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="counselor">Counselor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      value={newStaff.experience}
                      onChange={(e) => setNewStaff({ ...newStaff, experience: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleHireStaff}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Hire
                  </button>
                  <button
                    onClick={() => setShowNewStaffModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <MetricsGrid columns={5}>
            <SummaryCard
              title="Total Staff"
              value={analyticsData.totalStaff}
              icon="👥"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Active"
              value={analyticsData.activeStaff}
              icon="✅"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="On Leave"
              value={analyticsData.onLeave}
              icon="🏖️"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Avg Performance"
              value={analyticsData.averagePerformance.toFixed(1)}
              icon="⭐"
              backgroundColor="bg-purple-50"
            />
            <SummaryCard
              title="Retention Rate"
              value={`${Math.round(analyticsData.retentionRate)}%`}
              icon="📈"
              backgroundColor="bg-orange-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Staff by Role" description="Distribution of positions">
              <EnhancedBarChart data={analyticsData.byRole} color="#3b82f6" />
            </ChartCard>

            <ChartCard title="Staff by Department" description="Distribution by subject areas">
              <EnhancedBarChart data={analyticsData.byDepartment} color="#8b5cf6" />
            </ChartCard>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Student-Teacher Ratio</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{analyticsData.studentTeacherRatio.toFixed(1)}:1</p>
              <p className="text-xs text-gray-600 mt-2">Students per teacher</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Avg Years Experience</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{analyticsData.averageExperience.toFixed(1)}</p>
              <p className="text-xs text-gray-600 mt-2">Years in profession</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Avg Attendance Rate</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{Math.round(analyticsData.averageAttendance)}%</p>
              <p className="text-xs text-gray-600 mt-2">School year average</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Filter by Role:</p>
                <div className="flex gap-2">
                  {(['all', 'teacher', 'admin', 'counselor', 'principal'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => setFilterRole(role)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        filterRole === role
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Filter by Status:</p>
                <div className="flex gap-2">
                  {(['all', 'active', 'on-leave', 'inactive'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        filterStatus === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {status === 'all' ? 'All' : status.replace('-', ' ').charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-lg shadow">
            <DataTable columns={columns} data={filteredStaff} />
          </div>

          {/* Staff Details - Expandable */}
          {expandedStaff && (
            <div className="bg-white rounded-lg shadow p-6">
              {filteredStaff.find((s) => s.id === expandedStaff) && (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold">{filteredStaff.find((s) => s.id === expandedStaff)?.name}</h3>
                      <p className="text-gray-600 mt-1">
                        {filteredStaff.find((s) => s.id === expandedStaff)?.role.toUpperCase()} • {filteredStaff.find((s) => s.id === expandedStaff)?.department}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedStaff(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="text-sm font-bold mt-2">{filteredStaff.find((s) => s.id === expandedStaff)?.email}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Join Date</p>
                      <p className="text-sm font-bold mt-2">
                        {new Date(filteredStaff.find((s) => s.id === expandedStaff)?.joinDate || '').toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Classes</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {filteredStaff.find((s) => s.id === expandedStaff)?.assignedClasses}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Students</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">
                        {filteredStaff.find((s) => s.id === expandedStaff)?.studentCount}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Avg Score</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {filteredStaff.find((s) => s.id === expandedStaff)?.averageStudentScore.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">Certifications</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredStaff.find((s) => s.id === expandedStaff)?.certifications.map((cert, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        const staff = filteredStaff.find((s) => s.id === expandedStaff);
                        if (staff) {
                          handleUpdateStaff(staff.id, { status: 'on-leave' });
                        }
                      }}
                      className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                    >
                      Mark On Leave
                    </button>
                    <button
                      onClick={() => {
                        const staff = filteredStaff.find((s) => s.id === expandedStaff);
                        if (staff) {
                          handleTerminateStaff(staff.id);
                        }
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      Terminate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
