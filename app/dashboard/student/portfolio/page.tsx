'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentPortfolio');

interface WorkSample {
  id: string;
  title: string;
  description: string;
  subject: string;
  submissionDate: string;
  score?: number;
  feedback?: string;
  fileUrl: string;
}

interface Portfolio {
  studentId: string;
  studentName: string;
  class: string;
  portfolioCreatedDate: string;
  totalWorks: number;
  averageScore: number;
  workSamples: WorkSample[];
  subjectBreakdown: Array<{ subject: string; count: number }>;
  improvementAreas: string[];
  strengths: string[];
}

export default function StudentPortfolioPage() {
  const [portfolioData, setPortfolioData] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  async function fetchPortfolio() {
    try {
      const response = await fetch('/api/student/portfolio', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch portfolio');
      const data = await response.json();
      setPortfolioData(data.data);
    } catch (err) {
      log.error('Failed to load portfolio', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadWork(workId: string) {
    try {
      const response = await fetch(`/api/student/portfolio/${workId}/download`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work-${workId}`;
      a.click();
    } catch (err) {
      log.error('Failed to download', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Portfolio" subtitle="Showcase your work and achievements">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading your portfolio...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!portfolioData) {
    return (
      <DashboardLayout title="Portfolio" subtitle="Showcase your work and achievements">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Your portfolio is still empty. Start adding your work samples!</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const selectedWorkData = portfolioData.workSamples.find((w) => w.id === selectedWork);

  return (
    <DashboardLayout title="Student Portfolio" subtitle="Display your best work">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Portfolio Header */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200">
            <h3 className="text-3xl font-bold text-gray-900">{portfolioData.studentName}</h3>
            <p className="text-gray-700 mt-1">Class: {portfolioData.class}</p>
            <p className="text-sm text-gray-600 mt-1">Portfolio Created: {new Date(portfolioData.portfolioCreatedDate).toLocaleDateString()}</p>
          </div>

          {/* Key Metrics */}
          <MetricsGrid columns={3}>
            <SummaryCard
              title="Total Works"
              value={portfolioData.totalWorks}
              icon="📝"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Average Score"
              value={`${Math.round(portfolioData.averageScore)}%`}
              icon="⭐"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Subjects Covered"
              value={portfolioData.subjectBreakdown.length}
              icon="📚"
              backgroundColor="bg-purple-50"
            />
          </MetricsGrid>

          {/* Subject Distribution */}
          <ChartCard title="Work Distribution by Subject" description="Number of submissions per subject">
            <EnhancedBarChart data={portfolioData.subjectBreakdown} color="#3b82f6" />
          </ChartCard>

          {/* Strengths & Improvement Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <h3 className="font-bold text-gray-900 mb-4">✨ Strengths</h3>
              <ul className="space-y-2">
                {portfolioData.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <h3 className="font-bold text-gray-900 mb-4">📈 Areas for Growth</h3>
              <ul className="space-y-2">
                {portfolioData.improvementAreas.map((area, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-orange-600">→</span>
                    <span className="text-gray-700">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Work Samples */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Work Samples ({portfolioData.totalWorks})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolioData.workSamples.map((work) => (
                <div
                  key={work.id}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition ${
                    selectedWork === work.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedWork(work.id)}
                >
                  <h4 className="font-bold text-gray-900">{work.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{work.description}</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-gray-500">{work.subject}</span>
                    {work.score && <span className="text-bold text-blue-600">{work.score}%</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{new Date(work.submissionDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Work Detail */}
          {selectedWorkData && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedWorkData.title}</h3>
                  <p className="text-gray-600 mt-1">{selectedWorkData.subject}</p>
                </div>
                <button
                  onClick={() => handleDownloadWork(selectedWorkData.id)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Download
                </button>
              </div>

              <p className="text-gray-700 mb-6">{selectedWorkData.description}</p>

              {selectedWorkData.score && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600">Score</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{selectedWorkData.score}%</p>
                </div>
              )}

              {selectedWorkData.feedback && (
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-bold text-gray-700 mb-2">📝 Feedback</p>
                  <p className="text-gray-700">{selectedWorkData.feedback}</p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-6">Submitted: {new Date(selectedWorkData.submissionDate).toLocaleString()}</p>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
