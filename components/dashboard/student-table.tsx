'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentTable');

export interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  gradeLevel?: string;
  className?: string;
  section?: string;
  schoolName?: string;
  parentName?: string;
  enrollmentStatus?: 'active' | 'inactive' | 'suspended' | 'graduated';
  overallMastery?: number;
  attendanceRate?: number;
  recentQuizScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  learningStyle?: string;
  lastActive?: string;
  feesStatus?: 'paid' | 'pending' | 'overdue';
  lastActivityAt?: string;
  diagnosticScore?: number;
}

export interface StudentTableProps {
  students: Student[];
  loading?: boolean;
  error?: string;
  selectable?: boolean;
  onSelectRow?: (student: Student, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onRowAction?: (action: string, student: Student) => void;
  selectedStudents?: Student[];
  pageSize?: number;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  totalCount?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  showColumns?: string[];
}

const DEFAULT_COLUMNS = [
  'name',
  'studentId',
  'grade',
  'className',
  'enrollmentStatus',
  'overallMastery',
  'attendanceRate',
  'recentQuizScore',
  'actions',
];

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  loading = false,
  error,
  selectable = true,
  onSelectRow,
  onSelectAll,
  onRowAction,
  selectedStudents = [],
  pageSize = 25,
  onPageChange,
  currentPage = 1,
  totalCount = 0,
  sortBy = 'name',
  sortOrder = 'asc',
  onSort,
  showColumns = DEFAULT_COLUMNS,
}) => {
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(
    new Set(selectedStudents.map((s) => s.id || s.studentId))
  );

  const handleSelectRow = useCallback(
    (student: Student, selected: boolean) => {
      const studentId = student.id || student.studentId;
      const newSelected = new Set(localSelectedIds);
      if (selected) {
        newSelected.add(studentId);
      } else {
        newSelected.delete(studentId);
      }
      setLocalSelectedIds(newSelected);
      onSelectRow?.(student, selected);
    },
    [localSelectedIds, onSelectRow]
  );

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setLocalSelectedIds(new Set(students.map((s) => s.id || s.studentId)));
        students.forEach((s) => onSelectRow?.(s, true));
      } else {
        setLocalSelectedIds(new Set());
        students.forEach((s) => onSelectRow?.(s, false));
      }
      onSelectAll?.(selected);
    },
    [students, onSelectRow, onSelectAll]
  );

  const allSelected = students.length > 0 && students.every((s) => localSelectedIds.has(s.id || s.studentId));
  const someSelected = localSelectedIds.size > 0 && !allSelected;

  const renderCell = (student: Student, column: string) => {
    switch (column) {
      case 'name':
        return (
          <div>
            <p className="font-medium text-gray-900">{student.name}</p>
            <p className="text-sm text-gray-600">{student.email}</p>
          </div>
        );
      case 'studentId':
        return (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            {student.studentId}
          </span>
        );
      case 'grade':
        return <span className="text-gray-700">{student.gradeLevel || '-'}</span>;
      case 'className':
        return (
          <span className="text-gray-700">
            {student.className} {student.section ? `(${student.section})` : ''}
          </span>
        );
      case 'school':
        return <span className="text-sm text-gray-700">{student.schoolName || '-'}</span>;
      case 'parent':
        return <span className="text-sm text-gray-700">{student.parentName || '-'}</span>;
      case 'enrollmentStatus':
        const statusColors: any = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          suspended: 'bg-red-100 text-red-800',
          graduated: 'bg-blue-100 text-blue-800',
        };
        return (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              statusColors[student.enrollmentStatus || 'active'] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {student.enrollmentStatus || 'Active'}
          </span>
        );
      case 'overallMastery':
        const mastery = student.overallMastery || 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-24 overflow-hidden rounded-full bg-gray-200 h-2">
              <div
                className={`h-full transition-all ${
                  mastery >= 80 ? 'bg-green-500' : mastery >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                }`}
                style={{ width: `${mastery}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 w-12 text-right">{Math.round(mastery)}%</span>
          </div>
        );
      case 'attendanceRate':
        const attendance = student.attendanceRate || 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-24 overflow-hidden rounded-full bg-gray-200 h-2">
              <div
                className={`h-full ${attendance >= 90 ? 'bg-green-500' : attendance >= 75 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                style={{ width: `${attendance}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 w-12 text-right">{Math.round(attendance)}%</span>
          </div>
        );
      case 'recentQuizScore':
        return (
          <span className="text-sm font-medium text-gray-700">
            {student.recentQuizScore !== undefined ? `${Math.round(student.recentQuizScore)}%` : '-'}
          </span>
        );
      case 'riskLevel':
        const riskColors: any = {
          low: 'bg-green-100 text-green-800',
          medium: 'bg-yellow-100 text-yellow-800',
          high: 'bg-red-100 text-red-800',
        };
        return (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              riskColors[student.riskLevel || 'low'] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {student.riskLevel || 'Low'}
          </span>
        );
      case 'lastActive':
        return (
          <span className="text-sm text-gray-600">
            {student.lastActivityAt ? new Date(student.lastActivityAt).toLocaleDateString() : '-'}
          </span>
        );
      case 'feesStatus':
        const feeColors: any = {
          paid: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          overdue: 'bg-red-100 text-red-800',
        };
        return (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              feeColors[student.feesStatus || 'paid'] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {student.feesStatus || 'Paid'}
          </span>
        );
      case 'actions':
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRowAction?.('view', student);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              title="View Profile"
            >
              👁️ View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRowAction?.('progress', student);
              }}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
              title="View Progress"
            >
              📈 Progress
            </button>
            <div className="relative group">
              <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">⋮</button>
              <div className="absolute right-0 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg z-10 minw-max">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowAction?.('attendance', student);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  View Attendance
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowAction?.('grades', student);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  View Grades
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowAction?.('contact', student);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Contact Parent
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowAction?.('edit', student);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit Student
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <span>-</span>;
    }
  };

  if (loading) {
    return (
      <div className="w-full p-8 text-center">
        <div className="inline-block">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
        <p className="mt-4 text-gray-600">Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Error loading students</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">No students found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectable && localSelectedIds.size > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex justify-between items-center">
          <p className="text-sm font-medium text-blue-900">
            {localSelectedIds.size} student{localSelectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onRowAction?.('assign-class', { id: 'bulk', studentId: '' } as any)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Assign Class
            </button>
            <button
              onClick={() => onRowAction?.('send-announcement', { id: 'bulk', studentId: '' } as any)}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Send Message
            </button>
            <button
              onClick={() => onRowAction?.('export', { id: 'bulk', studentId: '' } as any)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Export
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
              )}
              {showColumns.map((col) => (
                <th
                  key={col}
                  onClick={() => col !== 'actions' && onSort?.(col)}
                  className={`px-4 py-3 text-left text-sm font-semibold text-gray-700 ${
                    col !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {col.charAt(0).toUpperCase() +
                        col.slice(1).replace(/([A-Z])/g, ' $1')}
                    </span>
                    {col !== 'actions' && sortBy === col && (
                      <span className="text-xs text-gray-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const studentId = student.id || student.studentId;
              const isSelected = localSelectedIds.has(studentId);

              return (
                <tr
                  key={studentId}
                  className={`border-b border-gray-200 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50 ${isSelected ? 'bg-blue-100' : ''}`}
                >
                  {selectable && (
                    <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(student, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                  )}
                  {showColumns.map((col) => (
                    <td key={`${studentId}-${col}`} className="px-4 py-3 text-sm text-gray-900">
                      {renderCell(student, col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of{' '}
            {totalCount} students
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1">
              <button
                onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <div className="flex items-center px-3 py-1 text-sm">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              <button
                onClick={() => onPageChange?.(Math.min(Math.ceil(totalCount / pageSize), currentPage + 1))}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};
