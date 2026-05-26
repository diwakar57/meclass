'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentCoursesPage');

type Course = {
  id: string;
  name: string;
  gradeLevel: string;
  description: string;
  teacherName: string;
  studentCount: number;
  enrolled: boolean;
  enrolledAt: string | null;
};

type CoursesPayload = {
  enrolledCourses: Course[];
  availableCourses: Course[];
  summary: {
    totalCourses: number;
    enrolledCount: number;
    availableCount: number;
  };
};

export default function StudentCoursesPage() {
  const [data, setData] = useState<CoursesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);

  async function loadCourses() {
    try {
      setError(null);
      const response = await fetch('/api/student/courses', { credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load courses');
      }
      setData(payload.data);
    } catch (err) {
      log.error('Failed to load courses', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function enroll(courseId: string) {
    try {
      setEnrollingCourseId(courseId);
      const response = await fetch('/api/student/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ classId: courseId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to enroll in course');
      }
      await loadCourses();
    } catch (err) {
      log.error('Failed to enroll in course', err);
      setError(err instanceof Error ? err.message : 'Failed to enroll in course');
    } finally {
      setEnrollingCourseId(null);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  return (
    <DashboardLayout title="Courses" subtitle="Enroll in classes and track your coursework">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

          {loading ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-600">Loading courses...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-white p-6 shadow">
                  <p className="text-sm text-gray-600">Total Courses</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{data?.summary.totalCourses || 0}</p>
                </div>
                <div className="rounded-lg bg-white p-6 shadow">
                  <p className="text-sm text-gray-600">Enrolled</p>
                  <p className="mt-2 text-3xl font-bold text-green-700">{data?.summary.enrolledCount || 0}</p>
                </div>
                <div className="rounded-lg bg-white p-6 shadow">
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="mt-2 text-3xl font-bold text-blue-700">{data?.summary.availableCount || 0}</p>
                </div>
              </div>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">My Enrolled Courses</h2>
                {(data?.enrolledCourses || []).length === 0 ? (
                  <div className="rounded-lg bg-white p-6 text-gray-600 shadow">No enrolled courses yet.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {(data?.enrolledCourses || []).map((course) => (
                      <article key={course.id} className="rounded-lg bg-white p-6 shadow">
                        <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">Grade: {course.gradeLevel}</p>
                        <p className="mt-2 text-sm text-gray-700">{course.description}</p>
                        <p className="mt-3 text-sm text-gray-600">Instructor: {course.teacherName}</p>
                        <p className="mt-1 text-sm text-gray-600">Students: {course.studentCount}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Available Courses</h2>
                {(data?.availableCourses || []).length === 0 ? (
                  <div className="rounded-lg bg-white p-6 text-gray-600 shadow">No additional courses available right now.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {(data?.availableCourses || []).map((course) => (
                      <article key={course.id} className="rounded-lg bg-white p-6 shadow">
                        <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">Grade: {course.gradeLevel}</p>
                        <p className="mt-2 text-sm text-gray-700">{course.description}</p>
                        <p className="mt-3 text-sm text-gray-600">Instructor: {course.teacherName}</p>
                        <p className="mt-1 text-sm text-gray-600">Students: {course.studentCount}</p>
                        <button
                          onClick={() => enroll(course.id)}
                          disabled={enrollingCourseId === course.id}
                          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        >
                          {enrollingCourseId === course.id ? 'Enrolling...' : 'Enroll to Course'}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
