/**
 * API Route: POST /api/saas/schools
 * Create a new school (SaaS admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { verifyAuth } from '@/lib/middleware/auth';
import { schoolService } from '@/lib/services/entity-service';
import { UserRole } from '@/lib/models/entity-models';

const log = createLogger('API /api/saas/schools');

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization - only SaaS admins
    if (auth.role !== UserRole.SAAS_ADMIN) {
      return NextResponse.json({ error: 'Only SaaS admins can create schools' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }

    const school = await schoolService.createSchool({
      name: body.name,
      domain: body.domain || undefined,
      logoUrl: body.logoUrl || undefined,
      subscriptionTier: body.subscriptionTier || 'BASIC',
      maxStudents: body.maxStudents || 500,
      maxTeachers: body.maxTeachers || 50,
      features: body.features || [],
      settings: body.settings || {},
    });

    log.info(`Created school: ${school.id} (${school.name})`);

    return NextResponse.json(
      {
        success: true,
        data: school,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error('Error creating school', error);
    return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
  }
}

/**
 * API Route: GET /api/saas/schools
 * List all schools (SaaS admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== UserRole.SAAS_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const schools = await schoolService.listSchools(auth.role, limit, offset);

    return NextResponse.json({
      success: true,
      data: schools,
      pagination: { limit, offset },
    });
  } catch (error) {
    log.error('Error fetching schools', error);
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
  }
}
