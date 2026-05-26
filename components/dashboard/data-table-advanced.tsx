'use client';

import React, { useState, useMemo } from 'react';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  error?: string;
  pagination?: {
    total: number;
    pageSize: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort?: (key: string) => void;
  };
  rowsPerPage?: number;
  onRowsPerPageChange?: (rows: number) => void;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectRow?: (rowId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  striped?: boolean;
  hover?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  loading = false,
  error,
  pagination,
  sorting,
  rowsPerPage = 10,
  onRowsPerPageChange,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  onRowClick,
  emptyMessage = 'No data available',
  striped = true,
  hover = true,
}) => {
  const [localPage, setLocalPage] = useState(1);
  const [localSortBy, setLocalSortBy] = useState<string | undefined>();
  const [localSortOrder, setLocalSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sorting?.onSort) {
      sorting.onSort(key);
    } else {
      if (localSortBy === key) {
        setLocalSortOrder(localSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setLocalSortBy(key);
        setLocalSortOrder('asc');
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full p-8 text-center">
        <div className="inline-block">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
        <p className="mt-4 text-gray-600">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Error loading data</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  const allSelected = data.length > 0 && data.every((row: any) => selectedRows.includes(row.id || row.studentId));
  const someSelected = selectedRows.length > 0 && !allSelected;

  return (
    <div className="space-y-4">
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
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`px-4 py-3 text-left text-sm font-semibold text-gray-700 ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="text-xs text-gray-400">
                        {localSortBy === column.key ? (localSortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const rowId = row.id || row.studentId;
              const isSelected = selectedRows.includes(rowId);
              const isStriped = striped && idx % 2 === 1;

              return (
                <tr
                  key={rowId}
                  className={`border-b border-gray-200 transition-colors ${
                    isStriped ? 'bg-gray-50' : 'bg-white'
                  } ${hover ? 'hover:bg-blue-50' : ''} ${onRowClick ? 'cursor-pointer' : ''} ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {selectable && (
                    <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectRow?.(rowId, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={`${rowId}-${column.key}`}
                      className={`px-4 py-3 text-sm text-gray-900 ${
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.pageSize, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            {onRowsPerPageChange && (
              <select
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(parseInt(e.target.value))}
                className="rounded border border-gray-300 px-3 py-1 text-sm"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            )}
            <nav className="flex gap-1">
              <button
                onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
                disabled={pagination.currentPage === 1}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <div className="flex items-center px-3 py-1 text-sm">
                Page {pagination.currentPage} of {Math.ceil(pagination.total / pagination.pageSize)}
              </div>
              <button
                onClick={() =>
                  pagination.onPageChange(Math.min(Math.ceil(pagination.total / pagination.pageSize), pagination.currentPage + 1))
                }
                disabled={pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize)}
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
