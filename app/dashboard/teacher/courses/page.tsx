'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherCoursesPage');

interface Course {
  id: string;
  title: string;
  description?: string;
  gradeId: string;
  subjectId: string;
  status: 'draft' | 'published' | 'archived' | string;
  startDate: string;
  endDate: string;
  totalEstimatedSessions: number;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }
  return parsed.toLocaleDateString();
}

function statusClass(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-700';
    case 'draft':
      return 'bg-amber-100 text-amber-700';
    case 'archived':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/teacher/courses?limit=100', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch courses');
      }

      setCourses(Array.isArray(payload.courses) ? payload.courses : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch courses';
      log.error('Failed to fetch teacher courses', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const publishedCount = useMemo(
    () => courses.filter((course) => course.status === 'published').length,
    [courses]
  );

  const draftCount = useMemo(
    () => courses.filter((course) => course.status === 'draft').length,
    [courses]
  );

  return (
    <DashboardLayout title="Course Management" subtitle="Create and manage curriculum courses">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Courses</h2>
              <p className="text-sm text-gray-600">Track all teacher-owned courses in one place.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void fetchCourses()}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Refresh
              </button>
              <Link
                href="/dashboard/teacher/courses/new"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Create Course
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{courses.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="mt-2 text-3xl font-bold text-green-700">{publishedCount}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{draftCount}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-gray-600">Loading courses...</div>
            ) : courses.length === 0 ? (
              <div className="p-10 text-center text-gray-600">
                <p className="mb-3">No courses found yet.</p>
                <Link
                  href="/dashboard/teacher/courses/new"
                  className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create your first course
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Course</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Grade / Subject</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Duration</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Sessions</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{course.title}</p>
                          <p className="mt-1 text-xs text-gray-500">{course.description || 'No description'}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          <div>{course.gradeId || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{course.subjectId || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {formatDate(course.startDate)} - {formatDate(course.endDate)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {Number(course.totalEstimatedSessions || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(course.status)}`}>
                            {course.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href="/dashboard/teacher/syllabus"
                            className="text-sm font-medium text-blue-700 hover:text-blue-800"
                          >
                            Manage Syllabus
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
