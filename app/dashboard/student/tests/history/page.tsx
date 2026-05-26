'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentTestHistoryPage');

type Attempt = {
  id: string;
  title?: string;
  score?: number;
  maxScore?: number;
  status?: string;
  completedAt?: string;
};

export default function StudentTestHistoryPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setError(null);
        const response = await fetch('/api/test-attempts?limit=100&offset=0', { credentials: 'include' });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load test history');
        }
        setAttempts(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        log.error('Failed to load test history', err);
        setError(err instanceof Error ? err.message : 'Failed to load test history');
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, []);

  return (
    <DashboardLayout title="Test History" subtitle="Track all completed and in-progress tests">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

          {loading ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-600">Loading history...</div>
          ) : (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-600">
                      <th className="py-2">Test</th>
                      <th className="py-2">Score</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="border-b">
                        <td className="py-2 font-medium text-gray-900">{attempt.title || 'Test Attempt'}</td>
                        <td className="py-2 text-gray-700">
                          {typeof attempt.score === 'number' && typeof attempt.maxScore === 'number'
                            ? `${attempt.score}/${attempt.maxScore}`
                            : typeof attempt.score === 'number'
                              ? `${attempt.score}%`
                              : 'N/A'}
                        </td>
                        <td className="py-2 text-gray-700">{attempt.status || 'unknown'}</td>
                        <td className="py-2 text-gray-700">
                          {attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
