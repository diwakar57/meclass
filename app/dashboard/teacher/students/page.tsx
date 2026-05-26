'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { StudentTable, type Student } from '@/components/dashboard/student-table';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentListPage');

interface StudentFilterState {
  search: string;
  gradeLevel?: string;
  className?: string;
  section?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'graduated';
  riskLevel?: 'low' | 'medium' | 'high';
}

interface StudentListPageProps {
  role?: string;
}

const GRADE_LEVELS = [
  'Nursery',
  'KG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

const ENROLLMENT_STATUSES = ['active', 'inactive', 'suspended', 'graduated'];
const RISK_LEVELS = ['low', 'medium', 'high'];

export const StudentListPage: React.FC<StudentListPageProps> = ({ role = 'teacher' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<StudentFilterState>({
    search: '',
  });
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const pageSize = 25;

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('pageSize', pageSize.toString());
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);

        if (filters.search) params.append('search', filters.search);
        if (filters.gradeLevel) params.append('gradeLevel', filters.gradeLevel);
        if (filters.className) params.append('className', filters.className);
        if (filters.section) params.append('section', filters.section);
        if (filters.status) params.append('status', filters.status);
        if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);

        const apiUrl = role === 'admin' ? '/api/admin/students' : '/api/teacher/students';
        const response = await fetch(`${apiUrl}?${params}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(
            `Failed to fetch students: ${errorPayload?.error || response.statusText || 'Request failed'}`
          );
        }

        const data = await response.json();
        setStudents(data.students || []);
        setTotalCount(data.totalCount || data.students?.length || 0);
      } catch (err) {
        log.error('Failed to fetch students:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(debounceTimer);
  }, [role, currentPage, pageSize, sortBy, sortOrder, filters]);

  const handleSelectRow = useCallback((student: Student, selected: boolean) => {
    setSelectedStudents((prev) => {
      const studentId = student.id || student.studentId;
      if (selected) {
        if (!prev.find((s) => (s.id || s.studentId) === studentId)) {
          return [...prev, student];
        }
      } else {
        return prev.filter((s) => (s.id || s.studentId) !== studentId);
      }
      return prev;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedStudents(students);
    } else {
      setSelectedStudents([]);
    }
  }, [students]);

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const handleRowAction = useCallback((action: string, student: Student) => {
    switch (action) {
      case 'view':
        // Navigate to student profile
        window.location.href = `/dashboard/${role}/student-detail?id=${student.id || student.studentId}`;
        break;
      case 'progress':
        // Navigate to student progress
        window.location.href = `/dashboard/student/progress?id=${student.id || student.studentId}`;
        break;
      case 'attendance':
        // Navigate to student attendance
        window.location.href = `/dashboard/${role}/student-detail?id=${student.id || student.studentId}&tab=attendance`;
        break;
      case 'grades':
        // Navigate to student grades
        window.location.href = `/dashboard/${role}/grades?studentId=${student.id || student.studentId}`;
        break;
      case 'contact':
        // Open contact modal or navigate to messaging
        window.location.href = `/dashboard/${role}/communications?studentId=${student.id || student.studentId}`;
        break;
      case 'edit':
        // Navigate to edit student form
        window.location.href = `/dashboard/admin/schools?edit=${student.id || student.studentId}`;
        break;
      case 'assign-class':
        log.info('Bulk action: assign class', selectedStudents.length);
        alert(`Would assign ${selectedStudents.length} students to a class`);
        break;
      case 'send-announcement':
        log.info('Bulk action: send announcement', selectedStudents.length);
        alert(`Would send message to ${selectedStudents.length} students`);
        break;
      case 'export':
        log.info('Bulk action: export', selectedStudents.length);
        alert(`Would export ${selectedStudents.length} students to CSV`);
        break;
      default:
        log.debug('Unknown action:', action);
    }
  }, [role, selectedStudents]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set<string>();
    students.forEach((s) => {
      if (s.className) classes.add(s.className);
    });
    return Array.from(classes).sort();
  }, [students]);

  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    students.forEach((s) => {
      if (s.section) sections.add(s.section);
    });
    return Array.from(sections).sort();
  }, [students]);

  return (
    <DashboardLayout role={role} pageTitle="Student Management">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="mt-1 text-gray-600">
              {totalCount} student{totalCount !== 1 ? 's' : ''} in your school
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            ✚ Add Student
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Search</label>
                <input
                  type="text"
                  placeholder="Name, ID, email..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Grade Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Grade Level</label>
                <select
                  value={filters.gradeLevel || ''}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      gradeLevel: e.target.value || undefined,
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Grades</option>
                  {GRADE_LEVELS.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Class</label>
                <select
                  value={filters.className || ''}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      className: e.target.value || undefined,
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Section</label>
                <select
                  value={filters.section || ''}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      section: e.target.value || undefined,
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enrollment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      status: (e.target.value as any) || undefined,
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {ENROLLMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Risk Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                <select
                  value={filters.riskLevel || ''}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      riskLevel: (e.target.value as any) || undefined,
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Risk Levels</option>
                  {RISK_LEVELS.map((risk) => (
                    <option key={risk} value={risk}>
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {Object.values(filters).some((v) => v) && (
              <button
                onClick={() => {
                  setFilters({ search: '' });
                  setCurrentPage(1);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Student Table */}
        <StudentTable
          students={students}
          loading={loading}
          error={error}
          selectable={true}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          selectedStudents={selectedStudents}
          onRowAction={handleRowAction}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          totalCount={totalCount}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          showColumns={[
            'name',
            'studentId',
            'grade',
            'className',
            'enrollmentStatus',
            'overallMastery',
            'attendanceRate',
            'recentQuizScore',
            'riskLevel',
            'actions',
          ]}
        />

        {/* Stats Footer */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Active Students</p>
            <p className="text-2xl font-bold text-green-600">
              {students.filter((s) => s.enrollmentStatus === 'active').length}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">At-Risk Students</p>
            <p className="text-2xl font-bold text-red-600">
              {students.filter((s) => s.riskLevel === 'high').length}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Avg. Mastery</p>
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(
                students.reduce((sum, s) => sum + (s.overallMastery || 0), 0) / (students.length || 1)
              )}%
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentListPage;
