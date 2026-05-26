'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentAssignmentsPage');

type Assignment = {
  id: string;
  title: string;
  description: string;
  className: string;
  dueDate: string | null;
  maxScore: number;
  assignmentStatus: string;
  submissionStatus: string;
  score: number | null;
  submittedAt: string | null;
  feedback: string | null;
};

type AssignmentsPayload = {
  assignments: Assignment[];
  summary: {
    total: number;
    submitted: number;
    pending: number;
    graded: number;
  };
};

export default function StudentAssignmentsPage() {
  const [data, setData] = useState<AssignmentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitForId, setSubmitForId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  async function loadAssignments() {
    try {
      setError(null);
      const response = await fetch('/api/student/assignments', { credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.detail || payload?.error || 'Failed to load assignments');
      }
      setData(payload.data);
    } catch (err) {
      log.error('Failed to load assignments', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitAssignment(event: FormEvent) {
    event.preventDefault();
    if (!submitForId) return;

    try {
      setError(null);
      const formData = new FormData();
      formData.append('notes', notes);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(`/api/student/assignments/${submitForId}/submit`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.detail || payload?.error || 'Failed to submit assignment');
      }

      setSubmitForId(null);
      setNotes('');
      setFile(null);
      await loadAssignments();
    } catch (err) {
      log.error('Failed to submit assignment', err);
      setError(err instanceof Error ? err.message : 'Failed to submit assignment');
    }
  }

  useEffect(() => {
    void loadAssignments();
  }, []);

  return (
    <DashboardLayout title="Assignments" subtitle="Course-wise classwork and dropbox submissions">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

          {loading ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-600">Loading assignments...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Total</p><p className="mt-2 text-2xl font-bold">{data?.summary.total || 0}</p></div>
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Submitted</p><p className="mt-2 text-2xl font-bold text-blue-700">{data?.summary.submitted || 0}</p></div>
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Pending</p><p className="mt-2 text-2xl font-bold text-orange-700">{data?.summary.pending || 0}</p></div>
                <div className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-gray-600">Graded</p><p className="mt-2 text-2xl font-bold text-green-700">{data?.summary.graded || 0}</p></div>
              </div>

              <div className="space-y-4">
                {(data?.assignments || []).map((assignment) => (
                  <article key={assignment.id} className="rounded-lg bg-white p-6 shadow">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{assignment.title}</h3>
                        <p className="text-sm text-gray-600">{assignment.className}</p>
                        <p className="mt-2 text-sm text-gray-700">{assignment.description}</p>
                        <p className="mt-2 text-sm text-gray-600">Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</p>
                        <p className="text-sm text-gray-600">Max Score: {assignment.maxScore}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold text-gray-900">{assignment.submissionStatus}</p>
                        {assignment.score !== null ? <p className="mt-1 text-sm text-green-700">Score: {assignment.score}/{assignment.maxScore}</p> : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setSubmitForId(assignment.id)}
                        disabled={['submitted', 'graded'].includes(assignment.submissionStatus)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {['submitted', 'graded'].includes(assignment.submissionStatus) ? 'Already Submitted' : 'Open Dropbox'}
                      </button>
                    </div>
                  </article>
                ))}

                {(data?.assignments || []).length === 0 ? (
                  <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow">No assignments found for your enrolled classes.</div>
                ) : null}
              </div>

              {submitForId ? (
                <form onSubmit={submitAssignment} className="rounded-lg border border-blue-200 bg-white p-6 shadow">
                  <h3 className="text-lg font-bold text-gray-900">Assignment Dropbox</h3>
                  <p className="mt-1 text-sm text-gray-600">Submit your file and notes for teacher review.</p>

                  <div className="mt-4 space-y-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Add submission notes..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />

                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />

                    <div className="flex gap-3">
                      <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white">Submit Assignment</button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitForId(null);
                          setNotes('');
                          setFile(null);
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
