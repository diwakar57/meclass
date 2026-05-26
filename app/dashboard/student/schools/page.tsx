'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { SummaryCard, MetricsGrid, ChartCard, DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentSchools');

interface School {
  id: string;
  name: string;
  location?: string;
  studentCount?: number;
  teacherCount?: number;
  status?: string;
}

export default function StudentSchoolsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'enrolled' | 'discover'>('enrolled');
  const [enrolledSchools, setEnrolledSchools] = useState<School[]>([]);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [joiningSchool, setJoiningSchool] = useState<string | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'discover') {
      setTab('discover');
    } else if (tabParam === 'enrolled') {
      setTab('enrolled');
    }
  }, [searchParams]);

  async function fetchSchools() {
    try {
      const [enrolledRes, discoverRes] = await Promise.all([
        fetch('/api/student/schools', { credentials: 'include' }),
        fetch('/api/student/schools/discover', { credentials: 'include' }),
      ]);

      if (enrolledRes.ok) {
        const data = await enrolledRes.json();
        setEnrolledSchools(data.data || []);
      }

      if (discoverRes.ok) {
        const data = await discoverRes.json();
        setAvailableSchools(data.data || []);
      }
    } catch (err) {
      log.error('Failed to load schools', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinSchool(schoolId: string) {
    setJoiningSchool(schoolId);
    try {
      const response = await fetch(`/api/student/schools/${schoolId}/join`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to join school');
      await fetchSchools();
    } catch (err) {
      log.error('Failed to join school', err);
    } finally {
      setJoiningSchool(null);
    }
  }

  const filteredSchools = availableSchools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Schools & Classes" subtitle="Manage your school enrollments">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Schools & Classes" subtitle="Explore schools and manage your enrollments">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setTab('enrolled')}
              className={`px-6 py-3 rounded-lg font-medium ${
                tab === 'enrolled'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Enrolled Schools ({enrolledSchools.length})
            </button>
            <button
              onClick={() => setTab('discover')}
              className={`px-6 py-3 rounded-lg font-medium ${
                tab === 'discover'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Discover Schools ({availableSchools.length})
            </button>
          </div>

          {/* Enrolled Schools Tab */}
          {tab === 'enrolled' && (
            <div className="space-y-6">
              {enrolledSchools.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center">
                  <p className="text-gray-600 mb-4">You haven't enrolled in any schools yet</p>
                  <button
                    onClick={() => setTab('discover')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Find Schools
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {enrolledSchools.map((school) => (
                    <div key={school.id} className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold text-gray-900">{school.name}</h3>
                      {school.location && (
                        <p className="text-sm text-gray-600 mt-1">📍 {school.location}</p>
                      )}
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {school.studentCount !== undefined && (
                          <div>
                            <p className="text-xs text-gray-600">Students</p>
                            <p className="text-xl font-bold">{school.studentCount}</p>
                          </div>
                        )}
                        {school.teacherCount !== undefined && (
                          <div>
                            <p className="text-xs text-gray-600">Teachers</p>
                            <p className="text-xl font-bold">{school.teacherCount}</p>
                          </div>
                        )}
                      </div>
                      <button className="mt-4 w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                        View Classes
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Discover Schools Tab */}
          {tab === 'discover' && (
            <div className="space-y-6">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search schools by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {filteredSchools.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center">
                  <p className="text-gray-600">No schools found matching your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredSchools.map((school) => (
                    <div key={school.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                      <h3 className="text-lg font-bold text-gray-900">{school.name}</h3>
                      {school.location && (
                        <p className="text-sm text-gray-600 mt-1">📍 {school.location}</p>
                      )}
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {school.studentCount !== undefined && (
                          <div>
                            <p className="text-xs text-gray-600">Students</p>
                            <p className="text-xl font-bold">{school.studentCount}</p>
                          </div>
                        )}
                        {school.teacherCount !== undefined && (
                          <div>
                            <p className="text-xs text-gray-600">Teachers</p>
                            <p className="text-xl font-bold">{school.teacherCount}</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleJoinSchool(school.id)}
                        disabled={joiningSchool === school.id}
                        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {joiningSchool === school.id ? 'Joining...' : 'Request to Join'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
