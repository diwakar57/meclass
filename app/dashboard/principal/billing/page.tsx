'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { SummaryCard, MetricsGrid, ChartCard, DataTable } from '@/components/dashboard/dashboard-components';
import { EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/lib/contexts/AuthContext';

const log = createLogger('PrincipalBilling');

interface BillingData {
  currentPlan: string;
  studentLimit: number;
  studentUsage: number;
  monthlyRate: number;
  nextBillingDate: string;
  billingHistory: Array<{ month: string; amount: number; status: string }>;
  paymentMethod?: {
    type: string;
    last4?: string;
  };
  invoices: Array<{
    id: string;
    number: string;
    date: string;
    amount: number;
    status: string;
  }>;
}

export default function PrincipalBillingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'invoices'>('overview');

  useEffect(() => {
    if (user?.schoolId) {
      fetchBilling();
    }
  }, [user?.schoolId]);

  async function fetchBilling() {
    try {
      const response = await fetch('/api/billing', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch billing');
      const data = await response.json();
      setBilling(data.data);
    } catch (err) {
      log.error('Failed to load billing', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Billing & Subscription" subtitle="Manage your school's subscription">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!billing) {
    return (
      <DashboardLayout title="Billing & Subscription" subtitle="Manage your school's subscription">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">No billing information available</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const invoiceColumns = [
    {
      key: 'number',
      label: 'Invoice #',
      render: (value: string) => <span className="font-bold">INV-{value}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value: number) => <span className="font-bold">${value.toFixed(2)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          paid: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          overdue: 'bg-red-100 text-red-800',
        };
        const colorClass = colors[value?.toLowerCase()] || 'bg-gray-100 text-gray-800';
        return <span className={`px-3 py-1 rounded-full text-sm ${colorClass}`}>{value}</span>;
      },
    },
    {
      key: 'id',
      label: 'Action',
      render: (value: string) => (
        <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
          Download
        </button>
      ),
    },
  ];

  const usagePercentage = (billing.studentUsage / billing.studentLimit) * 100;

  return (
    <DashboardLayout title="Billing & Subscription" subtitle="Manage your school's billing and subscription">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-8">

          {/* Current Plan Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow p-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-blue-100 text-sm">Current Plan</p>
                <p className="text-3xl font-bold mt-2 capitalize">{billing.currentPlan} Plan</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Monthly Cost</p>
                <p className="text-3xl font-bold mt-2">${billing.monthlyRate.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Next Billing Date</p>
                <p className="text-xl font-bold mt-2">{new Date(billing.nextBillingDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
                Upgrade Plan
              </button>
              <button className="px-6 py-2 border-2 border-white text-white rounded-lg font-medium hover:bg-blue-700">
                Change Plan
              </button>
            </div>
          </div>

          {/* Usage Card */}
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-lg font-bold mb-6">Student Usage</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{billing.studentUsage} of {billing.studentLimit} Students</span>
                  <span className="text-blue-600 font-bold">{Math.round(usagePercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      usagePercentage > 90
                        ? 'bg-red-500'
                        : usagePercentage > 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
                {usagePercentage > 90 && (
                  <p className="mt-2 text-sm text-red-600">
                    ⚠️ You're nearing your student limit. Upgrade your plan to add more students.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Billing History
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'invoices'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Invoices
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow p-8">
                <h3 className="text-lg font-bold mb-4">Payment Method</h3>
                {billing.paymentMethod ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600">
                        {billing.paymentMethod.type} •••• {billing.paymentMethod.last4}
                      </p>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Update Payment Method
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">No payment method on file</p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Add Payment Method
                    </button>
                  </div>
                )}
              </div>

              {/* Billing Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Yearly Cost</p>
                  <p className="text-3xl font-bold mt-2">${(billing.monthlyRate * 12).toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Cost per Student</p>
                  <p className="text-3xl font-bold mt-2">
                    ${(billing.monthlyRate / Math.max(billing.studentUsage, 1)).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Available Seats</p>
                  <p className="text-3xl font-bold mt-2">{billing.studentLimit - billing.studentUsage}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-lg font-bold mb-6">Billing History</h3>
              <ChartCard title=" Monthly Billing Trend" description="Past 12 months">
                <EnhancedLineChart
                  data={billing.billingHistory}
                  color="#3b82f6"
                />
              </ChartCard>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="bg-white rounded-lg shadow">
              {billing.invoices.length === 0 ? (
                <div className="p-12 text-center text-gray-600">No invoices yet</div>
              ) : (
                <DataTable columns={invoiceColumns} data={billing.invoices} />
              )}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
