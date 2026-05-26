/**
 * Advanced Dashboard Chart Components
 * Enhanced visualizations with better styling and interactivity
 */

'use client';

import React from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface MultiSeriesDataPoint {
  label: string;
  [key: string]: number | string;
}

/**
 * Enhanced Line Chart with gradient and smooth curves
 */
export function EnhancedLineChart({ 
  data, 
  title = '',
  color = '#3b82f6',
  height = 250 
}: { 
  data: DataPoint[]; 
  title?: string;
  color?: string;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;
  }

  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = Math.max(max - min, 1);
  
  const width = 600;
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - 40 - ((d.value - min) / range) * (height - 60);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${points[points.length - 1].x} ${height} L 0 ${height}`} fill={`url(#gradient-${title})`} />
        <path d={pathD} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} opacity="0.7" />
        ))}
      </svg>
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-gray-500">
        {data.slice(0, 4).map((d, i) => (
          <div key={i} className="truncate">
            <div className="font-medium text-gray-700">{d.label}</div>
            <div>{Math.round(d.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Enhanced Bar Chart with better spacing and labels
 */
export function EnhancedBarChart({
  data,
  title = '',
  color = '#3b82f6',
  height = 250,
  labelMaxLength = 14,
}: {
  data: DataPoint[];
  title?: string;
  color?: string;
  height?: number;
  labelMaxLength?: number;
}) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;
  }

  const max = Math.max(...data.map(d => d.value), 1);
  const width = 600;
  const barWidth = Math.max(30, (width - 60) / data.length - 5);
  const spacing = (width - 60) / data.length;
  const rotateLabels = data.length > 6;

  function compactLabel(label: string): string {
    if (label.length <= labelMaxLength) {
      return label;
    }
    return `${label.slice(0, Math.max(1, labelMaxLength - 1))}...`;
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {data.map((d, i) => {
          const x = 30 + i * spacing;
          const barHeight = (d.value / max) * (height - 60);
          const y = height - 40 - barHeight;
          return (
            <g key={i}>
              <rect 
                x={x} 
                y={y} 
                width={barWidth} 
                height={barHeight} 
                fill={color} 
                rx="3"
                opacity="0.8"
              />
              <text 
                x={x + barWidth / 2} 
                y={height - 5} 
                textAnchor="middle" 
                fontSize="11" 
                fill="#666"
                className="select-none"
                transform={rotateLabels ? `rotate(-20 ${x + barWidth / 2} ${height - 5})` : undefined}
              >
                {compactLabel(d.label)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>{Math.round(Math.min(...data.map(d => d.value)))}</span>
        <span>{Math.round(max)}</span>
      </div>
    </div>
  );
}

/**
 * Enhanced Donut Chart with center label
 */
export function EnhancedDonutChart({
  data,
  title = '',
  height = 250,
  centerValue = ''
}: {
  data: DataPoint[];
  title?: string;
  height?: number;
  centerValue?: string;
}) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const radius = height / 2 - 30;
  const innerRadius = radius * 0.6;
  const centerX = height / 2;
  const centerY = height / 2;

  let currentAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    const ix1 = centerX + innerRadius * Math.cos(startAngle);
    const iy1 = centerY + innerRadius * Math.sin(startAngle);
    const ix2 = centerX + innerRadius * Math.cos(endAngle);
    const iy2 = centerY + innerRadius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const path = `M ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${ix2} ${iy2} L ${x2} ${y2} A ${radius} ${radius} 0 ${largeArc} 0 ${x1} ${y1} Z`;

    currentAngle = endAngle;
    return { path, color: colors[i % colors.length], ...d };
  });

  return (
    <div className="w-full flex flex-col items-center">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3 w-full">{title}</h3>}
      <svg viewBox={`0 0 ${height} ${height}`} className="w-full h-auto max-w-xs">
        {slices.map((slice, i) => (
          <path key={i} d={slice.path} fill={slice.color} opacity="0.85" />
        ))}
        <text 
          x={centerX} 
          y={centerY} 
          textAnchor="middle" 
          dy="0.3em" 
          fontSize="18" 
          fontWeight="bold" 
          fill="#1f2937"
          className="select-none"
        >
          {centerValue}
        </text>
      </svg>
      <div className="mt-4 w-full grid grid-cols-2 gap-2">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }}></div>
            <span className="text-xs text-gray-600">
              {slice.label} ({Math.round((slice.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Gauge Chart - Single metric with color zones
 */
export function GaugeChart({
  value,
  max = 100,
  title = '',
  unit = '%',
  color = '#3b82f6'
}: {
  value: number;
  max?: number;
  title?: string;
  unit?: string;
  color?: string;
}) {
  const numericValue = Number(value);
  const numericMax = Number(max);

  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const safeMax = Number.isFinite(numericMax) && numericMax > 0 ? numericMax : 100;

  const rawPercentage = (safeValue / safeMax) * 100;
  const percentage = Number.isFinite(rawPercentage)
    ? Math.min(Math.max(rawPercentage, 0), 100)
    : 0;
  const angle = (percentage / 100) * 180 - 90;
  const radians = (angle * Math.PI) / 180;
  const arcX = 100 + 40 * Math.cos(radians);
  const arcY = 100 + 40 * Math.sin(radians);

  const safeArcX = Number.isFinite(arcX) ? arcX : 100;
  const safeArcY = Number.isFinite(arcY) ? arcY : 100;

  // Color zones: red (0-40%), yellow (40-70%), green (70-100%)
  let zoneColor = '#ef4444';
  if (percentage >= 70) zoneColor = '#10b981';
  else if (percentage >= 40) zoneColor = '#f59e0b';

  return (
    <div className="w-full flex flex-col items-center">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>}
      <div className="relative" style={{ width: 200, height: 120 }}>
        <svg viewBox="0 0 200 120" className="w-full h-auto">
          {/* Background arc */}
          <path
            d="M 50 100 A 50 50 0 0 1 150 100"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M 50 100 A 50 50 0 0 1 ${safeArcX} ${safeArcY}`}
            stroke={zoneColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={safeArcX}
            y2={safeArcY}
            stroke={zoneColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="4" fill={zoneColor} />
        </svg>
      </div>
      <div className="mt-4 text-center">
        <div className="text-3xl font-bold text-gray-900">{Math.round(percentage)}{unit}</div>
        <div className="text-xs text-gray-500 mt-1">{Math.round(safeValue)} / {safeMax}</div>
      </div>
    </div>
  );
}

/**
 * Heatmap - Student × Topic matrix
 */
export function HeatmapChart({
  data,
  title = '',
  height = 300
}: {
  data: Array<{ student: string; topic: string; value: number }>;
  title?: string;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;
  }

  const students = [...new Set(data.map(d => d.student))];
  const topics = [...new Set(data.map(d => d.topic))];
  const cellWidth = Math.max(30, (600 - 100) / Math.max(topics.length, 1));
  const cellHeight = Math.max(25, (height - 60) / Math.max(students.length, 1));

  const getColor = (value: number) => {
    if (value < 40) return '#ef4444';
    if (value < 60) return '#f59e0b';
    if (value < 80) return '#fbbf24';
    return '#10b981';
  };

  return (
    <div className="w-full overflow-x-auto">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>}
      <table className="border-collapse">
        <thead>
          <tr>
            <td className="w-24"></td>
            {topics.map((topic, i) => (
              <th key={i} className="text-xs font-medium text-gray-600 px-1 py-2 text-center" style={{ width: cellWidth }}>
                {topic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student, si) => (
            <tr key={si}>
              <th className="text-xs font-medium text-gray-600 text-left pr-2 py-1">{student}</th>
              {topics.map((topic, ti) => {
                const cell = data.find(d => d.student === student && d.topic === topic);
                const value = cell?.value || 0;
                return (
                  <td
                    key={ti}
                    className="border text-center text-xs font-medium text-white py-2"
                    style={{
                      backgroundColor: getColor(value),
                      width: cellWidth,
                      opacity: 0.8
                    }}
                  >
                    {Math.round(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Pie Chart with labels outside
 */
export function PieChart({
  data,
  title = '',
  height = 250
}: {
  data: DataPoint[];
  title?: string;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;
  }

  const total = data.reduce((sum, d) => d.value + sum, 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const radius = 50;
  const centerX = 80;
  const centerY = 80;

  let currentAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    currentAngle = endAngle;
    return { path, color: colors[i % colors.length], percentage: (d.value / total) * 100, ...d };
  });

  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>}
      <div className="flex gap-4">
        <svg viewBox="0 0 160 160" className="w-40 h-40">
          {slices.map((slice, i) => (
            <path key={i} d={slice.path} fill={slice.color} opacity="0.85" />
          ))}
        </svg>
        <div className="flex-1 space-y-2">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }}></div>
              <span className="text-sm text-gray-600">{slice.label}</span>
              <span className="ml-auto text-sm font-medium text-gray-900">{Math.round(slice.percentage)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Stacked Bar Chart
 */
export function StackedBarChart({
  data,
  title = '',
  series = ['series1', 'series2']
}: {
  data: MultiSeriesDataPoint[];
  title?: string;
  series?: string[];
}) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;
  }

  const height = 200;
  const width = 600;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const max = Math.max(
    ...data.map(d => series.reduce((sum, s) => sum + ((d[s] as number) || 0), 0))
  );

  const barWidth = Math.max(30, (width - 60) / data.length - 5);
  const spacing = (width - 60) / data.length;

  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {data.map((d, i) => {
          let y = height - 40;
          return (
            <g key={i}>
              {series.map((s, si) => {
                const value = (d[s] as number) || 0;
                const barHeight = (value / max) * (height - 60);
                const startY = y - barHeight;
                return (
                  <rect
                    key={si}
                    x={30 + i * spacing}
                    y={startY}
                    width={barWidth}
                    height={barHeight}
                    fill={colors[si % colors.length]}
                    rx="2"
                    opacity="0.85"
                  />
                );
              })}
              <text
                x={30 + i * spacing + barWidth / 2}
                y={height - 5}
                textAnchor="middle"
                fontSize="11"
                fill="#666"
                className="select-none"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Spark Chart - Mini inline chart
 */
export function SparkChart({
  data,
  color = '#3b82f6'
}: {
  data: number[];
  color?: string;
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const height = 30;
  const width = 100;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-6">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}
