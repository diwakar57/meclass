/**
 * API Route: POST /api/schools/[schoolId]/staff
 * Principal creates a new staff member
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { verifyAuth } from '@/lib/middleware/auth';
import { staffService } from '@/lib/services/entity-service';
import { UserRole, StaffRole } from '@/lib/models/entity-models';

const log = createLogger('API /api/schools/[schoolId]/staff');

export async function POST(request: NextRequest, { params }: { params: { schoolId: string } }) {
  try {
    const { schoolId } = params;

    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if principal of the school
    if (auth.role !== UserRole.PRINCIPAL || auth.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Only school principals can create staff' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const required = ['email', 'password', 'staffRole', 'firstName', 'lastName'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate staff role
    if (!Object.values(StaffRole).includes(body.staffRole)) {
      return NextResponse.json(
        { error: 'Invalid staff role' },
        { status: 400 }
      );
    }

    const { user, staff } = await staffService.createStaff(
      schoolId,
      {
        email: body.email,
        password: body.password,
        staffRole: body.staffRole,
        firstName: body.firstName,
        lastName: body.lastName,
        department: body.department || null,
        positionTitle: body.positionTitle || null,
        phone: body.phone || null,
        officeLocation: body.officeLocation || null,
        qualifications: body.qualifications || [],
        subjectExpertise: body.subjectExpertise || [],
        bio: body.bio || null,
      },
      auth.userId
    );

    log.info(`Created staff member: ${staff.id} (${user.email})`);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
          staff,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    log.error('Error creating staff', error);

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || 'Failed to create staff' }, { status: 500 });
  }
}

/**
 * API Route: GET /api/schools/[schoolId]/staff
 * List all staff in a school
 */
export async function GET(request: NextRequest, { params }: { params: { schoolId: string } }) {
  try {
    const { schoolId } = params;

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await staffService.listStaff(schoolId, auth.userId);

    return NextResponse.json({
      success: true,
      data: staff,
    });
  } catch (error: any) {
    log.error('Error fetching staff', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch staff' }, { status: 500 });
  }
}
