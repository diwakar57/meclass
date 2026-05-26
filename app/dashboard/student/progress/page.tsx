'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { SummaryCard, MetricsGrid, ChartCard } from '@/components/dashboard/dashboard-components';
import { EnhancedLineChart, EnhancedBarChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentProgress');

interface ProgressData {
  overallProgress: number;
  totalModulesCompleted: number;
  totalModules: number;
  progressBySubject: Array<{ label: string; value: number }>;
  recentActivity: Array<{ date: string; activity: string; score?: number }>;
  estimatedCompletionDate?: string;
  currentStreak: number;
  learningPathTimeline: Array<{ label: string; value: number }>;
}

interface ScheduledClassItem {
  id: string;
  topicId: string;
  topicTitle: string;
  scheduledDate?: string;
  isRemediationClass: boolean;
  estimatedDurationMinutes: number;
  status: string;
}

interface SessionItem {
  id: string;
  topicId: string;
  status: string;
  contentUrl?: string;
  createdAt?: string;
}

interface LearningModule extends ScheduledClassItem {
  latestSession?: SessionItem;
}

interface ScheduleResponse {
  success: boolean;
  scheduledClasses?: Array<{
    id: string;
    topicId: string;
    topicTitle?: string;
    scheduledDate?: string;
    isRemediationClass?: boolean;
    estimatedDurationMinutes?: number;
    status?: string;
  }>;
  error?: string;
}

interface SessionListResponse {
  sessions?: Array<{
    id: string;
    topicId?: string;
    status?: string;
    contentUrl?: string;
    createdAt?: string;
  }>;
}

interface SessionGenerateResponse {
  sessionId?: string;
  error?: string;
  details?: string;
}

interface SessionDetailsResponse {
  id?: string;
  contentUrl?: string;
}

function getStatusMeta(status: string, hasSession: boolean) {
  const normalized = status.toLowerCase();

  if (normalized === 'completed') {
    return {
      icon: '✅',
      description: hasSession ? 'Completed and available for review' : 'Completed',
      cardClass: 'bg-green-50 border-green-200',
      actionLabel: 'Review',
      actionClass: 'bg-green-100 text-green-700 hover:bg-green-200',
    };
  }

  if (normalized === 'in_progress' || normalized === 'in-progress' || normalized === 'started') {
    return {
      icon: '📘',
      description: hasSession ? 'Class generated - continue learning' : 'In progress',
      cardClass: 'bg-blue-50 border-blue-200',
      actionLabel: hasSession ? 'Continue' : 'Generate Class',
      actionClass: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    };
  }

  return {
    icon: hasSession ? '▶️' : '⏳',
    description: hasSession ? 'Class generated and ready' : 'Scheduled and ready to generate',
    cardClass: hasSession ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200',
    actionLabel: hasSession ? 'Start' : 'Generate Class',
    actionClass: hasSession
      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
      : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  };
}

export default function StudentProgressPage() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [moduleActionBusy, setModuleActionBusy] = useState<Record<string, boolean>>({});
  const [moduleActionError, setModuleActionError] = useState<string | null>(null);
  const [moduleActionMessage, setModuleActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPageData();
  }, []);

  async function loadPageData() {
    setLoading(true);
    await Promise.all([fetchProgress(), fetchLearningModules()]);
    setLoading(false);
  }

  async function fetchProgress() {
    try {
      const response = await fetch('/api/students/progress', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch progress');
      const data = await response.json();
      setProgress(data.data);
    } catch (err) {
      log.error('Failed to load progress', err);
    }
  }

  async function fetchLearningModules() {
    setModulesLoading(true);

    try {
      const [scheduleResponse, sessionsResponse] = await Promise.all([
        fetch('/api/student/learning-plan/schedule?limit=12&offset=0', { credentials: 'include' }),
        fetch('/api/ai-classroom/sessions?limit=100&offset=0', { credentials: 'include' }),
      ]);

      if (!scheduleResponse.ok) {
        const errorPayload = await scheduleResponse.json().catch(() => null) as ScheduleResponse | null;
        throw new Error(errorPayload?.error || 'Failed to fetch learning modules');
      }

      const schedulePayload = await scheduleResponse.json() as ScheduleResponse;
      const scheduledClasses = Array.isArray(schedulePayload.scheduledClasses)
        ? schedulePayload.scheduledClasses
        : [];

      const normalizedModules: ScheduledClassItem[] = scheduledClasses
        .filter((item) => Boolean(item?.id && item?.topicId))
        .map((item) => ({
          id: String(item.id),
          topicId: String(item.topicId),
          topicTitle: String(item.topicTitle || 'Topic'),
          scheduledDate: item.scheduledDate,
          isRemediationClass: Boolean(item.isRemediationClass),
          estimatedDurationMinutes: Number(item.estimatedDurationMinutes || 45),
          status: String(item.status || 'scheduled'),
        }));

      let sessions: SessionItem[] = [];
      if (sessionsResponse.ok) {
        const sessionPayload = await sessionsResponse.json() as SessionListResponse;
        sessions = Array.isArray(sessionPayload.sessions)
          ? sessionPayload.sessions
              .filter((item): item is Required<Pick<SessionItem, 'id' | 'topicId'>> & SessionItem =>
                Boolean(item?.id && item?.topicId)
              )
              .map((item) => ({
                id: item.id,
                topicId: String(item.topicId),
                status: String(item.status || 'generated'),
                contentUrl: item.contentUrl,
                createdAt: item.createdAt,
              }))
          : [];
      } else {
        log.warn('Failed to load ai sessions list while building module actions');
      }

      const latestSessionByTopic = new Map<string, SessionItem>();
      const sessionsSorted = [...sessions].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      for (const session of sessionsSorted) {
        if (!latestSessionByTopic.has(session.topicId)) {
          latestSessionByTopic.set(session.topicId, session);
        }
      }

      const hydratedModules: LearningModule[] = normalizedModules.map((item) => ({
        ...item,
        latestSession: latestSessionByTopic.get(item.topicId),
      }));

      setModules(hydratedModules);
    } catch (err) {
      log.error('Failed to load learning modules', err);
      setModules([]);
    } finally {
      setModulesLoading(false);
    }
  }

  async function handleGenerateClass(module: LearningModule) {
    setModuleActionError(null);
    setModuleActionMessage(null);
    setModuleActionBusy((prev) => ({ ...prev, [module.id]: true }));

    try {
      const response = await fetch('/api/ai-classroom/sessions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topicId: module.topicId,
          sessionDuration: Math.max(20, module.estimatedDurationMinutes),
          enableVideo: true,
          enableAudio: true,
          enableInteraction: true,
          enableQuiz: true,
        }),
      });

      const payload = await response.json().catch(() => null) as SessionGenerateResponse | null;
      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || 'Failed to generate class session');
      }

      const sessionId = payload?.sessionId;
      if (sessionId) {
        const sessionResponse = await fetch(`/api/ai-classroom/sessions/${sessionId}`, {
          credentials: 'include',
        });

        if (sessionResponse.ok) {
          const session = await sessionResponse.json() as SessionDetailsResponse;
          if (session.contentUrl && typeof window !== 'undefined') {
            window.open(session.contentUrl, '_blank', 'noopener,noreferrer');
          }
        }
      }

      setModuleActionMessage(`Class generated for ${module.topicTitle}.`);
      await fetchLearningModules();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate class';
      setModuleActionError(message);
      log.error('Failed to generate class for module', { moduleId: module.id, error: err });
    } finally {
      setModuleActionBusy((prev) => ({ ...prev, [module.id]: false }));
    }
  }

  function handleReviewClass(module: LearningModule) {
    if (typeof window === 'undefined') {
      return;
    }

    if (module.latestSession?.contentUrl) {
      window.open(module.latestSession.contentUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (module.latestSession?.id) {
      window.open(`/api/ai-classroom/sessions/${module.latestSession.id}/transcript?format=plaintext`, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.assign('/dashboard/student/learning-plan');
  }

  if (loading) {
    return (
      <DashboardLayout title="My Progress" subtitle="Track your learning journey">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!progress) {
    return (
      <DashboardLayout title="My Progress" subtitle="Track your learning journey">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">No progress data available yet. Enroll in a school to get started!</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Progress" subtitle="Track your learning journey and see what's ahead">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Key Metrics */}
          <MetricsGrid columns={4}>
            <SummaryCard
              title="Overall Progress"
              value={`${progress.overallProgress}%`}
              icon="🎯"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Modules Completed"
              value={progress.totalModulesCompleted}
              unit={`/ ${progress.totalModules}`}
              icon="✅"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Current Streak"
              value={progress.currentStreak}
              unit="days"
              icon="🔥"
              backgroundColor="bg-orange-50"
            />
            {progress.estimatedCompletionDate && (
              <SummaryCard
                title="Estimated Completion"
                value={new Date(progress.estimatedCompletionDate).toLocaleDateString()}
                icon="📅"
                backgroundColor="bg-purple-50"
              />
            )}
          </MetricsGrid>

          {/* Progress Overview */}
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-lg font-bold mb-4">Overall Completion</h3>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500"
                style={{ width: `${progress.overallProgress}%` }}
              />
            </div>
            <p className="mt-4 text-sm text-gray-600 text-center">
              {progress.overallProgress}% Complete - Keep going! You're making great progress.
            </p>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Progress Over Time" description="Your learning journey">
              <EnhancedLineChart data={progress.learningPathTimeline} color="#3b82f6" />
            </ChartCard>

            <ChartCard title="Progress by Subject" description="Current mastery levels">
              <EnhancedBarChart data={progress.progressBySubject} color="#10b981" />
            </ChartCard>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {progress.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{activity.activity}</p>
                    <p className="text-sm text-gray-600">{new Date(activity.date).toLocaleDateString()}</p>
                  </div>
                  {activity.score !== undefined && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{activity.score}%</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Module List */}
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-lg font-bold mb-6">Learning Modules</h3>
            {moduleActionError ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {moduleActionError}
              </div>
            ) : null}

            {moduleActionMessage ? (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {moduleActionMessage}
              </div>
            ) : null}

            {modulesLoading ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                Loading learning modules...
              </div>
            ) : modules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                No scheduled modules yet. Your learning modules will appear after a learning plan is generated.
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((module, idx) => {
                  const hasSession = Boolean(module.latestSession?.id);
                  const statusMeta = getStatusMeta(module.status, hasSession);
                  const isBusy = Boolean(moduleActionBusy[module.id]);

                  const details = [
                    module.scheduledDate ? `Scheduled ${new Date(module.scheduledDate).toLocaleDateString()}` : null,
                    `${module.estimatedDurationMinutes} min`,
                    module.isRemediationClass ? 'Reinforcement' : null,
                  ].filter(Boolean).join(' • ');

                  return (
                    <div
                      key={module.id}
                      className={`p-4 rounded-lg border-2 transition ${statusMeta.cardClass}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{statusMeta.icon}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">Module {idx + 1}: {module.topicTitle}</p>
                            <p className="text-sm text-gray-600">{statusMeta.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{details}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (hasSession) {
                              handleReviewClass(module);
                              return;
                            }
                            void handleGenerateClass(module);
                          }}
                          disabled={isBusy}
                          className={`px-4 py-2 rounded text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${statusMeta.actionClass}`}
                        >
                          {isBusy ? 'Generating...' : statusMeta.actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
