/**
 * Reusable Dashboard Utility Components
 */

'use client';

import React from 'react';

/**
 * Summary Card - Shows a metric with trend
 */
export function SummaryCard({
  title,
  value,
  unit = '',
  trend,
  trendLabel = '',
  icon = '📊',
  backgroundColor = 'bg-blue-50',
  borderColor = 'border-blue-200',
}: {
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  icon?: string;
  backgroundColor?: string;
  borderColor?: string;
}) {
  const trendIsPositive = (trend || 0) >= 0;

  return (
    <div className={`${backgroundColor} border ${borderColor} rounded-lg p-6 shadow-sm hover:shadow-md transition`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-lg text-gray-600">{unit}</span>}
          </div>

          {trend !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${trendIsPositive ? 'text-green-600' : 'text-red-600'}`}>
              <span>{trendIsPositive ? '↑' : '↓'} {Math.abs(trend)}%</span>
              {trendLabel && <span className="text-gray-500">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

/**
 * Alerts Panel - Shows warnings and important notices
 */
export function AlertsPanel({
  alerts,
  onDismiss,
}: {
  alerts: Array<{
    id: string;
    type: 'warning' | 'danger' | 'info';
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  }>;
  onDismiss?: (id: string) => void;
}) {
  if (!alerts || alerts.length === 0) return null;

  const typeColors = {
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚠️', text: 'text-yellow-800' },
    danger: { bg: 'bg-red-50', border: 'border-red-200', icon: '🚨', text: 'text-red-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'ℹ️', text: 'text-blue-800' },
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const colors = typeColors[alert.type];
        return (
          <div key={alert.id} className={`${colors.bg} border ${colors.border} rounded-lg p-4 flex gap-3`}>
            <span className="text-lg mt-1">{colors.icon}</span>
            <div className="flex-1">
              <h4 className={`${colors.text} font-semibold text-sm`}>{alert.title}</h4>
              {alert.description && <p className={`${colors.text} text-sm mt-1 opacity-80`}>{alert.description}</p>}
            </div>
            {alert.action && (
              <button
                onClick={alert.action.onClick}
                className={`${colors.text} underline text-sm font-medium whitespace-nowrap ml-2 hover:opacity-70`}
              >
                {alert.action.label}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className={`${colors.text} text-lg leading-none hover:opacity-70 ml-2`}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Metrics Grid - Responsive grid layout for summary cards
 */
export function MetricsGrid({
  children,
  columns = 4,
}: {
  children: React.ReactNode;
  columns?: number;
}) {
  const colClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }[columns] || 'md:grid-cols-4';

  return <div className={`grid grid-cols-1 gap-4 ${colClass}`}>{children}</div>;
}

/**
 * Chart Card - Container for a chart with title and description
 */
export function ChartCard({
  title,
  description,
  children,
  actions,
  loading = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <div className="animate-spin text-2xl mb-2">⏳</div>
            <p>Loading...</p>
          </div>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

/**
 * Status Badge - Shows status with color coding
 */
export function StatusBadge({
  status,
  label,
}: {
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  label: string;
}) {
  const colors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-gray-100 text-gray-800',
  };

  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors[status]}`}>{label}</span>;
}

/**
 * Loading Skeleton - Placeholder while loading
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse ${className}`}></div>;
}

/**
 * Empty State - Shows when no data available
 */
export function EmptyState({
  title = 'No data',
  description = 'Data will appear here when available.',
  icon = '📭',
}: {
  title?: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="text-sm mt-1">{description}</p>
    </div>
  );
}

/**
 * Data Table - Responsive table for list data
 */
export function DataTable({
  columns,
  data,
  striped = true,
}: {
  columns: Array<{ key: string; label: string; render?: (value: any) => React.ReactNode }>;
  data: Array<{ [key: string]: any }>;
  striped?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3 text-left font-semibold text-gray-700">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={ri}
              className={`border-b border-gray-200 transition ${striped && ri % 2 === 0 ? 'bg-gray-50' : ''} hover:bg-gray-100`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-3 text-gray-900">
                  {col.render ? col.render(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Progress Ring - Circular progress indicator
 */
export function ProgressRing({
  percentage,
  size = 120,
  stroke = 8,
  label,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3b82f6"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all"
        />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{Math.round(percentage)}%</div>
        {label && <div className="text-xs text-gray-600 mt-1">{label}</div>}
      </div>
    </div>
  );
}
