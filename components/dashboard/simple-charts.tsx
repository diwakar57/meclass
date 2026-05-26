'use client';

interface Point {
  label: string;
  value: number;
}

interface ChartProps {
  data: Point[];
  height?: number;
}

export function LineChart({ data, height = 180 }: ChartProps) {
  const w = 640;
  const h = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? w / (data.length - 1) : w;

  const points = data
    .map((d, i) => {
      const x = i * stepX;
      const y = h - (d.value / max) * (h - 20);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
        <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={points} />
      </svg>
      <div className="mt-2 grid grid-cols-6 gap-1 text-[11px] text-gray-500">
        {data.slice(0, 6).map((d) => (
          <span key={d.label} className="truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AreaChart({ data, height = 180 }: ChartProps) {
  const w = 640;
  const h = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? w / (data.length - 1) : w;

  const coords = data.map((d, i) => {
    const x = i * stepX;
    const y = h - (d.value / max) * (h - 20);
    return { x, y };
  });

  const path =
    coords.length > 0
      ? `M ${coords[0].x} ${h} L ${coords.map((c) => `${c.x} ${c.y}`).join(' L ')} L ${coords[coords.length - 1].x} ${h} Z`
      : '';

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
        <path d={path} fill="#bfdbfe" stroke="#2563eb" strokeWidth="2" />
      </svg>
      <div className="mt-2 grid grid-cols-6 gap-1 text-[11px] text-gray-500">
        {data.slice(0, 6).map((d) => (
          <span key={d.label} className="truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ data, height = 180 }: ChartProps) {
  const w = 640;
  const h = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = Math.max(16, Math.floor(w / Math.max(data.length, 1)) - 10);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
        {data.map((d, i) => {
          const x = i * (barW + 10) + 6;
          const barH = (d.value / max) * (h - 20);
          const y = h - barH;
          return <rect key={`${d.label}-${i}`} x={x} y={y} width={barW} height={barH} fill="#2563eb" rx="4" />;
        })}
      </svg>
      <div className="mt-2 grid grid-cols-4 gap-1 text-[11px] text-gray-500">
        {data.slice(0, 8).map((d) => (
          <span key={d.label} className="truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data }: { data: Point[] }) {
  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));
  const size = 180;
  const r = 64;
  const c = 2 * Math.PI * r;
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 180 180" className="h-40 w-40">
        <g transform="translate(90,90) rotate(-90)">
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * c;
            const part = (
              <circle
                key={`${d.label}-${i}`}
                r={r}
                cx="0"
                cy="0"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="24"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return part;
          })}
        </g>
      </svg>
      <div className="space-y-1 text-sm">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-gray-600">{d.label}</span>
            <span className="font-medium text-gray-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Heatmap({ data }: { data: Point[] }) {
  const blocks = data.slice(0, 12);
  return (
    <div className="grid grid-cols-3 gap-2">
      {blocks.map((d, i) => {
        const alpha = Math.max(0.15, Math.min(0.95, d.value / 100));
        return (
          <div
            key={`${d.label}-${i}`}
            className="rounded-md p-2 text-xs"
            style={{ backgroundColor: `rgba(37, 99, 235, ${alpha})`, color: alpha > 0.5 ? '#fff' : '#1f2937' }}
          >
            <div className="truncate font-medium">{d.label}</div>
            <div>{Math.round(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value, total, color = 'bg-blue-600' }: { value: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
        <span>{value}</span>
        <span>{total}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
