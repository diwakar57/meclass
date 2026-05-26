'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminSchools');

interface School {
  id: string;
  name: string;
  email: string;
  location?: string;
  studentCount: number;
  teacherCount: number;
  subscriptionPlan?: string;
  billingStatus?: string;
  createdAt: string;
  status?: string;
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchSchools();
  }, []);

  async function fetchSchools() {
    try {
      const response = await fetch('/api/saas/schools', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch schools');
      const data = await response.json();
      setSchools(data.data || []);
    } catch (err) {
      log.error('Failed to load schools', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredSchools = schools.filter((school) => {
    if (filterStatus === 'all') return true;
    return school.status === filterStatus;
  });

  const columns = [
    {
      key: 'name',
      label: 'School Name',
      render: (value: string, row: School) => (
        <div>
          <p className="font-bold text-blue-600">{value}</p>
          <p className="text-sm text-gray-600">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (value: string) => value || 'N/A',
    },
    {
      key: 'studentCount',
      label: 'Students',
      render: (value: number) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'teacherCount',
      label: 'Teachers',
      render: (value: number) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'subscriptionPlan',
      label: 'Plan',
      render: (value: string) => <span className="capitalize font-medium">{value || 'Free'}</span>,
    },
    {
      key: 'billingStatus',
      label: 'Billing',
      render: (value: string) => {
        const colors: any = {
          active: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          overdue: 'bg-red-100 text-red-800',
          inactive: 'bg-gray-100 text-gray-800',
        };
        const colorClass = colors[value?.toLowerCase()] || 'bg-gray-100 text-gray-800';
        return <span className={`px-3 py-1 rounded-full text-sm ${colorClass}`}>{value || 'Active'}</span>;
      },
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value: string) => (
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
            View
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Schools Management" subtitle="Manage schools and subscriptions">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);
  const totalTeachers = schools.reduce((sum, s) => sum + s.teacherCount, 0);
  const activeSubscriptions = schools.filter((s) => s.billingStatus === 'active').length;

  return (
    <DashboardLayout title="Schools Management" subtitle="Manage all schools on the platform">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Schools</p>
              <p className="text-4xl font-bold mt-2">{schools.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Active Subscriptions</p>
              <p className="text-4xl font-bold mt-2 text-green-600">{activeSubscriptions}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-4xl font-bold mt-2">{totalStudents.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Teachers</p>
              <p className="text-4xl font-bold mt-2">{totalTeachers.toLocaleString()}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg transition font-medium ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Schools
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg transition font-medium ${
                  filterStatus === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg transition font-medium ${
                  filterStatus === 'pending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending Approval
              </button>
              <button
                onClick={() => setFilterStatus('suspended')}
                className={`px-4 py-2 rounded-lg transition font-medium ${
                  filterStatus === 'suspended'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Suspended
              </button>
            </div>
          </div>

          {/* Schools Table */}
          <div className="bg-white rounded-lg shadow">
            {filteredSchools.length === 0 ? (
              <div className="p-12 text-center text-gray-600">
                No schools found with the selected filter.
              </div>
            ) : (
              <DataTable columns={columns} data={filteredSchools} />
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
