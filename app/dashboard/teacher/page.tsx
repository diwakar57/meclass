'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';
import { 
  SummaryCard, MetricsGrid, ChartCard, AlertsPanel, DataTable 
} from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart, EnhancedBarChart, HeatmapChart, GaugeChart
} from '@/components/dashboard/advanced-charts';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

const log = createLogger('TeacherDashboard');

interface TeacherAnalytics {
  studentProgressTrend: Array<{ label: string; value: number }>;
  topicMasteryChart: Array<{ label: string; value: number }>;
  weakTopicHeatmap: Array<{ label: string; value: number }>;
  quizPerformanceDistribution: Array<{ label: string; value: number }>;
  assignmentCompletion: { completed: number; total: number };
  learningPlanProgress?: { active: number; total: number };
}

const TEACHER_MODULES = [
  { label: 'Classes', href: '/dashboard/teacher/classes', icon: '🎓' },
  { label: 'Courses', href: '/dashboard/teacher/courses', icon: '📚' },
  { label: 'Attendance', href: '/dashboard/teacher/attendance', icon: '📍' },
  { label: 'Assignments', href: '/dashboard/teacher/assignments', icon: '📝' },
  { label: 'Quizzes', href: '/dashboard/teacher/quizzes', icon: '❓' },
  { label: 'Exams', href: '/dashboard/teacher/exams', icon: '📋' },
  { label: 'Grades', href: '/dashboard/teacher/grades', icon: '📊' },
  { label: 'Students', href: '/dashboard/teacher/students', icon: '👥' },
  { label: 'Syllabus', href: '/dashboard/teacher/syllabus', icon: '📚' },
];

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function TeacherDashboard() {
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/teacher/analytics', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setAnalytics(data.data);
      } catch (err) {
        log.error('Failed to load analytics', err);
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
      <DashboardLayout title="Teacher Dashboard" subtitle="Monitor student progress and class performance">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl rounded-lg border border-gray-200 bg-white p-6 text-gray-600 shadow-sm">
            Loading teacher analytics...
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const alerts = [];
  if (analytics?.weakTopicHeatmap && analytics.weakTopicHeatmap.some((topic) => safeNumber(topic.value) >= 60)) {
    alerts.push({
      id: 'weak-topics',
      type: 'warning' as const,
      title: 'High weakness topics detected',
      description: 'Some topics need reinforcement interventions for your classes.',
      action: { label: 'Open Syllabus', onClick: () => { window.location.href = '/dashboard/teacher/syllabus'; } }
    });
  }

  const topicMasteryValues = (analytics?.topicMasteryChart || []).map((item) => safeNumber(item.value));
  const avgMasteryScore =
    topicMasteryValues.length > 0
      ? topicMasteryValues.reduce((sum, value) => sum + value, 0) / topicMasteryValues.length
      : 0;

  const distribution = analytics?.quizPerformanceDistribution || [];
  const lowCount = safeNumber(distribution.find((item) => item.label.toLowerCase() === 'low')?.value);
  const mediumCount = safeNumber(distribution.find((item) => item.label.toLowerCase() === 'medium')?.value);
  const highCount = safeNumber(distribution.find((item) => item.label.toLowerCase() === 'high')?.value);
  const distributionTotal = lowCount + mediumCount + highCount;
  const weightedDistributionAverage =
    distributionTotal > 0 ? (lowCount * 30 + mediumCount * 55 + highCount * 85) / distributionTotal : 0;

  const avgClassScore = avgMasteryScore > 0 ? avgMasteryScore : weightedDistributionAverage;
  const engagementPercentage =
    safeNumber(analytics?.assignmentCompletion?.total) > 0
      ? (safeNumber(analytics?.assignmentCompletion?.completed) /
          safeNumber(analytics?.assignmentCompletion?.total)) * 100
      : 0;

  const totalStudents = safeNumber(analytics?.learningPlanProgress?.total);

  const weakTopicsData =
    (analytics?.weakTopicHeatmap || [])
      .map((item) => ({
        topic: item.label,
        weakness: Math.min(Math.max(safeNumber(item.value), 0), 100),
      }))
      .sort((a, b) => b.weakness - a.weakness);

  const masteryHeatmapData = weakTopicsData.map((item) => ({
    student: 'Class',
    topic: item.topic,
    value: 100 - item.weakness,
  }));

  return (
    <DashboardLayout title="Teacher Dashboard" subtitle="Monitor student progress and class performance">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-700">Teacher Functionality</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {TEACHER_MODULES.map((module) => (
                <Link
                  key={module.href}
                  href={module.href}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <div>{module.icon}</div>
                  <div>{module.label}</div>
                </Link>
              ))}
            </div>
          </section>

          {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

          {analytics && (
            <>
              {/* Key Metrics */}
              <MetricsGrid columns={4}>
                <SummaryCard
                  title="Total Students"
                  value={totalStudents}
                  icon="👥"
                  backgroundColor="bg-blue-50"
                />
                <SummaryCard
                  title="Class Average Score"
                  value={`${Math.round(avgClassScore)}%`}
                  icon="📊"
                  backgroundColor="bg-green-50"
                />
                <SummaryCard
                  title="Engagement Rate"
                  value={`${Math.round(engagementPercentage)}%`}
                  icon="🔥"
                  backgroundColor="bg-purple-50"
                />
                <SummaryCard
                  title="Assignments Ready"
                  value={safeNumber(analytics.assignmentCompletion?.completed)}
                  unit={`/ ${safeNumber(analytics.assignmentCompletion?.total)}`}
                  icon="📝"
                  backgroundColor="bg-yellow-50"
                />
              </MetricsGrid>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartCard title="Student Progress Trend" description="Last 6 months average">
                  <EnhancedLineChart data={analytics.studentProgressTrend || []} color="#3b82f6" />
                </ChartCard>

                <ChartCard title="Topic Mastery by Subject" description="Top topics">
                  <EnhancedBarChart data={analytics.topicMasteryChart || []} color="#10b981" />
                </ChartCard>

                <ChartCard title="Topic Mastery Heatmap" description="Class × topic mastery">
                  <HeatmapChart data={masteryHeatmapData} />
                </ChartCard>

                <ChartCard title="Quiz Performance Distribution" description="Score breakdown">
                  <GaugeChart value={avgClassScore} max={100} title="Class Average" />
                </ChartCard>
              </div>

              <ChartCard title="Priority Weak Topics" description="Topics needing reinforcement first">
                <DataTable
                  columns={[
                    { key: 'topic', label: 'Topic' },
                    {
                      key: 'weakness',
                      label: 'Weakness',
                      render: (value) => `${Math.round(safeNumber(value))}%`,
                    },
                  ]}
                  data={weakTopicsData.slice(0, 10)}
                />
              </ChartCard>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
