'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  SummaryCard, MetricsGrid, ChartCard, EmptyState
} from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart, EnhancedBarChart, EnhancedDonutChart
} from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentDashboard');

interface StudentAnalytics {
  overallProgress: number;
  schoolCount: number;
  personalProgressOverTime: Array<{ label: string; value: number }>;
  masteryByTopic: Array<{ label: string; value: number }>;
  completedVsPendingLessons: { completed: number; pending: number };
  quizScoreHistory: Array<{ label: string; value: number }>;
  confidenceVsPerformance: { confidence: number; performance: number };
  streakAndActivity: { totalAttempts: number; recentAttempts: number };
  learningDNA: {
    paceType: string;
    mistakeType: string;
    preferredStyle: string;
    confidenceScore: number;
  };
  streakStatus: { currentStreak: number; bestStreak: number };
}

export default function StudentDashboard() {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setError(null);
        const response = await fetch('/api/student/analytics', { credentials: 'include' });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Failed to fetch dashboard analytics');
        }
        const data = await response.json();
        setAnalytics(data.data);
      } catch (err) {
        log.error('Failed to load analytics', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="h-28 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-28 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-28 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-28 animate-pulse rounded-lg bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-80 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!analytics) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <EmptyState title="No data available" description={error || 'Check back soon'} />
        </div>
      </main>
    );
  }

  const sortedByMastery = [...analytics.masteryByTopic].sort((a, b) => b.value - a.value);
  const strongestTopics = sortedByMastery.slice(0, 3);
  const focusTopics = [...analytics.masteryByTopic].sort((a, b) => a.value - b.value).slice(0, 3);
  const compactTopicBars = analytics.masteryByTopic.slice(0, 8).map((topic) => ({
    label: topic.label.length > 14 ? `${topic.label.slice(0, 14)}...` : topic.label,
    value: topic.value,
  }));
  const confidencePerformanceSeries = [
    { label: 'Confidence', value: analytics.confidenceVsPerformance.confidence },
    { label: 'Performance', value: analytics.confidenceVsPerformance.performance },
  ];
  const quizAverage =
    analytics.quizScoreHistory.length > 0
      ? Math.round(
          analytics.quizScoreHistory.reduce((sum, point) => sum + Number(point.value || 0), 0) /
            analytics.quizScoreHistory.length
        )
      : 0;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-4xl font-bold text-gray-900">My Learning Dashboard</h1>
          <p className="text-gray-600 mt-2">Track progress, close learning gaps, and stay exam-ready.</p>
        </header>

        {error ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Showing the most recent available data. Latest refresh issue: {error}
          </div>
        ) : null}

        {/* Key Metrics */}
        <MetricsGrid columns={4}>
          <SummaryCard
            title="Overall Progress"
            value={`${Math.round(analytics.overallProgress)}%`}
            icon="🎯"
            backgroundColor="bg-blue-50"
          />
          <SummaryCard
            title="Schools Enrolled"
            value={analytics.schoolCount}
            unit="active"
            icon="🏫"
            backgroundColor="bg-green-50"
          />
          <SummaryCard
            title="Current Streak"
            value={analytics.streakStatus.currentStreak}
            unit="days"
            icon="🔥"
            backgroundColor="bg-orange-50"
          />
          <SummaryCard
            title="Confidence Score"
            value={`${Math.round(analytics.learningDNA.confidenceScore)}/100`}
            icon="⭐"
            backgroundColor="bg-purple-50"
          />
        </MetricsGrid>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard title="Action Center" description="Quick links for your next study action">
            <div className="grid grid-cols-1 gap-3">
              <Link href="/dashboard/student/courses" className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100">Browse Courses</Link>
              <Link href="/dashboard/student/assignments" className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100">Open Assignment Dropbox</Link>
              <Link href="/dashboard/student/grades" className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100">View Grade Sheet</Link>
              <Link href="/dashboard/student/tests" className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100">Take/Review Tests</Link>
            </div>
          </ChartCard>

          <ChartCard title="Strongest Topics" description="Highest mastery scores">
            <div className="space-y-3">
              {strongestTopics.length === 0 ? (
                <p className="text-sm text-gray-500">No mastery data yet.</p>
              ) : (
                strongestTopics.map((topic) => (
                  <div key={topic.label} className="rounded-lg border border-green-100 bg-green-50 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{topic.label}</p>
                    <p className="text-xs font-semibold text-green-700">{Math.round(topic.value)}% mastered</p>
                  </div>
                ))
              )}
            </div>
          </ChartCard>

          <ChartCard title="Needs Attention" description="Topics to prioritize this week">
            <div className="space-y-3">
              {focusTopics.length === 0 ? (
                <p className="text-sm text-gray-500">No weak topics detected.</p>
              ) : (
                focusTopics.map((topic) => (
                  <div key={topic.label} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{topic.label}</p>
                    <p className="text-xs font-semibold text-orange-700">{Math.round(topic.value)}% current mastery</p>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Progress Over Time" description="Last 6 months">
            <EnhancedLineChart data={analytics.personalProgressOverTime} color="#3b82f6" />
          </ChartCard>

          <ChartCard title="Mastery by Topic" description="Current scores">
            <EnhancedBarChart data={compactTopicBars} color="#10b981" />
          </ChartCard>

          <ChartCard title="Quiz Score History" description="Recent assessments">
            <EnhancedLineChart data={analytics.quizScoreHistory} color="#8b5cf6" />
          </ChartCard>

          <ChartCard title="Lessons Status" description="Completion breakdown">
            <EnhancedDonutChart
              data={[
                { label: 'Completed', value: analytics.completedVsPendingLessons.completed },
                { label: 'Pending', value: analytics.completedVsPendingLessons.pending }
              ]}
              centerValue={`${analytics.completedVsPendingLessons.completed}`}
            />
          </ChartCard>

          <ChartCard title="Confidence vs Performance" description="Calibration snapshot">
            <EnhancedBarChart data={confidencePerformanceSeries} color="#6366f1" />
          </ChartCard>

          <ChartCard title="Activity Snapshot" description="Recent practice consistency">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Recent Attempts (7d)</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.streakAndActivity.recentAttempts}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Attempts</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.streakAndActivity.totalAttempts}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Quiz Average</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{quizAverage}%</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Best Streak</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.streakStatus.bestStreak} days</p>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Learning DNA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="text-sm font-medium text-gray-600">Pace Type</h4>
            <p className="text-lg font-bold text-gray-900 mt-2">{analytics.learningDNA.paceType}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="text-sm font-medium text-gray-600">Learning Style</h4>
            <p className="text-lg font-bold text-gray-900 mt-2">{analytics.learningDNA.preferredStyle}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="text-sm font-medium text-gray-600">Mistake Pattern</h4>
            <p className="text-lg font-bold text-gray-900 mt-2">{analytics.learningDNA.mistakeType}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="text-sm font-medium text-gray-600">Best Streak</h4>
            <p className="text-lg font-bold text-gray-900 mt-2">{analytics.streakStatus.bestStreak} days</p>
          </div>
        </div>
      </div>
    </main>
  );
}
