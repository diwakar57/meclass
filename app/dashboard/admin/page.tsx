/**
 * SaaS Admin Dashboard - Platform Overview
 * Key Metrics: Schools, Subscriptions, Revenue, Growth
 */

'use client';

import React, { useEffect, useState } from 'react';
import { createLogger } from '@/lib/logger';
import {
  SummaryCard,
  MetricsGrid,
  ChartCard,
  AlertsPanel,
  EmptyState,
  DataTable,
} from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart,
  EnhancedBarChart,
  EnhancedDonutChart,
} from '@/components/dashboard/advanced-charts';

const log = createLogger('AdminDashboard');

interface AdminAnalytics {
  totalSchools: number;
  activeSubscriptions: number;
  monthlyRevenue: Array<{ label: string; value: number }>;
  schoolGrowth: Array<{ label: string; value: number }>;
  platformUsage: Array<{ label: string; value: number }>;
  planDistribution: Array<{ label: string; value: number }>;
}

export default function AdminDashboard() {

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data.data || null);
    } catch (err: any) {
      log.error('Error loading analytics', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-2">⏳</div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">SaaS Platform Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage schools, subscriptions, and platform growth</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </header>

        {error && <AlertsPanel alerts={[{ id: 'error', type: 'danger', title: 'Error', description: error }]} />}

        {!analytics ? (
          <EmptyState title="No analytics available" icon="📊" />
        ) : (
          <>
            {/* Key Metrics */}
            <MetricsGrid columns={4}>
              <SummaryCard
                title="Total Schools"
                value={analytics.totalSchools}
                unit="schools"
                icon="🏫"
                backgroundColor="bg-blue-50"
                borderColor="border-blue-200"
              />
              <SummaryCard
                title="Active Subscriptions"
                value={analytics.activeSubscriptions}
                unit="active"
                icon="✅"
                backgroundColor="bg-green-50"
                borderColor="border-green-200"
              />
              <SummaryCard
                title="Monthly Revenue"
                value={`$${(analytics.monthlyRevenue[analytics.monthlyRevenue.length - 1]?.value || 0).toLocaleString()}`}
                icon="💰"
                backgroundColor="bg-green-50"
                borderColor="border-green-200"
              />
              <SummaryCard
                title="Platform Users"
                value={analytics.platformUsage[analytics.platformUsage.length - 1]?.value || 0}
                unit="active"
                icon="👥"
                backgroundColor="bg-purple-50"
                borderColor="border-purple-200"
              />
            </MetricsGrid>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <ChartCard
                title="Monthly Revenue Trend"
                description="Last 6 months of platform revenue"
              >
                <EnhancedLineChart
                  data={analytics.monthlyRevenue}
                  title="Revenue ($)"
                  color="#10b981"
                  height={250}
                />
              </ChartCard>

              {/* School Growth */}
              <ChartCard
                title="School Growth"
                description="New schools created each month"
              >
                <EnhancedBarChart
                  data={analytics.schoolGrowth}
                  title="Onboarding Trend"
                  color="#3b82f6"
                  height={250}
                />
              </ChartCard>

              {/* Platform Usage */}
              <ChartCard
                title="Platform Usage"
                description="Monthly active learning sessions"
              >
                <EnhancedLineChart
                  data={analytics.platformUsage}
                  title="Sessions"
                  color="#8b5cf6"
                  height={250}
                />
              </ChartCard>

              {/* Subscription Plan Distribution */}
              <ChartCard
                title="Subscription Plan Distribution"
                description="Schools by plan type"
              >
                <EnhancedDonutChart
                  data={analytics.planDistribution}
                  title="Plans"
                  centerValue={`${analytics.totalSchools} Total`}
                  height={250}
                />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
