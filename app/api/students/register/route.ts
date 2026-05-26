/**
 * API Route: POST /api/students/register
 * Register a new independent student
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { studentService } from '@/lib/services/entity-service';

const log = createLogger('API /api/students/register');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['email', 'password', 'firstName', 'lastName'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const { user, profile } = await studentService.registerStudent({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      gradeLevel: body.gradeLevel || null,
      interests: body.interests || [],
      learningStyle: body.learningStyle || null,
    });

    log.info(`Registered student: ${user.id}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
          profile,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    log.error('Error registering student', error);

    if (error.message.includes('already')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || 'Failed to register student' }, { status: 500 });
  }
}
