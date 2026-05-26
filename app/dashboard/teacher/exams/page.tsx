'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EnhancedBarChart } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('ExamManagement');

interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  scheduleDate: string;
  scheduleTime: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  notificationsSent: number;
  responseRate: number;
  status: 'draft' | 'published' | 'ongoing' | 'completed';
}

interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'short' | 'long' | 'numeric';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ExamData {
  exams: Exam[];
  totalExams: number;
  completedExams: number;
  upcomingExams: number;
  averageScore: number;
  scoreDistribution: Array<{ range: string; students: number }>;
  questionBank: Question[];
  statistics: {
    bySubject: Array<{ subject: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
}

export default function ExamManagementPage() {
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'ongoing' | 'completed'>('all');
  const [showNewExamModal, setShowNewExamModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    class: '',
    scheduleDate: '',
    scheduleTime: '',
    duration: 60,
    totalMarks: 100,
    passingMarks: 40,
  });

  useEffect(() => {
    fetchExamData();
  }, [filterStatus]);

  async function fetchExamData() {
    try {
      const response = await fetch(`/api/teacher/exams?status=${filterStatus}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch exam data');
      const data = await response.json();
      setExamData(data.data);
    } catch (err) {
      log.error('Failed to load exam data', err);
    } finally {
      setLoading(false);
    }
  }

  async function createExam() {
    try {
      const response = await fetch('/api/teacher/exams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create exam');
      alert('Exam created successfully');
      setShowNewExamModal(false);
      setFormData({
        title: '',
        subject: '',
        class: '',
        scheduleDate: '',
        scheduleTime: '',
        duration: 60,
        totalMarks: 100,
        passingMarks: 40,
      });
      fetchExamData();
    } catch (err) {
      log.error('Failed to create exam', err);
      alert('Failed to create exam');
    }
  }

  async function publishExam(examId: string) {
    try {
      const response = await fetch(`/api/teacher/exams/${examId}/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to publish exam');
      alert('Exam published successfully');
      fetchExamData();
    } catch (err) {
      log.error('Failed to publish exam', err);
      alert('Failed to publish exam');
    }
  }

  async function deleteExam(examId: string) {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      const response = await fetch(`/api/teacher/exams/${examId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete exam');
      alert('Exam deleted successfully');
      fetchExamData();
    } catch (err) {
      log.error('Failed to delete exam', err);
      alert('Failed to delete exam');
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Exam Management" subtitle="Create and manage exams">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="text-center py-12">Loading exam management...</div>
        </main>
      </DashboardLayout>
    );
  }

  if (!examData) {
    return (
      <DashboardLayout title="Exam Management" subtitle="Create and manage exams">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">Unable to load exam data.</p>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredExams = filterStatus === 'all' ? examData.exams : examData.exams.filter((e) => e.status === filterStatus);

  return (
    <DashboardLayout title="Exam Management" subtitle="Create, publish, and manage exams">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Header with Button */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-gray-900">Exam Management Dashboard</p>
              <p className="text-sm text-gray-600">Create and monitor student assessments</p>
            </div>
            <button
              onClick={() => setShowNewExamModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              + Create New Exam
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Exams</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{examData.totalExams}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{examData.completedExams}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{examData.upcomingExams}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Average Score</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{examData.averageScore.toFixed(1)}%</p>
            </div>
          </div>

          {/* Score Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <EnhancedBarChart
              data={examData.scoreDistribution}
              xKey="range"
              yKeys={[{ key: 'students', name: 'Number of Students', color: '#3b82f6' }]}
              title="Score Distribution"
            />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="font-bold text-gray-900 mb-4">Filter Exams</p>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'draft', 'published', 'ongoing', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Exams Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Exam Title</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Subject</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Class</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Schedule</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Duration</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Marks</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((exam) => (
                    <tr key={exam.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{exam.title}</td>
                      <td className="px-6 py-3 text-gray-600">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {exam.subject}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{exam.class}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {new Date(exam.scheduleDate).toLocaleDateString()} {exam.scheduleTime}
                      </td>
                      <td className="px-6 py-3 text-center text-gray-600">{exam.duration} min</td>
                      <td className="px-6 py-3 text-center text-gray-600">
                        {exam.passingMarks}/{exam.totalMarks}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                          {exam.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center space-x-2">
                        {exam.status === 'draft' && (
                          <button
                            onClick={() => publishExam(exam.id)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedExam(exam.id)}
                          className="text-purple-600 hover:text-purple-700 font-medium text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteExam(exam.id)}
                          className="text-red-600 hover:text-red-700 font-medium text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal for New Exam */}
          {showNewExamModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <p className="font-bold text-gray-900 text-lg">Create New Exam</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Exam Title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Class"
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="date"
                      value={formData.scheduleDate}
                      onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="time"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Duration (minutes)"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Total Marks"
                      value={formData.totalMarks}
                      onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Passing Marks"
                      value={formData.passingMarks}
                      onChange={(e) => setFormData({ ...formData, passingMarks: parseInt(e.target.value) })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={createExam}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Create Exam
                  </button>
                  <button
                    onClick={() => setShowNewExamModal(false)}
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
