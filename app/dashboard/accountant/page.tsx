'use client';

import { useState, useEffect } from 'react';
import {
  SummaryCard, MetricsGrid, ChartCard, DataTable, EmptyState
} from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart, EnhancedBarChart, EnhancedDonutChart, GaugeChart
} from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('AccountantDashboard');

interface AccountantAnalytics {
  totalOutstandingFees: number;
  totalCollected: number;
  feeCollectionPercentage: number;
  feesByStatus: Array<{ label: string; value: number }>;
  monthlyCollections: Array<{ label: string; value: number }>;
  overdueInvoices: Array<{ studentId: string; amount: number; daysOverdue: number }>;
  feesByGrade: Array<{ label: string; value: number }>;
}

export default function AccountantDashboard() {
  const [analytics, setAnalytics] = useState<AccountantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/accountant/analytics', { credentials: 'include' });
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
          <h1 className="text-4xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor school revenue and fee collections</p>
        </header>

        {/* Critical Metrics */}
        <MetricsGrid columns={4}>
          <SummaryCard
            title="Outstanding Fees"
            value={`$${(analytics.totalOutstandingFees / 1000).toFixed(1)}K`}
            icon="💸"
            backgroundColor="bg-red-50"
            borderColor="border-red-200"
          />
          <SummaryCard
            title="Total Collected"
            value={`$${(analytics.totalCollected / 1000).toFixed(1)}K`}
            icon="✅"
            backgroundColor="bg-green-50"
          />
          <SummaryCard
            title="Collection Rate"
            value={`${analytics.feeCollectionPercentage}%`}
            icon="📊"
            backgroundColor="bg-blue-50"
          />
          <SummaryCard
            title="Overdue Invoices"
            value={analytics.overdueInvoices.length}
            unit="invoices"
            icon="⚠️"
            backgroundColor="bg-yellow-50"
          />
        </MetricsGrid>

        {/* Analysis Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Fee Collection Rate" description="Overall collection percentage">
            <GaugeChart value={analytics.feeCollectionPercentage} max={100} />
          </ChartCard>

          <ChartCard title="Payment Status Breakdown" description="By status category">
            <EnhancedDonutChart data={analytics.feesByStatus} centerValue={`${analytics.feesByStatus.reduce((s, x) => s + x.value, 0)}`} />
          </ChartCard>

          <ChartCard title="Monthly Collections" description="6-month trend">
            <EnhancedLineChart data={analytics.monthlyCollections} color="#10b981" />
          </ChartCard>

          <ChartCard title="Fee Distribution by Grade" description="Average fees">
            <EnhancedBarChart data={analytics.feesByGrade} color="#f59e0b" />
          </ChartCard>
        </div>

        {/* Overdue Invoices */}
        <ChartCard title="Overdue Invoices" description="Requiring immediate action">
          <DataTable
            columns={[
              { key: 'studentId', label: 'Student ID' },
              { 
                key: 'amount',
                label: 'Amount',
                render: (v) => `$${v}`
              },
              {
                key: 'daysOverdue',
                label: 'Days Overdue'
              }
            ]}
            data={analytics.overdueInvoices}
          />
        </ChartCard>
      </div>
    </main>
  );
}
