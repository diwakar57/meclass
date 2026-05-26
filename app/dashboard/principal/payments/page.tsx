'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedLineChart, EnhancedBarChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('PrincipalPayments');

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  method: string;
  description: string;
  invoiceId?: string;
}

interface PaymentMetrics {
  totalCollected: number;
  pendingAmount: number;
  failedAmount: number;
  averagePayment: number;
  completionRate: number;
  upcomingDue: number;
}

interface PaymentSummary {
  metrics: PaymentMetrics;
  recentPayments: Payment[];
  monthlyTrend: Array<{ month: string; amount: number }>;
  paymentMethods: Array<{ method: string; count: number }>;
}

export default function PrincipalPaymentsPage() {
  const [paymentData, setPaymentData] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    method: 'credit-card',
    amount: '',
    description: '',
  });

  useEffect(() => {
    fetchPaymentData();
  }, []);

  async function fetchPaymentData() {
    try {
      const response = await fetch('/api/payments/summary', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch payment data');
      const data = await response.json();
      setPaymentData(data.data);
    } catch (err) {
      log.error('Failed to load payment data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordPayment() {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          method: newPayment.method,
          description: newPayment.description,
        }),
      });
      if (!response.ok) throw new Error('Failed to record payment');
      await fetchPaymentData();
      setShowNewPaymentModal(false);
      setNewPayment({ method: 'credit-card', amount: '', description: '' });
    } catch (err) {
      log.error('Failed to record payment', err);
    }
  }

  async function handleRetryPayment(paymentId: string) {
    try {
      const response = await fetch(`/api/payments/${paymentId}/retry`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to retry payment');
      await fetchPaymentData();
    } catch (err) {
      log.error('Failed to retry payment', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Payments" subtitle="Manage school payments and revenue">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!paymentData) {
    return (
      <DashboardLayout title="Payments" subtitle="Manage school payments and revenue">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">No payment data available.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredPayments = paymentData.recentPayments.filter(
    (p) => filterStatus === 'all' || p.status === filterStatus
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
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value: number) => <span className="font-bold text-green-600">${value.toFixed(2)}</span>,
    },
    {
      key: 'method',
      label: 'Method',
      render: (value: string) => (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{value}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          completed: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          failed: 'bg-red-100 text-red-800',
        };
        return <span className={`px-3 py-1 rounded-full text-sm ${colors[value] || 'bg-gray-100'}`}>{value}</span>;
      },
    },
    {
      key: 'id',
      label: 'Action',
      render: (value: string, row: Payment) =>
        row.status === 'failed' ? (
          <button
            onClick={() => handleRetryPayment(value)}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
          >
            Retry
          </button>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
  ];

  return (
    <DashboardLayout title="Payments" subtitle="Manage school payments and revenue">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Record Payment Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewPaymentModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              + Record Payment
            </button>
          </div>

          {/* New Payment Modal */}
          {showNewPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 w-96 shadow-lg">
                <h3 className="text-lg font-bold mb-4">Record New Payment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select
                      value={newPayment.method}
                      onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="credit-card">Credit Card</option>
                      <option value="bank-transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="cryptocurrency">Cryptocurrency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={newPayment.description}
                      onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Quarterly tuition"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleRecordPayment}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Record
                  </button>
                  <button
                    onClick={() => setShowNewPaymentModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <MetricsGrid columns={5}>
            <SummaryCard
              title="Total Collected"
              value={`$${paymentData.metrics.totalCollected.toLocaleString()}`}
              icon="💰"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Pending"
              value={`$${paymentData.metrics.pendingAmount.toLocaleString()}`}
              icon="⏳"
              backgroundColor="bg-yellow-50"
            />
            <SummaryCard
              title="Failed"
              value={`$${paymentData.metrics.failedAmount.toLocaleString()}`}
              icon="❌"
              backgroundColor="bg-red-50"
            />
            <SummaryCard
              title="Avg Payment"
              value={`$${paymentData.metrics.averagePayment.toLocaleString()}`}
              icon="📊"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Completion Rate"
              value={`${Math.round(paymentData.metrics.completionRate)}%`}
              icon="✅"
              backgroundColor="bg-purple-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Monthly Revenue Trend" description="Total collected per month">
              <EnhancedLineChart
                data={paymentData.monthlyTrend}
                xKey="month"
                yKey="amount"
                color="#10b981"
              />
            </ChartCard>

            <ChartCard title="Payment Methods" description="Distribution by payment method">
              <EnhancedBarChart data={paymentData.paymentMethods} color="#f59e0b" />
            </ChartCard>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-3 font-medium text-sm border-b-2 ${
                  filterStatus === status
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} (
                {paymentData.recentPayments.filter((p) => (status === 'all' ? true : p.status === status)).length})
              </button>
            ))}
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-lg shadow">
            <DataTable columns={columns} data={filteredPayments} />
          </div>

          {/* Upcoming Due */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Upcoming Due</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  ${paymentData.metrics.upcomingDue.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Next 30 days</p>
                <button className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">
                  View Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
