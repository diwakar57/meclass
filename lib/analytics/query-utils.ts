import { query } from '@/lib/db';

export interface TimePoint {
  label: string;
  value: number;
}

export async function tableExists(tableName: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );

  return Boolean(result.rows[0]?.exists);
}

export async function getColumns(tableName: string): Promise<Set<string>> {
  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );

  return new Set<string>(result.rows.map((row: any) => row.column_name));
}

export async function safeCount(
  tableName: string,
  whereClause = '',
  params: unknown[] = []
): Promise<number> {
  if (!(await tableExists(tableName))) {
    return 0;
  }

  const sql = `SELECT COUNT(*)::int AS count FROM ${tableName} ${whereClause}`;
  const result = await query(sql, params);
  return Number(result.rows[0]?.count || 0);
}

export async function safeMonthlySeries(
  tableName: string,
  dateColumn: string,
  months = 6,
  whereClause = '',
  params: unknown[] = []
): Promise<TimePoint[]> {
  if (!(await tableExists(tableName))) {
    return Array.from({ length: months }).map((_, i) => ({
      label: monthLabel(months - i - 1),
      value: 0,
    }));
  }

  const columns = await getColumns(tableName);
  if (!columns.has(dateColumn)) {
    return Array.from({ length: months }).map((_, i) => ({
      label: monthLabel(months - i - 1),
      value: 0,
    }));
  }

  const rows = await query(
    `SELECT TO_CHAR(DATE_TRUNC('month', ${dateColumn}), 'YYYY-MM') AS ym,
            COUNT(*)::int AS count
     FROM ${tableName}
     ${whereClause}
     ${whereClause ? 'AND' : 'WHERE'} ${dateColumn} >= DATE_TRUNC('month', NOW()) - INTERVAL '${months - 1} months'
     GROUP BY ym
     ORDER BY ym ASC`,
    params
  );

  const rowMap = new Map<string, number>();
  for (const row of rows.rows) {
    rowMap.set(row.ym, Number(row.count || 0));
  }

  const out: TimePoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({
      label: d.toLocaleString('en-US', { month: 'short' }),
      value: rowMap.get(ym) || 0,
    });
  }

  return out;
}

function monthLabel(monthOffsetFromNow: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthOffsetFromNow);
  return d.toLocaleString('en-US', { month: 'short' });
}
