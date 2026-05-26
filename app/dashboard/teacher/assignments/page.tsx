'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherAssignments');

interface Assignment {
  id: string;
  title: string;
  className?: string;
  dueDate: string;
  submissionsReceived: number;
  totalStudents: number;
  averageScore?: number;
  status?: string;
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    className: '',
    dueDate: '',
    description: '',
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function fetchAssignments() {
    try {
      const response = await fetch('/api/assignments', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch assignments');
      const data = await response.json();
      setAssignments(data.data || []);
    } catch (err) {
      log.error('Failed to load assignments', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create assignment');
      await fetchAssignments();
      setFormData({ title: '', className: '', dueDate: '', description: '' });
      setShowNewForm(false);
    } catch (err) {
      log.error('Failed to create assignment', err);
    }
  }

  const columns = [
    {
      key: 'title',
      label: 'Assignment',
      render: (value: string, row: Assignment) => (
        <div>
          <p className="font-bold text-gray-900">{value}</p>
          {row.className && <p className="text-sm text-gray-600">{row.className}</p>}
        </div>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'submissionsReceived',
      label: 'Submissions',
      render: (value: number, row: Assignment) => (
        <span className="font-bold">
          {value}/{row.totalStudents}
        </span>
      ),
    },
    {
      key: 'averageScore',
      label: 'Avg Score',
      render: (value: number) => (
        <span className="font-bold text-blue-600">{value ? `${Math.round(value)}%` : 'N/A'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          active: 'bg-blue-100 text-blue-800',
          closed: 'bg-gray-100 text-gray-800',
          grading: 'bg-yellow-100 text-yellow-800',
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
            Grade
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
      <DashboardLayout title="Assignments" subtitle="Create and manage student assignments">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Assignments" subtitle="Create, assign, and grade assignments">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-8">

          {/* Create Assignment Button */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {showNewForm ? 'Cancel' : '+ Create Assignment'}
            </button>
          </div>

          {/* Create Assignment Form */}
          {showNewForm && (
            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-lg font-bold mb-6">Create New Assignment</h3>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Chapter 5 Quiz"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                    <input
                      type="text"
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      placeholder="Select class..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the assignment, guidelines, rubric..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Assignment
                </button>
              </form>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-4xl font-bold mt-2">{assignments.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Avg Submissions</p>
              <p className="text-4xl font-bold mt-2">
                {assignments.length > 0
                  ? Math.round(
                      assignments.reduce((sum, a) => sum + (a.submissionsReceived / a.totalStudents), 0) /
                        assignments.length *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Needs Grading</p>
              <p className="text-4xl font-bold mt-2">
                {assignments.filter((a) => a.status === 'grading').length}
              </p>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="bg-white rounded-lg shadow">
            {assignments.length === 0 ? (
              <div className="p-12 text-center text-gray-600">
                No assignments yet. Click "Create Assignment" to get started.
              </div>
            ) : (
              <DataTable columns={columns} data={assignments} />
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
