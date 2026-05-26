'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable, ChartCard, SummaryCard, MetricsGrid } from '@/components/dashboard/dashboard-components';
import { EnhancedBarChart } from '@/components/dashboard/advanced-charts';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherGradebook');

interface Student {
  id: string;
  name: string;
  email: string;
}

interface GradeEntry {
  studentId: string;
  studentName: string;
  assignment: string;
  score: number;
  maxScore: number;
  weight?: number;
  submittedAt?: string;
  status: 'graded' | 'pending' | 'not-submitted';
}

interface ClassGradebook {
  classId: string;
  className: string;
  students: Student[];
  grades: GradeEntry[];
  averageClassGrade: number;
  highestGrade: number;
  lowestGrade: number;
}

export default function TeacherGradesPage() {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [gradebooks, setGradebooks] = useState<ClassGradebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingGrade, setEditingGrade] = useState<{ studentId: string; assignment: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');

  useEffect(() => {
    fetchGradebooks();
  }, [selectedClass]);

  async function fetchGradebooks() {
    try {
      setLoadError(null);
      let url = '/api/gradebook';
      if (selectedClass !== 'all') {
        url += `/${selectedClass}`;
      }
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        const message =
          data?.error ||
          (response.status === 403 ? 'You do not have permission to view gradebooks.' : null) ||
          'Failed to fetch gradebooks';
        throw new Error(message);
      }
      setGradebooks(Array.isArray(data.data) ? data.data : [data.data]);
    } catch (err) {
      log.error('Failed to load gradebooks', err);
      setGradebooks([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load gradebooks');
    } finally {
      setLoading(false);
    }
  }

  async function handleGradeSubmit(studentId: string, assignment: string, newScore: number) {
    try {
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentId,
          assignment,
          score: newScore,
          classId: selectedClass !== 'all' ? selectedClass : undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to save grade');
      await fetchGradebooks();
      setEditingGrade(null);
    } catch (err) {
      log.error('Failed to save grade', err);
    }
  }

  const currentGradebook = gradebooks[0];

  if (loading) {
    return (
      <DashboardLayout title="Gradebook" subtitle="Track and manage student grades">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!currentGradebook || currentGradebook.grades.length === 0) {
    return (
      <DashboardLayout title="Gradebook" subtitle="Track and manage student grades">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              {loadError ? <p className="text-red-600 mb-2">{loadError}</p> : null}
              <p className="text-gray-600">No grades recorded yet. Create assignments to start grading.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const gradeDistribution = [
    { label: 'A (90-100%)', value: currentGradebook.grades.filter(g => (g.score / g.maxScore) * 100 >= 90).length },
    { label: 'B (80-89%)', value: currentGradebook.grades.filter(g => {
      const pct = (g.score / g.maxScore) * 100;
      return pct >= 80 && pct < 90;
    }).length },
    { label: 'C (70-79%)', value: currentGradebook.grades.filter(g => {
      const pct = (g.score / g.maxScore) * 100;
      return pct >= 70 && pct < 80;
    }).length },
    { label: 'D (60-69%)', value: currentGradebook.grades.filter(g => {
      const pct = (g.score / g.maxScore) * 100;
      return pct >= 60 && pct < 70;
    }).length },
    { label: 'F (<60%)', value: currentGradebook.grades.filter(g => (g.score / g.maxScore) * 100 < 60).length },
  ];

  const studentGradeAverages = currentGradebook.students.map((student) => {
    const studentGrades = currentGradebook.grades.filter(g => g.studentId === student.id);
    const average = studentGrades.length > 0
      ? (studentGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / studentGrades.length)
      : 0;
    return { name: student.name, average: Math.round(average) };
  });

  const columns = [
    {
      key: 'studentName',
      label: 'Student',
      render: (value: string) => <span className="font-bold">{value}</span>,
    },
    {
      key: 'assignment',
      label: 'Assignment',
      render: (value: string) => value,
    },
    {
      key: 'score',
      label: 'Score',
      render: (value: number, row: GradeEntry) => (
        <div className="text-center">
          <span className="font-bold text-blue-600">{value}/{row.maxScore}</span>
          <p className="text-xs text-gray-500">{Math.round((value / row.maxScore) * 100)}%</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const colors: any = {
          graded: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          'not-submitted': 'bg-red-100 text-red-800',
        };
        return <span className={`px-3 py-1 rounded-full text-sm ${colors[value] || 'bg-gray-100'}`}>{value}</span>;
      },
    },
    {
      key: 'id',
      label: 'Action',
      render: (value: string, row: GradeEntry) => (
        <button
          onClick={() => {
            setEditingGrade({ studentId: row.studentId, assignment: row.assignment });
            setEditValue(row.score.toString());
          }}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Gradebook" subtitle="Enter and manage student grades">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* View Mode Toggle */}
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-6 py-2 rounded-lg font-medium ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('detail')}
              className={`px-6 py-2 rounded-lg font-medium ${
                viewMode === 'detail'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Statistics
            </button>
          </div>

          {/* Edit Grade Modal */}
          {editingGrade && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 w-96 shadow-lg">
                <h3 className="text-lg font-bold mb-4">Edit Grade</h3>
                <p className="text-gray-600 mb-4">
                  {editingGrade.assignment} - Enter new score
                </p>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                  placeholder="Score"
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      handleGradeSubmit(editingGrade.studentId, editingGrade.assignment, parseFloat(editValue));
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingGrade(null)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics View */}
          {viewMode === 'detail' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <MetricsGrid columns={4}>
                <SummaryCard
                  title="Class Average"
                  value={`${Math.round(currentGradebook.averageClassGrade)}%`}
                  icon="📊"
                  backgroundColor="bg-blue-50"
                />
                <SummaryCard
                  title="Highest Grade"
                  value={`${Math.round(currentGradebook.highestGrade)}%`}
                  icon="⭐"
                  backgroundColor="bg-green-50"
                />
                <SummaryCard
                  title="Lowest Grade"
                  value={`${Math.round(currentGradebook.lowestGrade)}%`}
                  icon="⚠️"
                  backgroundColor="bg-red-50"
                />
                <SummaryCard
                  title="Total Grades"
                  value={currentGradebook.grades.length}
                  icon="📝"
                  backgroundColor="bg-purple-50"
                />
              </MetricsGrid>

              {/* Grade Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Grade Distribution" description="By letter grade">
                  <EnhancedBarChart data={gradeDistribution} color="#3b82f6" />
                </ChartCard>

                <ChartCard title="Student Averages" description="Grade average per student">
                  <EnhancedBarChart data={studentGradeAverages} color="#10b981" />
                </ChartCard>
              </div>

              {/* Grading Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Graded</p>
                  <p className="text-4xl font-bold mt-2 text-green-600">
                    {currentGradebook.grades.filter(g => g.status === 'graded').length}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-4xl font-bold mt-2 text-yellow-600">
                    {currentGradebook.grades.filter(g => g.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600">Not Submitted</p>
                  <p className="text-4xl font-bold mt-2 text-red-600">
                    {currentGradebook.grades.filter(g => g.status === 'not-submitted').length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Grades Table View */}
          {viewMode === 'grid' && (
            <div className="bg-white rounded-lg shadow">
              <DataTable columns={columns} data={currentGradebook.grades} />
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
