'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart, EnhancedLineChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherStudentDetail');

interface StudentDetail {
  studentId: string;
  name: string;
  email: string;
  avatar?: string;
  class: string;
  enrollmentDate: string;
  performanceMetrics: {
    currentGPA: number;
    classAverage: number;
    previousGPA: number;
    improvementTrend: number;
  };
  engagement: {
    attendanceRate: number;
    classParticipation: number;
    assignmentSubmissionRate: number;
    quizAttempts: number;
  };
  recentAssignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    submittedDate?: string;
    score?: number;
    maxScore: number;
    status: 'submitted' | 'pending' | 'overdue' | 'not-submitted';
  }>;
  gradeHistory: Array<{ assessment: string; score: number; date: string }>;
  performanceTrend: Array<{ week: string; average: number }>;
  behaviorSummary: Array<{ category: string; remarks: number }>;
  strengths: string[];
  areasForImprovement: string[];
  parentContact: {
    email: string;
    phone: string;
    preferredContactMethod: string;
  };
}

export default function TeacherStudentDetailPage() {
  const [studentData, setStudentData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setStudentId(id);
      fetchStudentDetail(id);
    }
  }, []);

  async function fetchStudentDetail(id: string) {
    try {
      const response = await fetch(`/api/teacher/students/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch student details');
      const data = await response.json();
      setStudentData(data.data);
    } catch (err) {
      log.error('Failed to load student details', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleContactParent() {
    if (!studentData) return;
    try {
      const response = await fetch(`/api/teacher/students/${studentData.studentId}/contact-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: contactMessage }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      setShowContactModal(false);
      setContactMessage('');
    } catch (err) {
      log.error('Failed to send message', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Student Detail" subtitle="Review student performance and engagement">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading student details...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!studentData) {
    return (
      <DashboardLayout title="Student Detail" subtitle="Review student performance and engagement">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Student not found. Please select a student from the classes page.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const assignmentColumns = [
    {
      key: 'title',
      label: 'Assignment',
      render: (value: string) => <span className="font-bold text-blue-600">{value}</span>,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'submittedDate',
      label: 'Submitted',
      render: (value?: string) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
    {
      key: 'score',
      label: 'Score',
      render: (value?: number, row: any) => (
        <span className={`font-bold ${value ? 'text-green-600' : 'text-gray-400'}`}>
          {value ? `${value}/${row.maxScore}` : 'Not Graded'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          submitted: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          overdue: 'bg-red-100 text-red-800',
          'not-submitted': 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[value] || 'bg-gray-100'}`}>
            {value.replace('-', ' ')}
          </span>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Student Detail" subtitle="In-depth performance analysis">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Student Header */}
          <div className="bg-white rounded-lg shadow p-8 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {studentData.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{studentData.name}</h2>
                    <p className="text-gray-600">Class: {studentData.class}</p>
                    <p className="text-sm text-gray-500">Enrolled: {new Date(studentData.enrollmentDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowContactModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                📧 Contact Parent
              </button>
            </div>
          </div>

          {/* Contact Parent Modal */}
          {showContactModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 w-96 shadow-lg">
                <h3 className="text-lg font-bold mb-4">Contact Parent</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Email: {studentData.parentContact.email}
                </p>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                  placeholder="Type your message..."
                  rows={6}
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleContactParent}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          <MetricsGrid columns={4}>
            <SummaryCard
              title="Current GPA"
              value={studentData.performanceMetrics.currentGPA.toFixed(2)}
              icon="📚"
              backgroundColor="bg-blue-50"
            />
            <SummaryCard
              title="Class Average"
              value={`${Math.round(studentData.performanceMetrics.classAverage)}%`}
              icon="📊"
              backgroundColor="bg-purple-50"
            />
            <SummaryCard
              title="Attendance"
              value={`${Math.round(studentData.engagement.attendanceRate)}%`}
              icon="✅"
              backgroundColor="bg-green-50"
            />
            <SummaryCard
              title="Assignment Completion"
              value={`${Math.round(studentData.engagement.assignmentSubmissionRate)}%`}
              icon="📤"
              backgroundColor="bg-orange-50"
            />
          </MetricsGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Performance Trend" description="Weekly average scores">
              <EnhancedLineChart
                data={studentData.performanceTrend}
                xKey="week"
                yKey="average"
                color="#3b82f6"
              />
            </ChartCard>

            <ChartCard title="Behavior Summary" description="Classroom conduct remarks">
              <EnhancedBarChart data={studentData.behaviorSummary} color="#f59e0b" />
            </ChartCard>
          </div>

          {/* Strengths & Areas for Improvement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <h3 className="font-bold text-gray-900 mb-4">✨ Strengths</h3>
              <ul className="space-y-2">
                {studentData.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <h3 className="font-bold text-gray-900 mb-4">📈 Areas for Improvement</h3>
              <ul className="space-y-2">
                {studentData.areasForImprovement.map((area, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-orange-600">→</span>
                    <span className="text-gray-700">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">📝 Recent Assignments</h3>
            <div className="bg-white rounded-lg shadow">
              <DataTable columns={assignmentColumns} data={studentData.recentAssignments} />
            </div>
          </div>

          {/* Grade History */}
          <ChartCard title="Assessment Score History" description="Chronological grade records">
            <EnhancedLineChart
              data={studentData.gradeHistory.map(g => ({
                assessment: g.assessment,
                score: g.score,
                date: new Date(g.date).toLocaleDateString()
              }))}
              xKey="date"
              yKey="score"
              color="#8b5cf6"
            />
          </ChartCard>

          {/* Parent Contact Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-900 mb-4">👨‍👩‍👧 Parent Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-base font-bold text-blue-600 mt-1">{studentData.parentContact.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-base font-bold text-blue-600 mt-1">{studentData.parentContact.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Preferred Contact</p>
                <p className="text-base font-bold text-blue-600 mt-1">{studentData.parentContact.preferredContactMethod}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
