'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentTopics');

interface Topic {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  completionPercentage: number;
  lessonsTotal: number;
  lessonsCompleted: number;
  estimatedHours: number;
  instructor: string;
  enrollmentDate: string;
  status: 'not-started' | 'in-progress' | 'completed';
  lastAccessedDate?: string;
}

interface TopicAnalytics {
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  notStartedTopics: number;
  averageProgress: number;
  totalHoursLearned: number;
  estimatedRemainingHours: number;
  topicsByDifficulty: Array<{ difficulty: string; count: number }>;
  progressTrend: Array<{ week: string; progress: number }>;
  allTopics: Topic[];
}

export default function StudentTopicsPage() {
  const [analyticsData, setAnalyticsData] = useState<TopicAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'not-started' | 'in-progress' | 'completed'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    fetchTopicsData();
  }, []);

  async function fetchTopicsData() {
    try {
      const response = await fetch('/api/student/topics', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch topics');
      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      log.error('Failed to load topics', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleContinueTopic(topicId: string) {
    try {
      const response = await fetch(`/api/student/topics/${topicId}/resume`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to resume topic');
      await fetchTopicsData();
    } catch (err) {
      log.error('Failed to resume topic', err);
    }
  }

  async function handleEnrollTopic(topicId: string) {
    try {
      const response = await fetch('/api/student/topics/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topicId }),
      });
      if (!response.ok) throw new Error('Failed to enroll in topic');
      await fetchTopicsData();
    } catch (err) {
      log.error('Failed to enroll in topic', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Topics" subtitle="Explore learning topics and courses">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout title="Topics" subtitle="Explore learning topics and courses">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">No topics available. Check back soon!</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredTopics = analyticsData.allTopics.filter(
    (t) => filterStatus === 'all' || t.status === filterStatus
  );

  const columns = [
    {
      key: 'title',
      label: 'Topic',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (value: string) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: 'difficulty',
      label: 'Level',
      render: (value: string) => {
        const colors: any = {
          beginner: 'bg-green-100 text-green-800',
          intermediate: 'bg-yellow-100 text-yellow-800',
          advanced: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[value] || 'bg-gray-100'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'completionPercentage',
      label: 'Progress',
      render: (value: number) => (
        <div className="w-32">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${value}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{Math.round(value)}%</p>
        </div>
      ),
    },
    {
      key: 'lessonsCompleted',
      label: 'Lessons',
      render: (value: number, row: Topic) => <span className="text-center">{value}/{row.lessonsTotal}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          'not-started': 'bg-gray-100 text-gray-800',
          'in-progress': 'bg-blue-100 text-blue-800',
          completed: 'bg-green-100 text-green-800',
        };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[value] || 'bg-gray-100'}`}>
            {value.replace('-', ' ')}
          </span>
        );
      },
    },
    {
      key: 'id',
      label: 'Action',
      render: (value: string, row: Topic) => (
        <div className="flex gap-2">
          {row.status === 'not-started' ? (
            <button
              onClick={() => handleEnrollTopic(value)}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-medium"
            >
              Start
            </button>
          ) : (
            <button
              onClick={() => handleContinueTopic(value)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
            >
              Continue
            </button>
          )}
          <button
            onClick={() => setSelectedTopic(selectedTopic === value ? null : value)}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
          >
            Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Topics" subtitle="Explore and learn from available topics">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Key Metrics */}
          <MetricsGrid columns={5}>
            <SummaryCard
              title="Total Topics"
              value={analyticsData.totalTopics}
              icon="📚"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Completed"
              value={analyticsData.completedTopics}
              icon="✅"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="In Progress"
              value={analyticsData.inProgressTopics}
              icon="⏳"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Avg Progress"
              value={`${Math.round(analyticsData.averageProgress)}%`}
              icon="📊"
              backgroundColor="bg-purple-50"
            />
            <SummaryCard
              title="Hours Learned"
              value={analyticsData.totalHoursLearned}
              icon="⏱️"
              backgroundColor="bg-orange-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Topics by Difficulty" description="Distribution across skill levels">
              <EnhancedBarChart data={analyticsData.topicsByDifficulty} color="#3b82f6" />
            </ChartCard>

            <ChartCard title="Learning Progress Trend" description="Weekly completion rate">
              <EnhancedLineChart
                data={analyticsData.progressTrend}
                xKey="week"
                yKey="progress"
                color="#10b981"
              />
            </ChartCard>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {(['all', 'not-started', 'in-progress', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-3 font-medium text-sm border-b-2 ${
                  filterStatus === status
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('-', ' ').charAt(0).toUpperCase() + status.slice(1)} (
                {analyticsData.allTopics.filter((t) => (status === 'all' ? true : t.status === status)).length})
              </button>
            ))}
          </div>

          {/* Topics Table */}
          <div className="bg-white rounded-lg shadow">
            <DataTable columns={columns} data={filteredTopics} />
          </div>

          {/* Topic Details - Expandable */}
          {selectedTopic && (
            <div className="bg-white rounded-lg shadow p-6">
              {filteredTopics.find((t) => t.id === selectedTopic) && (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{filteredTopics.find((t) => t.id === selectedTopic)?.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Instructor: {filteredTopics.find((t) => t.id === selectedTopic)?.instructor}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTopic(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-gray-700 mb-6">{filteredTopics.find((t) => t.id === selectedTopic)?.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Total Lessons</p>
                      <p className="text-2xl font-bold mt-2">
                        {filteredTopics.find((t) => t.id === selectedTopic)?.lessonsTotal}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Estimated Hours</p>
                      <p className="text-2xl font-bold mt-2">
                        {filteredTopics.find((t) => t.id === selectedTopic)?.estimatedHours}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Progress</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        {Math.round(filteredTopics.find((t) => t.id === selectedTopic)?.completionPercentage || 0)}%
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Last Accessed</p>
                      <p className="text-sm font-bold mt-2">
                        {filteredTopics.find((t) => t.id === selectedTopic)?.lastAccessedDate
                          ? new Date(
                              filteredTopics.find((t) => t.id === selectedTopic)?.lastAccessedDate || ''
                            ).toLocaleDateString()
                          : 'Not started'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
