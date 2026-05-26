'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentTests');

interface TestAttempt {
  id: string;
  title: string;
  subject?: string;
  score: number;
  maxScore: number;
  completedAt: string;
  duration?: number;
  status?: string;
  masteryLevel?: string;
}

interface RecommendedTest {
  testId: string;
  testTitle: string;
  topicName: string;
  difficulty: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  confidenceReason: string;
  paceAlignment: 'slow' | 'standard' | 'fast';
  urgency: 'low' | 'medium' | 'high';
  recommendationScore: number;
  expectedDuration: number;
}

interface RecommendationResponse {
  recommendations: {
    recommendedTests: RecommendedTest[];
    nextImmediateTest: RecommendedTest | null;
    summary: {
      confidenceLevel: 'low' | 'medium' | 'high';
      suggestedAction: string;
      masteryProgress: number;
    };
  };
  metadata: any;
}

export default function StudentTestsPage() {
  const [tests, setTests] = useState<TestAttempt[]>([]);
  const [recommendedTests, setRecommendedTests] = useState<RecommendedTest[]>([]);
  const [nextImmediateTest, setNextImmediateTest] = useState<RecommendedTest | null>(null);
  const [recommendationSummary, setRecommendationSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchTests();
    fetchRecommendedTests();
  }, []);

  async function fetchTests() {
    try {
      const response = await fetch('/api/test-attempts', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tests');
      const data = await response.json();
      setTests(data.data || []);
    } catch (err) {
      log.error('Failed to load tests', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecommendedTests() {
    try {
      setLoadingRecommendations(true);
      const response = await fetch('/api/student/recommended-tests?includeGapTests=true', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch recommended tests');
      const data: RecommendationResponse = await response.json();
      
      if (data.recommendations) {
        setRecommendedTests(data.recommendations.recommendedTests || []);
        setNextImmediateTest(data.recommendations.nextImmediateTest || null);
        setRecommendationSummary(data.recommendations.summary);
      }
    } catch (err) {
      log.error('Failed to load recommended tests', err);
    } finally {
      setLoadingRecommendations(false);
    }
  }

  const filteredTests = tests.filter((test) => {
    if (filterStatus === 'all') return true;
    return test.status === filterStatus;
  });

  function getDifficultyColor(difficulty: string) {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  }

  function getUrgencyIcon(urgency: string) {
    switch (urgency) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      default:
        return '🟢';
    }
  }

  function getPaceIcon(pace: string) {
    switch (pace) {
      case 'slow':
        return '🐢';
      case 'fast':
        return '🚀';
      default:
        return '→';
    }
  }

  const columns = [
    {
      key: 'title',
      label: 'Test Name',
      render: (value: string, row: TestAttempt) => (
        <div>
          <p className="font-medium">{value}</p>
          {row.subject && <p className="text-sm text-gray-600">{row.subject}</p>}
        </div>
      ),
    },
    {
      key: 'score',
      label: 'Score',
      render: (value: number, row: TestAttempt) => (
        <div className="text-right">
          <p className="font-bold text-blue-600">{Math.round((value / row.maxScore) * 100)}%</p>
          <p className="text-sm text-gray-600">{value}/{row.maxScore}</p>
        </div>
      ),
    },
    {
      key: 'masteryLevel',
      label: 'Mastery',
      render: (value: string) => {
        const colors: any = {
          beginner: 'bg-red-100 text-red-800',
          intermediate: 'bg-yellow-100 text-yellow-800',
          proficient: 'bg-green-100 text-green-800',
          advanced: 'bg-blue-100 text-blue-800',
        };
        const colorClass = colors[value?.toLowerCase()] || 'bg-gray-100 text-gray-800';
        return <span className={`px-3 py-1 rounded-full text-sm ${colorClass}`}>{value || 'N/A'}</span>;
      },
    },
    {
      key: 'completedAt',
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'id',
      label: 'Action',
      render: (value: string) => (
        <button className="px-4 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
          Review
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Tests & Assessments" subtitle="View your test history and scores">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tests & Assessments" subtitle="View your test history and AI-recommended next tests based on your confidence level">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Confidence & Recommendations Summary */}
          {recommendationSummary && (
            <div className={`rounded-lg shadow p-6 ${
              recommendationSummary.confidenceLevel === 'high' ? 'bg-green-50 border-l-4 border-green-400' :
              recommendationSummary.confidenceLevel === 'low' ? 'bg-red-50 border-l-4 border-red-400' :
              'bg-blue-50 border-l-4 border-blue-400'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">
                    {recommendationSummary.confidenceLevel === 'high' ? '🎯 You\'re Doing Great!' :
                     recommendationSummary.confidenceLevel === 'low' ? '📚 Build Your Foundation' :
                     '→ Keep Improving'}
                  </h2>
                  <p className="text-base mb-3">{recommendationSummary.suggestedAction}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        recommendationSummary.masteryProgress > 75 ? 'bg-green-500' :
                        recommendationSummary.masteryProgress > 50 ? 'bg-blue-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${recommendationSummary.masteryProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm mt-2 text-gray-600">
                    Mastery Progress: {recommendationSummary.masteryProgress}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next Recommended Test */}
          {nextImmediateTest && !loadingRecommendations && (
            <div className="bg-white rounded-lg shadow-md border-2 border-blue-500 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-600 uppercase mb-2">📌 Recommended Next Test</p>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{nextImmediateTest.testTitle}</h3>
                  <p className="text-gray-700 mb-4">
                    <span className="font-medium">Topic:</span> {nextImmediateTest.topicName}
                  </p>
                  
                  <p className="text-gray-700 mb-3">
                    💡 <span className="italic">{nextImmediateTest.confidenceReason}</span>
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getDifficultyColor(nextImmediateTest.difficulty)}`}>
                      {nextImmediateTest.difficulty} difficulty
                    </span>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800">
                      {getUrgencyIcon(nextImmediateTest.urgency)} {nextImmediateTest.urgency} priority
                    </span>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-800">
                      {getPaceIcon(nextImmediateTest.paceAlignment)} {nextImmediateTest.paceAlignment} pace
                    </span>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800">
                      ⏱️ ~{nextImmediateTest.expectedDuration}m
                    </span>
                  </div>

                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition">
                    Start Test Now →
                  </button>
                </div>
                <div className="text-6xl ml-4">
                  {nextImmediateTest.recommendationScore > 85 ? '⭐' :
                   nextImmediateTest.recommendationScore > 70 ? '✨' : '📍'}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Tests Taken</p>
              <p className="text-4xl font-bold mt-2">{tests.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-4xl font-bold mt-2">
                {tests.length > 0
                  ? Math.round(
                      (tests.reduce((sum, t) => sum + (t.score / t.maxScore) * 100, 0) / tests.length)
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Best Score</p>
              <p className="text-4xl font-bold mt-2">
                {tests.length > 0
                  ? Math.round(
                      Math.max(
                        ...tests.map((t) => (t.score / t.maxScore) * 100)
                      )
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Recommended Tests</p>
              <p className="text-4xl font-bold mt-2">{recommendedTests.length}</p>
              <p className="text-xs text-gray-500 mt-1">Based on your pace</p>
            </div>
          </div>

          {/* More Recommended Tests */}
          {recommendedTests.length > 0 && !loadingRecommendations && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">🎓 Other Recommended Tests</h3>
                <p className="text-sm text-gray-600 mt-1">Personalized based on your confidence level and learning pace</p>
              </div>
              <div className="divide-y divide-gray-200">
                {recommendedTests.slice(0, 5).map((test, index) => (
                  <div key={test.testId} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                            {index + 1}
                          </span>
                          <h4 className="text-base font-semibold">{test.testTitle}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{test.topicName}</p>
                        <p className="text-sm text-gray-700 mb-3">
                          <span className="font-medium">Why this test?</span> {test.confidenceReason}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDifficultyColor(test.difficulty)}`}>
                            {test.difficulty}
                          </span>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
                            {getUrgencyIcon(test.urgency)} {test.urgency}
                          </span>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800">
                            {getPaceIcon(test.paceAlignment)}
                          </span>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                            {test.expectedDuration}m
                          </span>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                            {test.recommendationScore}% match
                          </span>
                        </div>
                      </div>
                      <button className="ml-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-medium">
                        Take Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Tests Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-4">📋 Your Test History</h3>

              {/* Filters */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg transition ${
                      filterStatus === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Tests
                  </button>
                  <button
                    onClick={() => setFilterStatus('completed')}
                    className={`px-4 py-2 rounded-lg transition ${
                      filterStatus === 'completed'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-4 py-2 rounded-lg transition ${
                      filterStatus === 'pending'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>

            {/* Tests Table */}
            <div className="bg-white rounded-lg shadow">
              {filteredTests.length === 0 ? (
                <div className="p-12 text-center text-gray-600">
                  No tests found. {filterStatus !== 'all' && 'Try changing the filter.'}
                </div>
              ) : (
                <DataTable columns={columns} data={filteredTests} />
              )}
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
