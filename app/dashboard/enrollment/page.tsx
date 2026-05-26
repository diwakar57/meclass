'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EnhancedBarChart } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('Enrollment');

interface EnrolledStudent {
  studentId: string;
  name: string;
  email: string;
  phone: string;
  gradeLevel: string;
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'suspended' | 'completed';
  feesPaid: number;
  feesTotal: number;
  parent: string;
}

interface EnrollmentRequest {
  requestId: string;
  parentName: string;
  studentName: string;
  studentAge: number;
  gradeLevel: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface EnrollmentData {
  totalEnrolled: number;
  pendingRequests: number;
  activeStudents: number;
  enrollmentByGrade: Array<{ grade: string; count: number }>;
  enrolledStudents: EnrolledStudent[];
  enrollmentRequests: EnrollmentRequest[];
  monthlyEnrollment: Array<{ month: string; new: number }>;
}

export default function EnrollmentPage() {
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'suspended' | 'completed'>('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    studentAge: '',
    gradeLevel: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    address: '',
  });

  useEffect(() => {
    fetchEnrollmentData();
  }, [filterStatus, searchStudent]);

  async function fetchEnrollmentData() {
    try {
      const params = new URLSearchParams({ status: filterStatus });
      if (searchStudent) params.append('search', searchStudent);
      const response = await fetch(`/api/enrollments?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch enrollment data');
      const data = await response.json();
      setEnrollmentData(data.data);
    } catch (err) {
      log.error('Failed to load enrollment data', err);
    } finally {
      setLoading(false);
    }
  }

  async function submitEnrollment() {
    try {
      const response = await fetch('/api/enrollments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to submit enrollment');
      alert('Enrollment request submitted successfully');
      setShowEnrollmentForm(false);
      setFormData({
        studentName: '',
        studentAge: '',
        gradeLevel: '',
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        address: '',
      });
      fetchEnrollmentData();
    } catch (err) {
      log.error('Failed to submit enrollment', err);
      alert('Failed to submit enrollment request');
    }
  }

  async function approveEnrollment(requestId: string) {
    try {
      const response = await fetch(`/api/enrollments/${requestId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to approve enrollment');
      alert('Enrollment approved successfully');
      fetchEnrollmentData();
    } catch (err) {
      log.error('Failed to approve enrollment', err);
      alert('Failed to approve enrollment');
    }
  }

  async function rejectEnrollment(requestId: string) {
    if (!window.confirm('Are you sure you want to reject this enrollment?')) return;
    try {
      const response = await fetch(`/api/enrollments/${requestId}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to reject enrollment');
      alert('Enrollment rejected successfully');
      fetchEnrollmentData();
    } catch (err) {
      log.error('Failed to reject enrollment', err);
      alert('Failed to reject enrollment');
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Student Enrollment" subtitle="Manage student registrations">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="text-center py-12">Loading enrollment data...</div>
        </main>
      </DashboardLayout>
    );
  }

  if (!enrollmentData) {
    return (
      <DashboardLayout title="Student Enrollment" subtitle="Manage student registrations">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">Unable to load enrollment data.</p>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredStudents = enrollmentData.enrolledStudents.filter(
    (s) => (filterStatus === 'all' || s.status === filterStatus) && s.name.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: any = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout title="Student Enrollment" subtitle="Manage student registrations and applications">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-gray-900">Enrollment Management</p>
              <p className="text-sm text-gray-600">Manage student registrations and enrollment requests</p>
            </div>
            <button
              onClick={() => setShowEnrollmentForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              + New Enrollment Request
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Enrolled</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{enrollmentData.totalEnrolled}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Active Students</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{enrollmentData.activeStudents}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{enrollmentData.pendingRequests}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Enrollment Rate</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">
                {enrollmentData.totalEnrolled > 0 ? Math.round((enrollmentData.activeStudents / enrollmentData.totalEnrolled) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Enrollment Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <EnhancedBarChart
              data={enrollmentData.monthlyEnrollment}
              xKey="month"
              yKeys={[{ key: 'new', name: 'New Enrollments', color: '#3b82f6' }]}
              title="Monthly Enrollment Trend"
            />
          </div>

          {/* Pending Enrollment Requests */}
          {enrollmentData.enrollmentRequests.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <p className="font-bold text-gray-900">📋 Pending Enrollment Requests</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Student Name</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Parent</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Grade Level</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Age</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Request Date</th>
                      <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentData.enrollmentRequests.filter((r) => r.status === 'pending').map((req) => (
                      <tr key={req.requestId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{req.studentName}</td>
                        <td className="px-6 py-3 text-gray-600">{req.parentName}</td>
                        <td className="px-6 py-3 text-gray-600">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {req.gradeLevel}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{req.studentAge} years</td>
                        <td className="px-6 py-3 text-gray-600">
                          {new Date(req.requestDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800`}>
                            Pending
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center space-x-2">
                          <button
                            onClick={() => approveEnrollment(req.requestId)}
                            className="text-green-600 hover:text-green-700 font-medium text-xs"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => rejectEnrollment(req.requestId)}
                            className="text-red-600 hover:text-red-700 font-medium text-xs"
                          >
                            ✕ Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex gap-4 flex-wrap items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Students</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Enrolled Students Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <p className="font-bold text-gray-900">Enrolled Students ({filteredStudents.length})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Student Name</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Grade</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Parent</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Enrollment Date</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Fees Paid</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.studentId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{student.name}</td>
                      <td className="px-6 py-3 text-gray-600 text-sm">{student.email}</td>
                      <td className="px-6 py-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {student.gradeLevel}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{student.parent}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {new Date(student.enrollmentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="text-sm">
                          <p className="font-bold text-gray-900">₹{student.feesPaid}</p>
                          <p className="text-gray-600">of ₹{student.feesTotal}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enrollment Form Modal */}
          {showEnrollmentForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <p className="font-bold text-gray-900 text-lg">New Enrollment Request</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Student Name"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg col-span-2"
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      value={formData.studentAge}
                      onChange={(e) => setFormData({ ...formData, studentAge: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <select
                      value={formData.gradeLevel}
                      onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option>Select Grade</option>
                      {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Parent Name"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg col-span-2"
                    />
                    <input
                      type="email"
                      placeholder="Parent Email"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="tel"
                      placeholder="Parent Phone"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <textarea
                      placeholder="Address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg col-span-2 h-20 resize-none"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={submitEnrollment}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Submit Request
                  </button>
                  <button
                    onClick={() => setShowEnrollmentForm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
