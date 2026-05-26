'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentGradesPage');

type AssignmentGrade = {
  title: string;
  className: string;
  score: number;
  maxScore: number;
  percent: number;
  submittedAt: string | null;
};

type ChapterTest = {
  title: string;
  subject: string;
  score: number;
  completedAt: string | null;
};

type GradesPayload = {
  summary: {
    assignmentAverage: number;
    chapterTestAverage: number;
    overallAverage: number;
    gradedAssignments: number;
    chapterTestsTaken: number;
  };
  assignmentGrades: AssignmentGrade[];
  chapterTests: ChapterTest[];
};

export default function StudentGradesPage() {
  const [data, setData] = useState<GradesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGrades() {
      try {
        setError(null);
        const response = await fetch('/api/student/grades', { credentials: 'include' });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load grade sheet');
        }
        setData(payload.data);
      } catch (err) {
        log.error('Failed to load grade sheet', err);
        setError(err instanceof Error ? err.message : 'Failed to load grade sheet');
      } finally {
        setLoading(false);
      }
    }

    void loadGrades();
  }, []);

  return (
    <DashboardLayout title="Grade Sheet" subtitle="Assignments and chapter-wise test performance">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

          {loading ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-600">Loading grade sheet...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Overall Avg</p><p className="mt-2 text-2xl font-bold text-blue-700">{data?.summary.overallAverage || 0}%</p></div>
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Assignment Avg</p><p className="mt-2 text-2xl font-bold text-green-700">{data?.summary.assignmentAverage || 0}%</p></div>
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Chapter Test Avg</p><p className="mt-2 text-2xl font-bold text-purple-700">{data?.summary.chapterTestAverage || 0}%</p></div>
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Graded Assignments</p><p className="mt-2 text-2xl font-bold">{data?.summary.gradedAssignments || 0}</p></div>
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Tests Taken</p><p className="mt-2 text-2xl font-bold">{data?.summary.chapterTestsTaken || 0}</p></div>
              </div>

              <section className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-bold text-gray-900">Assignment Grades</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="py-2">Assignment</th>
                        <th className="py-2">Class</th>
                        <th className="py-2">Score</th>
                        <th className="py-2">Percent</th>
                        <th className="py-2">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.assignmentGrades || []).map((item, idx) => (
                        <tr key={`${item.title}-${idx}`} className="border-b">
                          <td className="py-2 font-medium text-gray-900">{item.title}</td>
                          <td className="py-2 text-gray-700">{item.className}</td>
                          <td className="py-2 text-gray-700">{item.score}/{item.maxScore}</td>
                          <td className="py-2 font-semibold text-blue-700">{item.percent}%</td>
                          <td className="py-2 text-gray-700">{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-bold text-gray-900">Chapter-wise Tests</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="py-2">Test</th>
                        <th className="py-2">Subject</th>
                        <th className="py-2">Score</th>
                        <th className="py-2">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.chapterTests || []).map((item, idx) => (
                        <tr key={`${item.title}-${idx}`} className="border-b">
                          <td className="py-2 font-medium text-gray-900">{item.title}</td>
                          <td className="py-2 text-gray-700">{item.subject}</td>
                          <td className="py-2 font-semibold text-purple-700">{item.score}%</td>
                          <td className="py-2 text-gray-700">{item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
