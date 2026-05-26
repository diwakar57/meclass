import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthContext, requireRole } from '@/lib/middleware/auth';
import { appendRequestAuditLog } from '@/lib/services/audit-service';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

function generateApiKey(): string {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function maskApiKey(key: string): string {
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function success(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function parsePermissions(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry));
      }
      return [];
    } catch {
      return [];
    }
  }

  return [];
}

async function ensurePrincipalOrAdmin(request: NextRequest): Promise<NextResponse | null> {
  const roleResult = await requireRole(request, ['principal', 'saas_admin']);
  if (roleResult instanceof NextResponse) {
    return roleResult;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const roleError = await ensurePrincipalOrAdmin(request);
    if (roleError) return roleError;

    const result = await db.query(
      `SELECT id, name, masked_key, created_at, last_used_at, is_active, permissions
       FROM api_keys
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [authContext.schoolId]
    );

    const apiKeys = result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id || ''),
      name: String(row.name || ''),
      maskedKey: row.masked_key ? String(row.masked_key) : null,
      createdAt: row.created_at ? String(row.created_at) : null,
      lastUsed: row.last_used_at ? String(row.last_used_at) : null,
      isActive: Boolean(row.is_active),
      permissions: parsePermissions(row.permissions),
    }));

    return success({ apiKeys, total: apiKeys.length });
  } catch (error) {
    logger.error('Failed to fetch API keys', { error });
    return failure('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const roleError = await ensurePrincipalOrAdmin(request);
    if (roleError) return roleError;

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const permissions = parsePermissions(body?.permissions);

    if (!name || permissions.length === 0) {
      return failure('Name and permissions are required', 400);
    }

    const newKey = generateApiKey();
    const keyHash = hashApiKey(newKey);
    const maskedKey = maskApiKey(newKey);

    const result = await db.query(
      `INSERT INTO api_keys
       (school_id, name, key_hash, masked_key, permissions, is_active, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), $6)
       RETURNING id`,
      [
        authContext.schoolId,
        name,
        keyHash,
        maskedKey,
        JSON.stringify(permissions),
        authContext.userId,
      ]
    );

    const keyId = String(result.rows[0]?.id || '');

    await appendRequestAuditLog(request, {
      schoolId: authContext.schoolId,
      userId: authContext.userId,
      action: 'api_key_created',
      resourceType: 'api_key',
      resourceId: keyId,
      changes: {
        name,
        permissions,
      },
    });

    logger.info('API key created', { keyId, schoolId: authContext.schoolId, name });

    return success({
      key: newKey,
      keyId,
      name,
      permissions,
      maskedKey,
    });
  } catch (error) {
    logger.error('Failed to create API key', { error });
    return failure('Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const roleError = await ensurePrincipalOrAdmin(request);
    if (roleError) return roleError;

    const keySegments = request.nextUrl.pathname.split('/').filter(Boolean);
    const keyId = keySegments[keySegments.length - 1] || null;
    if (!keyId) {
      return failure('Missing API key id', 400);
    }

    const key = await db.query(
      `SELECT id
       FROM api_keys
       WHERE id = $1 AND school_id = $2`,
      [keyId, authContext.schoolId]
    );

    if (key.rows.length === 0) {
      return failure('API key not found', 404);
    }

    await db.query(
      `UPDATE api_keys
       SET is_active = false, revoked_at = NOW()
       WHERE id = $1`,
      [keyId]
    );

    await appendRequestAuditLog(request, {
      schoolId: authContext.schoolId,
      userId: authContext.userId,
      action: 'api_key_revoked',
      resourceType: 'api_key',
      resourceId: keyId,
      changes: {},
    });

    logger.info('API key revoked', { keyId, schoolId: authContext.schoolId });

    return success({ keyId, revoked: true });
  } catch (error) {
    logger.error('Failed to revoke API key', { error });
    return failure('Internal server error', 500);
  }
}

export async function POST_rotate(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const roleError = await ensurePrincipalOrAdmin(request);
    if (roleError) return roleError;

    const segments = request.nextUrl.pathname.split('/').filter(Boolean);
    const rotateIndex = segments.lastIndexOf('rotate');
    const keyId = rotateIndex > 0 ? segments[rotateIndex - 1] : null;
    if (!keyId) {
      return failure('Missing API key id', 400);
    }

    const key = await db.query(
      `SELECT id
       FROM api_keys
       WHERE id = $1 AND school_id = $2`,
      [keyId, authContext.schoolId]
    );

    if (key.rows.length === 0) {
      return failure('API key not found', 404);
    }

    const newKey = generateApiKey();
    const keyHash = hashApiKey(newKey);
    const maskedKey = maskApiKey(newKey);

    await db.query(
      `UPDATE api_keys
       SET key_hash = $1,
           masked_key = $2,
           rotated_at = NOW(),
           revoked_at = NULL,
           is_active = true
       WHERE id = $3`,
      [keyHash, maskedKey, keyId]
    );

    await appendRequestAuditLog(request, {
      schoolId: authContext.schoolId,
      userId: authContext.userId,
      action: 'api_key_rotated',
      resourceType: 'api_key',
      resourceId: keyId,
      changes: {},
    });

    logger.info('API key rotated', { keyId, schoolId: authContext.schoolId });

    return success({
      keyId,
      newKey,
      maskedKey,
    });
  } catch (error) {
    logger.error('Failed to rotate API key', { error });
    return failure('Internal server error', 500);
  }
}

export async function validateAPIKey(
  schoolId: string,
  apiKey: string,
  requiredPermissions: string[]
): Promise<boolean> {
  try {
    const keyHash = hashApiKey(apiKey);

    const result = await db.query(
      `SELECT id, permissions
       FROM api_keys
       WHERE school_id = $1
         AND key_hash = $2
         AND is_active = true`,
      [schoolId, keyHash]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const key = result.rows[0] as Record<string, unknown>;
    const permissions = parsePermissions(key.permissions);

    const hasPermission = requiredPermissions.every((permission) => permissions.includes(permission));

    if (hasPermission) {
      await db.query(
        `UPDATE api_keys
         SET last_used_at = NOW()
         WHERE id = $1`,
        [key.id]
      );
    }

    return hasPermission;
  } catch (error) {
    logger.error('API key validation failed', { error });
    return false;
  }
}

export async function GET_audit_log(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const roleError = await ensurePrincipalOrAdmin(request);
    if (roleError) return roleError;

    const result = await db.query(
      `SELECT
         al.id,
         al.action,
         al.created_at,
         ak.name,
         ak.id AS key_id
       FROM audit_logs al
       LEFT JOIN api_keys ak ON al.resource_id = ak.id
       WHERE al.school_id = $1
         AND al.resource_type = 'api_key'
       ORDER BY al.created_at DESC
       LIMIT 200`,
      [authContext.schoolId]
    );

    const auditLog = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      action: row.action,
      keyId: row.key_id,
      keyName: row.name,
      createdAt: row.created_at,
    }));

    return success({ auditLog, total: auditLog.length });
  } catch (error) {
    logger.error('Failed to fetch API key audit log', { error });
    return failure('Internal server error', 500);
  }
}
