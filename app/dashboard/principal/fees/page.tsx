'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/lib/contexts/AuthContext';

const log = createLogger('PrincipalFees');

interface FeeStructure {
  id: string;
  feeType: string;
  amount: number;
  frequency: string;
  applicableGrades?: string;
  description?: string;
  isActive: boolean;
}

export default function PrincipalFeesPage() {
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({
    feeType: '',
    amount: '',
    frequency: 'monthly',
    applicableGrades: '',
    description: '',
  });

  useEffect(() => {
    if (user?.schoolId) {
      fetchFees();
    }
  }, [user?.schoolId]);

  async function fetchFees() {
    try {
      const response = await fetch('/api/school/fee-structures', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch fees');
      const data = await response.json();
      setFees(data.data || []);
    } catch (err) {
      log.error('Failed to load fees', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFee(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch('/api/school/fee-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });
      if (!response.ok) throw new Error('Failed to create fee');
      await fetchFees();
      setFormData({ feeType: '', amount: '', frequency: 'monthly', applicableGrades: '', description: '' });
      setShowNewForm(false);
    } catch (err) {
      log.error('Failed to create fee', err);
    }
  }

  const columns = [
    {
      key: 'feeType',
      label: 'Fee Type',
      render: (value: string) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value: number) => <span className="font-bold text-green-600">${value.toFixed(2)}</span>,
    },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (value: string) => <span className="capitalize">{value}</span>,
    },
    {
      key: 'applicableGrades',
      label: 'Applicable Grades',
      render: (value: string) => value || 'All Grades',
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (value: boolean) => (
        <span className={`px-3 py-1 rounded-full text-sm ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value: string) => (
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
            Edit
          </button>
          <button className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Fee Structure" subtitle="Manage student fees and tuition">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const totalMonthlyRevenue = fees
    .filter((f) => f.isActive && f.frequency === 'monthly')
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <DashboardLayout title="Fee Structure" subtitle="Set up and manage student fees">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Fee Types</p>
              <p className="text-4xl font-bold mt-2">{fees.filter((f) => f.isActive).length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-4xl font-bold mt-2 text-green-600">${totalMonthlyRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Annual Revenue (Estimate)</p>
              <p className="text-4xl font-bold mt-2">${(totalMonthlyRevenue * 12).toFixed(2)}</p>
            </div>
          </div>

          {/* Create Fee Button */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {showNewForm ? 'Cancel' : '+ Add Fee Type'}
            </button>
          </div>

          {/* Create Fee Form */}
          {showNewForm && (
            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-lg font-bold mb-6">Add New Fee Type</h3>
              <form onSubmit={handleCreateFee} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type Name</label>
                    <input
                      type="text"
                      value={formData.feeType}
                      onChange={(e) => setFormData({ ...formData, feeType: e.target.value })}
                      placeholder="e.g., Tuition, Activity Fee"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                      <option value="one-time">One-Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Applicable Grades</label>
                    <input
                      type="text"
                      value={formData.applicableGrades}
                      onChange={(e) => setFormData({ ...formData, applicableGrades: e.target.value })}
                      placeholder="e.g., 9-12 (leave blank for all)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Details about this fee..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Fee Type
                </button>
              </form>
            </div>
          )}

          {/* Fees Table */}
          <div className="bg-white rounded-lg shadow">
            {fees.length === 0 ? (
              <div className="p-12 text-center text-gray-600">
                No fees configured yet. Click "Add Fee Type" to get started.
              </div>
            ) : (
              <DataTable columns={columns} data={fees} />
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
