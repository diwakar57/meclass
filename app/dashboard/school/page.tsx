/**
 * School Principal/Admin Dashboard
 * /app/dashboard/school/page.tsx
 * 
 * View and manage school: staff, students, join requests
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';
import { SchoolDashboardData, StudentJoinRequest } from '@/lib/models/entity-models';

const log = createLogger('SchoolDashboard');

export default function SchoolDashboard() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<SchoolDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'students' | 'requests'>('overview');
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    staffRole: 'TEACHER',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSchoolId(params.get('schoolId'));
  }, []);

  useEffect(() => {
    if (schoolId) {
      loadDashboard();
    }
  }, [schoolId]);

  async function loadDashboard() {
    if (!schoolId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/schools/${schoolId}/dashboard`);

      if (!response.ok) {
        throw new Error('Failed to load dashboard');
      }

      const data = await response.json();
      setDashboard(data.data);
    } catch (err: any) {
      log.error('Error loading dashboard', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStaff() {
    if (!schoolId) return;

    try {
      const response = await fetch(`/api/schools/${schoolId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create staff');
      }

      setStaffForm({ email: '', password: '', firstName: '', lastName: '', staffRole: 'TEACHER' });
      setShowStaffForm(false);
      await loadDashboard();

      log.info('Staff member created');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleApproveRequest(requestId: string) {
    if (!schoolId) return;

    try {
      const response = await fetch(`/api/schools/${schoolId}/join-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      await loadDashboard();
      log.info(`Approved join request: ${requestId}`);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleRejectRequest(requestId: string) {
    if (!schoolId) return;

    const reason = prompt('Enter rejection reason (optional):');

    try {
      const response = await fetch(`/api/schools/${schoolId}/join-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      await loadDashboard();
      log.info(`Rejected join request: ${requestId}`);
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  if (!dashboard) {
    return <div className="p-8 text-red-600">Failed to load school dashboard</div>;
  }

  const stats = dashboard.stats || {
    totalStudents: 0,
    approvedStudents: 0,
    pendingRequests: 0,
    staffCount: 0,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dashboard.school.name}</h1>
        <p className="text-gray-600">{dashboard.school.domain}</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-blue-50 rounded-lg border">
          <p className="text-sm text-gray-600">Total Students</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border">
          <p className="text-sm text-gray-600">Staff Members</p>
          <p className="text-3xl font-bold text-green-600">{stats.staffCount}</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg border">
          <p className="text-sm text-gray-600">Pending Requests</p>
          <p className="text-3xl font-bold text-orange-600">{stats.pendingRequests}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border">
          <p className="text-sm text-gray-600">Subscription</p>
          <p className="text-xl font-bold text-purple-600">{dashboard.school.subscriptionTier}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        {(['overview', 'staff', 'students', 'requests'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'requests' ? `Join Requests (${stats.pendingRequests})` : tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="p-6 bg-white rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">School Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-600">Domain</dt>
                <dd className="text-lg">{dashboard.school.domain || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Max Students</dt>
                <dd className="text-lg">{dashboard.school.maxStudents}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Max Teachers</dt>
                <dd className="text-lg">{dashboard.school.maxTeachers}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Created</dt>
                <dd className="text-lg">{new Date(dashboard.school.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowStaffForm(!showStaffForm)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showStaffForm ? 'Cancel' : 'Add Staff'}
            </button>
          </div>

          {showStaffForm && (
            <div className="p-6 bg-gray-50 rounded-lg border mb-4">
              <h3 className="text-lg font-semibold mb-4">Create New Staff Member</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="First Name"
                  value={staffForm.firstName}
                  onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={staffForm.lastName}
                  onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <select
                  value={staffForm.staffRole}
                  onChange={(e) => setStaffForm({ ...staffForm, staffRole: e.target.value })}
                  className="col-span-2 px-3 py-2 border rounded"
                >
                  <option value="TEACHER">Teacher</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ACCOUNTANT">Accountant</option>
                </select>
                <button
                  onClick={handleCreateStaff}
                  className="col-span-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Create Staff Member
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {dashboard.staff?.map((staff: any) => (
              <div key={staff.id} className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold">{staff.name}</h4>
                <p className="text-sm text-gray-600">{staff.email}</p>
                <p className="text-sm text-gray-600">Role: {staff.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="grid gap-4">
          {dashboard.students?.map((student: any) => (
            <div key={student.id} className="p-4 bg-white rounded-lg border">
              <h4 className="font-semibold">{student.email}</h4>
              <p className="text-sm text-gray-600">Status: {student.status}</p>
            </div>
          ))}
          {dashboard.students?.length === 0 && (
            <p className="text-gray-600">No approved students yet.</p>
          )}
        </div>
      )}

      {/* Join Requests Tab */}
      {activeTab === 'requests' && (
        <div className="grid gap-4">
          {dashboard.pendingJoinRequests?.map((request: StudentJoinRequest) => (
            <div key={request.id} className="p-4 bg-white rounded-lg border">
              <p className="font-semibold mb-2">Student ID: {request.studentId}</p>
              {request.message && <p className="text-sm text-gray-600 mb-3">{request.message}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveRequest(request.id)}
                  className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleRejectRequest(request.id)}
                  className="flex-1 px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {dashboard.pendingJoinRequests?.length === 0 && (
            <p className="text-gray-600">No pending join requests.</p>
          )}
        </div>
      )}
    </div>
  );
}
