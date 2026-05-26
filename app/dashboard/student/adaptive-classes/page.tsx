'use client';

import { useEffect, useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentAdaptiveClassesPage');

interface AdaptiveClass {
  id: string;
  learningPlanId: string;
  topicName: string;
  subtopics: string[];
  objectives: string[];
  difficulty: 'low' | 'medium' | 'high';
  estimatedDurationMinutes: number;
  orderIndex: number;
  paceMultiplier: number;
  scheduledDate: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface Summary {
  totalClasses: number;
  completed: number;
  inProgress: number;
  pending: number;
  estimatedTotalMinutes: number;
  estimatedCompletionDate: string | null;
  currentPaceMultiplier: number;
  nextClass: AdaptiveClass | null;
}

interface ClassesResponse {
  classes: AdaptiveClass[];
  summary: Summary;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export default function StudentAdaptiveClassesPage() {
  const [data, setData] = useState<ClassesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [offset, setOffset] = useState(0);

  const limit = 10;

  async function loadClasses() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/student/adaptive-classes?filter=${filter}&limit=${limit}&offset=${offset}`, {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load adaptive classes');
      }

      setData(payload.data);
    } catch (err) {
      log.error('Failed to load adaptive classes', err);
      setError(err instanceof Error ? err.message : 'Failed to load adaptive classes');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClasses();
  }, [filter, offset]);

  function getDifficultyBadge(difficulty: string) {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-amber-100 text-amber-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  }

  function getStatusBadge(status: string) {
    const colors = {
      pending: 'bg-slate-100 text-slate-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center py-12">
            <p className="text-slate-600">Loading your adaptive classes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Adaptive Learning Classes</h1>
          <p className="text-slate-600 mt-1">Personalized class schedule based on your learning pace</p>
        </div>

        {/* Quick Stats */}
        {data?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-600 uppercase">Total Classes</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.totalClasses}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-600 uppercase">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{data.summary.completed}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-600 uppercase">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{data.summary.inProgress}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-600 uppercase">Learning Pace</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.currentPaceMultiplier.toFixed(1)}x</p>
            </div>
          </div>
        )}

        {/* Next Class Preview */}
        {data?.summary?.nextClass && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm p-6">
            <p className="text-xs font-semibold text-blue-700 uppercase">Next Class</p>
            <h2 className="text-2xl font-bold text-blue-900 mt-2">{data.summary.nextClass.topicName}</h2>
            <p className="text-sm text-blue-700 mt-2">
              Scheduled for {formatDate(data.summary.nextClass.scheduledDate)} •{' '}
              {formatDuration(data.summary.nextClass.estimatedDurationMinutes)}
            </p>
            <div className="mt-3 flex gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getDifficultyBadge(data.summary.nextClass.difficulty)}`}>
                {data.summary.nextClass.difficulty} difficulty
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(data.summary.nextClass.status)}`}>
                {data.summary.nextClass.status}
              </span>
            </div>
          </div>
        )}

        {/* Completion Estimate */}
        {data?.summary?.estimatedCompletionDate && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏁</div>
              <div>
                <p className="text-sm font-medium text-emerald-900">Estimated Completion</p>
                <p className="text-sm text-emerald-700">
                  All classes should be completed by {formatDate(data.summary.estimatedCompletionDate)} at your current pace
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Classes List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {/* Filters */}
          <div className="border-b border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              {(['all', 'pending', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setOffset(0);
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => void loadClasses()}
              className="px-3 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading classes...</div>
          ) : !data?.classes || data.classes.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              <p className="mb-2">No classes found.</p>
              <p className="text-sm">Check with your teacher to generate classes from the syllabus.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {data.classes.map((cls, idx) => (
                <div key={cls.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                          {String(cls.orderIndex).padStart(2, '0')}
                        </span>
                        <h3 className="text-lg font-medium text-slate-900">{cls.topicName}</h3>
                      </div>

                      {cls.objectives.length > 0 && (
                        <div className="mt-2 ml-11">
                          <p className="text-xs font-medium text-slate-600 uppercase mb-1">Learning Objectives</p>
                          <ul className="space-y-1">
                            {cls.objectives.slice(0, 2).map((obj, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>{obj}</span>
                              </li>
                            ))}
                            {cls.objectives.length > 2 && (
                              <li className="text-sm text-slate-500">
                                +{cls.objectives.length - 2} more objectives
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3 ml-11 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getDifficultyBadge(cls.difficulty)}`}>
                          {cls.difficulty} difficulty
                        </span>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(cls.status)}`}>
                          {cls.status}
                        </span>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                          {formatDuration(cls.estimatedDurationMinutes)}
                        </span>
                        {cls.paceMultiplier !== 1 && (
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700">
                            {cls.paceMultiplier < 1 ? '🐢' : '🚀'} {cls.paceMultiplier.toFixed(1)}x pace
                          </span>
                        )}
                      </div>

                      <div className="mt-3 ml-11 text-sm text-slate-600">
                        Scheduled: {formatDate(cls.scheduledDate)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.total > limit && (
            <div className="border-t border-slate-200 p-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {offset + 1} to {Math.min(offset + limit, data.pagination.total)} of {data.pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={!data.pagination.hasMore}
                  className="px-3 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-sm text-blue-900">
          <p className="font-medium mb-2">ℹ️ About Your Adaptive Classes</p>
          <ul className="space-y-1 ml-4 list-disc text-blue-800">
            <li>Classes are personalized based on your learning pace and diagnostic profile</li>
            <li>Pace multiplier shows if content is accelerated or extended for you</li>
            <li>Complete classes sequentially for best learning outcomes</li>
            <li>Your progress helps adjust future class difficulty</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
