'use client';

import { useEffect, useState } from 'react';
import {
  SummaryCard, MetricsGrid, ChartCard, EmptyState
} from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart, EnhancedBarChart, GaugeChart
} from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('ParentDashboard');

interface ParentAnalytics {
  childProgressSummary: { avgScore: number; attempts: number; trend: number };
  recentScoreTrend: Array<{ label: string; value: number }>;
  strengthsVsWeaknesses: Array<{ label: string; value: number }>;
  attendanceOrEngagementOverview: { activeDays: number; recentAttempts: number };
  feePaymentSummary: { paid: number; pending: number; overdue: number };
  learningDNA: {
    paceType: string;
    preferredStyle: string;
    confidenceLevel: number;
  };
}

export default function ParentDashboard() {
  const [analytics, setAnalytics] = useState<ParentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/parent/analytics', { credentials: 'include' });
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

  if (loading) return <div className="p-8">Loading...</div>;
  if (!analytics) return <EmptyState title="No data available" description="Check back soon" />;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-4xl font-bold text-gray-900">My Child's Learning Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor progress, strengths, and areas for improvement</p>
        </header>

        {/* Key Metrics */}
        <MetricsGrid columns={4}>
          <SummaryCard
            title="Child's Progress"
            value={`${Math.round(analytics.childProgressSummary.avgScore)}%`}
            icon="🎓"
            backgroundColor="bg-blue-50"
            trend={analytics.childProgressSummary.trend}
          />
          <SummaryCard
            title="Quizzes Taken"
            value={analytics.childProgressSummary.attempts}
            icon="📝"
            backgroundColor="bg-green-50"
          />
          <SummaryCard
            title="Engagement"
            value={analytics.attendanceOrEngagementOverview.activeDays}
            unit="active days"
            icon="🔥"
            backgroundColor="bg-orange-50"
          />
          <SummaryCard
            title="Confidence Level"
            value={`${Math.round(analytics.learningDNA.confidenceLevel)}%`}
            icon="⭐"
            backgroundColor="bg-purple-50"
          />
        </MetricsGrid>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Score Progress" description="Last 10 assessments">
            <EnhancedLineChart data={analytics.recentScoreTrend} color="#3b82f6" />
          </ChartCard>

          <ChartCard title="Strengths & Weaknesses" description="By subject">
            <EnhancedBarChart data={analytics.strengthsVsWeaknesses} color="#10b981" />
          </ChartCard>

          <ChartCard title="Engagement Rate" description="Learning activity">
            <GaugeChart 
              value={(analytics.attendanceOrEngagementOverview.recentAttempts / Math.max(analytics.attendanceOrEngagementOverview.activeDays, 1)) * 100} 
              max={100} 
              title="Activity Level" 
            />
          </ChartCard>

          <ChartCard title="Fee Status" description="Payment overview">
            <GaugeChart 
              value={(analytics.feePaymentSummary.paid / (analytics.feePaymentSummary.paid + analytics.feePaymentSummary.pending + analytics.feePaymentSummary.overdue)) * 100}
              max={100}
              title="Paid Fees"
            />
          </ChartCard>
        </div>

        {/* Learning Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="text-sm font-medium text-gray-600">Learning Pace</h4>
            <p className="text-lg font-bold text-gray-900 mt-2">{analytics.learningDNA.paceType}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="text-sm font-medium text-gray-600">Preferred Style</h4>
            <p className="text-lg font-bold text-gray-900 mt-2">{analytics.learningDNA.preferredStyle}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="text-sm font-medium text-gray-600">Total Fees</h4>
            <p className="text-lg font-bold text-red-600 mt-2">${analytics.feePaymentSummary.pending}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
