import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { getColumns, tableExists } from '@/lib/analytics/query-utils';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('AuditService');

interface AuditInput {
  schoolId: string;
  action: string;
  userId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  changes?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const columnCache = new Map<string, Set<string>>();

async function getCachedColumns(tableName: string): Promise<Set<string>> {
  const cached = columnCache.get(tableName);
  if (cached) {
    return cached;
  }

  const cols = await getColumns(tableName);
  columnCache.set(tableName, cols);
  return cols;
}

function getRequestIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const [first] = forwardedFor.split(',');
    return first?.trim() || null;
  }

  return req.headers.get('x-real-ip');
}

function toJsonValue(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  try {
    return value === null ? null : JSON.stringify(value);
  } catch {
    return null;
  }
}

export async function appendAuditLog(input: AuditInput): Promise<void> {
  try {
    if (!(await tableExists('audit_logs'))) {
      return;
    }

    const columns = await getCachedColumns('audit_logs');
    if (!columns.has('school_id') || !columns.has('action')) {
      return;
    }

    const insertColumns: string[] = ['school_id', 'action'];
    const values: Array<string | null> = [input.schoolId, input.action];

    // Some deployed schemas have audit_logs.id as NOT NULL without a DB default.
    // Always providing an id keeps audit writes non-blocking across schema variants.
    if (columns.has('id')) {
      insertColumns.push('id');
      values.push(randomUUID());
    }

    if (columns.has('user_id')) {
      insertColumns.push('user_id');
      values.push(input.userId ?? null);
    }
    if (columns.has('resource_type')) {
      insertColumns.push('resource_type');
      values.push(input.resourceType ?? null);
    }
    if (columns.has('resource_id')) {
      insertColumns.push('resource_id');
      values.push(input.resourceId ?? null);
    }
    if (columns.has('changes')) {
      insertColumns.push('changes');
      values.push(toJsonValue(input.changes));
    } else if (columns.has('details')) {
      insertColumns.push('details');
      values.push(toJsonValue(input.changes));
    }
    if (columns.has('ip_address')) {
      insertColumns.push('ip_address');
      values.push(input.ipAddress ?? null);
    }
    if (columns.has('user_agent')) {
      insertColumns.push('user_agent');
      values.push(input.userAgent ?? null);
    }

    const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');

    await query(
      `INSERT INTO audit_logs (${insertColumns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  } catch (error) {
    log.warn('Audit log write skipped', {
      action: input.action,
      schoolId: input.schoolId,
      error,
    });
  }
}

export async function appendRequestAuditLog(req: NextRequest, input: Omit<AuditInput, 'ipAddress' | 'userAgent'>) {
  await appendAuditLog({
    ...input,
    ipAddress: getRequestIp(req),
    userAgent: req.headers.get('user-agent'),
  });
}

