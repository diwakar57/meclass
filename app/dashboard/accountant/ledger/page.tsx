'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('AccountantLedger');

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  category: 'tuition' | 'fees' | 'expenses' | 'grants' | 'other';
  debit?: number;
  credit?: number;
  balance: number;
  reference: string;
  approvedBy?: string;
}

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  monthlyIncome: Array<{ month: string; amount: number }>;
  incomeByCategory: Array<{ category: string; amount: number }>;
  expensesByCategory: Array<{ category: string; amount: number }>;
  ledgerEntries: LedgerEntry[];
  accountsReceivable: number;
  accountsPayable: number;
  cashFlow: Array<{ month: string; inflow: number; outflow: number }>;
}

export default function AccountantLedgerPage() {
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<'all' | 'tuition' | 'fees' | 'expenses' | 'grants' | 'other'>('all');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchFinancialData();
  }, [filterCategory, startDate, endDate]);

  async function fetchFinancialData() {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (filterCategory !== 'all') params.append('category', filterCategory);
      const response = await fetch(`/api/accountant/ledger?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch financial data');
      const data = await response.json();
      setFinancialData(data.data);
    } catch (err) {
      log.error('Failed to load financial data', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Ledger" subtitle="Financial records and accounting">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading financial data...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!financialData) {
    return (
      <DashboardLayout title="Ledger" subtitle="Financial records and accounting">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load financial data.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredEntries = financialData.ledgerEntries.filter(
    (e) => filterCategory === 'all' || e.category === filterCategory
  );

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'description',
      label: 'Description',
      render: (value: string) => <span className="font-medium text-gray-900">{value}</span>,
    },
    {
      key: 'category',
      label: 'Category',
      render: (value: string) => (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">{value}</span>
      ),
    },
    {
      key: 'debit',
      label: 'Debit',
      render: (value?: number) => (
        <span className="text-blue-600 font-bold">{value ? `$${value.toLocaleString()}` : '—'}</span>
      ),
    },
    {
      key: 'credit',
      label: 'Credit',
      render: (value?: number) => (
        <span className="text-green-600 font-bold">{value ? `$${value.toLocaleString()}` : '—'}</span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      render: (value: number) => (
        <span className={`font-bold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${value.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Financial Ledger" subtitle="Complete accounting records">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Filters */}
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Summary Cards */}
          <MetricsGrid columns={5}>
            <SummaryCard
              title="Total Income"
              value={`$${(financialData.totalIncome / 1000).toFixed(1)}K`}
              icon="💰"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Total Expenses"
              value={`$${(financialData.totalExpenses / 1000).toFixed(1)}K`}
              icon="💸"
              backgroundColor="bg-red-50"
            />
            <SummaryCard
              title="Net Balance"
              value={`$${(financialData.netBalance / 1000).toFixed(1)}K`}
              icon="📊"
              backgroundColor={financialData.netBalance >= 0 ? 'bg-green-50' : 'bg-red-50'}
            />
            <SummaryCard
              title="Accounts Receivable"
              value={`$${(financialData.accountsReceivable / 1000).toFixed(1)}K`}
              icon="📥"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Accounts Payable"
              value={`$${(financialData.accountsPayable / 1000).toFixed(1)}K`}
              icon="📤"
              backgroundColor="bg-yellow-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Monthly Income Trend" description="Revenue over time">
              <EnhancedLineChart
                data={financialData.monthlyIncome}
                xKey="month"
                yKey="amount"
                color="#10b981"
              />
            </ChartCard>

            <ChartCard title="Cash Flow Analysis" description="Inflow vs outflow">
              <EnhancedLineChart
                data={financialData.cashFlow}
                xKey="month"
                yKey="inflow"
                color="#3b82f6"
              />
            </ChartCard>
          </div>

          {/* Income & Expenses by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Income by Category" description="Revenue breakdown">
              <EnhancedBarChart data={financialData.incomeByCategory} color="#10b981" />
            </ChartCard>

            <ChartCard title="Expenses by Category" description="Expense breakdown">
              <EnhancedBarChart data={financialData.expensesByCategory} color="#ef4444" />
            </ChartCard>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            {(['all', 'tuition', 'fees', 'expenses', 'grants', 'other'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-lg shadow">
            <DataTable columns={columns} data={filteredEntries} />
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
