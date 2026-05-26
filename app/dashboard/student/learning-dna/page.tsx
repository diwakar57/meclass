'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart, GaugeChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentLearningDNA');

interface LearningProfile {
  learningStyle: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    readingWriting: number;
    dominantStyle: string;
  };
  strengths: Array<{ area: string; score: number }>;
  weaknesses: Array<{ area: string; score: number }>;
  recommendations: Array<{
    category: string;
    suggestion: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
  }>;
  paceAnalysis: {
    recommendedPace: string;
    currentPace: string;
    efficiency: number;
  };
  timePreferences: Array<{ timeSlot: string; effectiveness: number }>;
  learningPathSuggestion: Array<{ topic: string; readiness: number }>;
  academicTrendline: Array<{ month: string; score: number }>;
  engagementMetrics: {
    timeSpentPerWeek: number;
    averageSessionDuration: number;
    consistencyScore: number;
    focusScore: number;
  };
}

export default function StudentLearningDNAPage() {
  const [profileData, setProfileData] = useState<LearningProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearningProfile();
  }, []);

  async function fetchLearningProfile() {
    try {
      const response = await fetch('/api/student/learning-dna', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch learning profile');
      const data = await response.json();
      setProfileData(data.data);
    } catch (err) {
      log.error('Failed to load learning profile', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Learning DNA" subtitle="Your personalized learning profile">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading your learning profile...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!profileData) {
    return (
      <DashboardLayout title="Learning DNA" subtitle="Your personalized learning profile">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load your learning profile. Please try again later.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const learningStyleData = [
    { label: 'Visual', value: profileData.learningStyle.visual },
    { label: 'Auditory', value: profileData.learningStyle.auditory },
    { label: 'Kinesthetic', value: profileData.learningStyle.kinesthetic },
    { label: 'Reading/Writing', value: profileData.learningStyle.readingWriting },
  ];

  return (
    <DashboardLayout title="Learning DNA" subtitle="Understand your unique learning profile">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Dominant Learning Style */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Dominant Learning Style</h3>
            <p className="text-lg text-gray-700 mb-4 capitalized">
              <span className="text-3xl font-bold text-blue-600">{profileData.learningStyle.dominantStyle}</span>
            </p>
            <p className="text-gray-600">
              This means you learn best through {profileData.learningStyle.dominantStyle.toLowerCase()} materials and
              experiences. Consider adjusting your study strategy to leverage this strength!
            </p>
          </div>

          {/* Key Metrics */}
          <MetricsGrid columns={4}>
            <SummaryCard
              title="Time Spent/Week"
              value={`${profileData.engagementMetrics.timeSpentPerWeek}h`}
              icon="⏱️"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Avg Session"
              value={`${profileData.engagementMetrics.averageSessionDuration}min`}
              icon="📱"
              backgroundColor="bg-purple-50"
            />
            <SummaryCard
              title="Consistency"
              value={`${Math.round(profileData.engagementMetrics.consistencyScore)}%`}
              icon="📊"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Focus Score"
              value={`${Math.round(profileData.engagementMetrics.focusScore)}%`}
              icon="🎯"
              backgroundColor="bg-orange-50"
            />
          </MetricsGrid>

          {/* Learning Style & Pace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Learning Style Distribution" description="Your VARK profile breakdown">
              <EnhancedBarChart data={learningStyleData} color="#3b82f6" />
            </ChartCard>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-bold text-gray-900 mb-4">📈 Pace Analysis</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Recommended Pace</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">{profileData.paceAnalysis.recommendedPace}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Pace</p>
                  <p className="text-lg font-bold text-purple-600 mt-1">{profileData.paceAnalysis.currentPace}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pace Efficiency</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-600 h-3 rounded-full"
                        style={{ width: `${profileData.paceAnalysis.efficiency}%` }}
                      />
                    </div>
                    <p className="text-sm font-bold text-green-600 mt-1">{Math.round(profileData.paceAnalysis.efficiency)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top Strengths" description="Areas where you excel">
              <EnhancedBarChart data={profileData.strengths} color="#10b981" />
            </ChartCard>

            <ChartCard title="Growth Areas" description="Areas for improvement">
              <EnhancedBarChart data={profileData.weaknesses} color="#ef4444" />
            </ChartCard>
          </div>

          {/* Academic Trend */}
          <ChartCard title="Academic Performance Trend" description="Your progress over time">
            <EnhancedLineChart
              data={profileData.academicTrendline}
              xKey="month"
              yKey="score"
              color="#8b5cf6"
            />
          </ChartCard>

          {/* Time Effectiveness */}
          <ChartCard title="Best Learning Times" description="When your learning is most effective">
            <EnhancedBarChart data={profileData.timePreferences} color="#f59e0b" />
          </ChartCard>

          {/* Recommended Learning Path */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">🚀 Recommended Learning Path</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profileData.learningPathSuggestion.map((path, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow p-6" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <h4 className="font-bold text-gray-900 mb-2">{path.topic}</h4>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${path.readiness}%` }} />
                    </div>
                    <span className="text-sm font-bold text-blue-600">{Math.round(path.readiness)}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Readiness to learn</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">💡 Personalized Recommendations</h3>
            <div className="space-y-3">
              {profileData.recommendations.map((rec, idx) => {
                const urgencyColors: any = {
                  critical: 'border-red-200 bg-red-50',
                  high: 'border-orange-200 bg-orange-50',
                  medium: 'border-yellow-200 bg-yellow-50',
                  low: 'border-green-200 bg-green-50',
                };
                const urgencyBadges: any = {
                  critical: 'bg-red-100 text-red-800',
                  high: 'bg-orange-100 text-orange-800',
                  medium: 'bg-yellow-100 text-yellow-800',
                  low: 'bg-green-100 text-green-800',
                };
                return (
                  <div key={idx} className={`rounded-lg p-4 border ${urgencyColors[rec.urgency]}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{rec.category}</p>
                        <p className="text-sm text-gray-700 mt-1">{rec.suggestion}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ml-4 whitespace-nowrap ${urgencyBadges[rec.urgency]}`}>
                        {rec.urgency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
