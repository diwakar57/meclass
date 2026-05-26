'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherQuizzes');

interface Question {
  id: string;
  type: 'multiple-choice' | 'short-answer' | 'essay';
  text: string;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  totalQuestions: number;
  totalPoints: number;
  dueDate: string;
  publishedDate: string;
  status: 'draft' | 'published' | 'closed';
  submissions: number;
  averageScore: number;
  passingRate: number;
}

interface QuizAnalytics {
  totalQuizzes: number;
  publishedQuizzes: number;
  totalSubmissions: number;
  averageQuizScore: number;
  highestScore: number;
  lowestScore: number;
  allQuizzes: Quiz[];
  scoreDistribution: Array<{ label: string; value: number }>;
  submissionTrend: Array<{ week: string; submissions: number }>;
}

export default function TeacherQuizzesPage() {
  const [analyticsData, setAnalyticsData] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'closed'>('published');
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [showNewQuizModal, setShowNewQuizModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    className: '',
    totalPoints: 100,
    dueDate: '',
  });

  useEffect(() => {
    fetchQuizzesData();
  }, []);

  async function fetchQuizzesData() {
    try {
      const response = await fetch('/api/quizzes/analytics', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch quizzes data');
      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      log.error('Failed to load quizzes data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateQuiz() {
    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newQuiz),
      });
      if (!response.ok) throw new Error('Failed to create quiz');
      await fetchQuizzesData();
      setShowNewQuizModal(false);
      setNewQuiz({ title: '', description: '', className: '', totalPoints: 100, dueDate: '' });
    } catch (err) {
      log.error('Failed to create quiz', err);
    }
  }

  async function handlePublishQuiz(quizId: string) {
    try {
      const response = await fetch(`/api/quizzes/${quizId}/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to publish quiz');
      await fetchQuizzesData();
    } catch (err) {
      log.error('Failed to publish quiz', err);
    }
  }

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete quiz');
      await fetchQuizzesData();
    } catch (err) {
      log.error('Failed to delete quiz', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Quizzes" subtitle="Create and manage quizzes">
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
      <DashboardLayout title="Quizzes" subtitle="Create and manage quizzes">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">No quizzes created yet.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredQuizzes = analyticsData.allQuizzes.filter(
    (q) => filterStatus === 'all' || q.status === filterStatus
  );

  const columns = [
    {
      key: 'title',
      label: 'Quiz Title',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'className',
      label: 'Class',
      render: (value: string) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: 'totalPoints',
      label: 'Points',
      render: (value: number) => <span className="font-medium">{value} pts</span>,
    },
    {
      key: 'submissions',
      label: 'Submissions',
      render: (value: number) => <span className="text-center">{value}</span>,
    },
    {
      key: 'averageScore',
      label: 'Average Score',
      render: (value: number) => <span className="font-bold text-green-600">{Math.round(value)}%</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          published: 'bg-green-100 text-green-800',
          draft: 'bg-gray-100 text-gray-800',
          closed: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[value] || 'bg-gray-100'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value: string, row: Quiz) => (
        <div className="flex gap-2">
          {row.status === 'draft' && (
            <button
              onClick={() => handlePublishQuiz(value)}
              className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-medium"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => setExpandedQuiz(expandedQuiz === value ? null : value)}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
          >
            Details
          </button>
          <button
            onClick={() => handleDeleteQuiz(value)}
            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Quizzes" subtitle="Create and manage student quizzes">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Create Quiz Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewQuizModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Create Quiz
            </button>
          </div>

          {/* New Quiz Modal */}
          {showNewQuizModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 w-96 shadow-lg">
                <h3 className="text-lg font-bold mb-4">Create New Quiz</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
                    <input
                      type="text"
                      value={newQuiz.title}
                      onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Chapter 5 Quiz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newQuiz.description}
                      onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Quiz description"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Points</label>
                    <input
                      type="number"
                      value={newQuiz.totalPoints}
                      onChange={(e) => setNewQuiz({ ...newQuiz, totalPoints: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newQuiz.dueDate}
                      onChange={(e) => setNewQuiz({ ...newQuiz, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleCreateQuiz}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewQuizModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <MetricsGrid columns={6}>
            <SummaryCard
              title="Total Quizzes"
              value={analyticsData.totalQuizzes}
              icon="📋"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Published"
              value={analyticsData.publishedQuizzes}
              icon="✅"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Submissions"
              value={analyticsData.totalSubmissions}
              icon="📤"
              backgroundColor="bg-purple-50"
            />
            <SummaryCard
              title="Avg Score"
              value={`${Math.round(analyticsData.averageQuizScore)}%`}
              icon="📊"
              backgroundColor="bg-orange-50"
            />
            <SummaryCard
              title="Highest"
              value={`${analyticsData.highestScore}%`}
              icon="⭐"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Lowest"
              value={`${analyticsData.lowestScore}%`}
              icon="📉"
              backgroundColor="bg-red-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Score Distribution" description="Student performance across all quizzes">
              <EnhancedBarChart data={analyticsData.scoreDistribution} color="#3b82f6" />
            </ChartCard>

            <ChartCard title="Submission Trend" description="Quiz completions over time">
              <EnhancedLineChart
                data={analyticsData.submissionTrend}
                xKey="week"
                yKey="submissions"
                color="#8b5cf6"
              />
            </ChartCard>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {(['all', 'draft', 'published', 'closed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-3 font-medium text-sm border-b-2 ${
                  filterStatus === status
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {status === 'all' ? 'All Quizzes' : status.charAt(0).toUpperCase() + status.slice(1)} (
                {analyticsData.allQuizzes.filter((q) => (status === 'all' ? true : q.status === status)).length})
              </button>
            ))}
          </div>

          {/* Quizzes Table */}
          <div className="bg-white rounded-lg shadow">
            <DataTable columns={columns} data={filteredQuizzes} />
          </div>

          {/* Quiz Details - Expandable */}
          {expandedQuiz && (
            <div className="bg-white rounded-lg shadow p-6">
              {filteredQuizzes.find((q) => q.id === expandedQuiz) && (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">{filteredQuizzes.find((q) => q.id === expandedQuiz)?.title}</h3>
                    <button
                      onClick={() => setExpandedQuiz(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {filteredQuizzes.find((q) => q.id === expandedQuiz)?.description}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Questions</p>
                      <p className="text-2xl font-bold mt-2">
                        {filteredQuizzes.find((q) => q.id === expandedQuiz)?.totalQuestions}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Total Points</p>
                      <p className="text-2xl font-bold mt-2">
                        {filteredQuizzes.find((q) => q.id === expandedQuiz)?.totalPoints}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Passing Rate</p>
                      <p className="text-2xl font-bold text-green-600 mt-2">
                        {Math.round(filteredQuizzes.find((q) => q.id === expandedQuiz)?.passingRate || 0)}%
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Due Date</p>
                      <p className="text-sm font-bold mt-2">
                        {new Date(
                          filteredQuizzes.find((q) => q.id === expandedQuiz)?.dueDate || ''
                        ).toLocaleDateString()}
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
