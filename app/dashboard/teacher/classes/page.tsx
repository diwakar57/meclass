'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherClasses');

interface Class {
  id: string;
  name: string;
  subject?: string;
  gradeLevel?: string;
  studentCount: number;
  scheduleType?: string;
  status?: string;
}

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', gradeLevel: '' });

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      const response = await fetch('/api/teacher/classes', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch classes');
      const data = await response.json();
      setClasses(data.data || []);
    } catch (err) {
      log.error('Failed to load classes', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create class');
      await fetchClasses();
      setFormData({ name: '', subject: '', gradeLevel: '' });
      setShowNewForm(false);
    } catch (err) {
      log.error('Failed to create class', err);
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Class Name',
      render: (value: string, row: Class) => (
        <div>
          <p className="font-bold text-gray-900">{value}</p>
          {row.subject && <p className="text-sm text-gray-600">{row.subject}</p>}
        </div>
      ),
    },
    {
      key: 'gradeLevel',
      label: 'Grade',
      render: (value: string) => value || 'N/A',
    },
    {
      key: 'studentCount',
      label: 'Students',
      render: (value: number) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'scheduleType',
      label: 'Schedule',
      render: (value: string) => value || 'N/A',
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value: string) => (
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
            Manage
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
      <DashboardLayout title="My Classes" subtitle="Manage your classes and student rosters">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Classes" subtitle="Create and manage your classes">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-8">

          {/* Create Class Button */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {showNewForm ? 'Cancel' : '+ Create New Class'}
            </button>
          </div>

          {/* Create Class Form */}
          {showNewForm && (
            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-lg font-bold mb-6">Create New Class</h3>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Class Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Biology 101"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Biology"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                    <input
                      type="text"
                      value={formData.gradeLevel}
                      onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                      placeholder="e.g., 10th Grade"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Class
                </button>
              </form>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-4xl font-bold mt-2">{classes.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-4xl font-bold mt-2">{classes.reduce((sum, c) => sum + c.studentCount, 0)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Avg Class Size</p>
              <p className="text-4xl font-bold mt-2">
                {classes.length > 0
                  ? Math.round(classes.reduce((sum, c) => sum + c.studentCount, 0) / classes.length)
                  : 0}
              </p>
            </div>
          </div>

          {/* Classes Table */}
          <div className="bg-white rounded-lg shadow">
            {classes.length === 0 ? (
              <div className="p-12 text-center text-gray-600">
                No classes created yet. Click "Create New Class" to get started.
              </div>
            ) : (
              <DataTable columns={columns} data={classes} />
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
