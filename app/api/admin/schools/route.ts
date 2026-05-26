import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SchoolService } from '@/lib/services/school';
import { createLogger } from '@/lib/logger';
import { query } from '@/lib/db';

const log = createLogger('SchoolsAPI');

export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'saas_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - SaaS admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'pending').toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let schools: any[] = [];

    if (status === 'pending') {
      schools = await SchoolService.getPendingSchools(limit, offset);
    } else if (['approved', 'active', 'suspended', 'rejected'].includes(status)) {
      try {
        const result = await query(
          `SELECT id, name, description, website, logo, principal_id, city, state, country, status, created_at, updated_at
           FROM schools WHERE status = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [status, limit, offset]
        );

        schools = (result.rows || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          website: row.website,
          logo: row.logo,
          principalId: row.principal_id,
          city: row.city,
          state: row.state,
          country: row.country,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } catch (dbError) {
        log.error('Database query failed for status:', status, dbError);
        throw dbError;
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported status filter' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: schools,
      pagination: {
        limit,
        offset,
        total: schools.length,
      },
    });
  } catch (error) {
    log.error('Failed to get schools:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schools' },
      { status: 500 }
    );
  }
}
