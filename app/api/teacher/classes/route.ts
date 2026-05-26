import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('TeacherClassesAPI');

function isDatabaseFailure(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  return (
    message.includes('econnrefused') ||
    message.includes('database_url') ||
    message.includes('connect') ||
    message.includes('postgres') ||
    message.includes('127.0.0.1:5432')
  );
}

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
    if (!payload || payload.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get teacher's classes with student counts derived from enrollments.
    const result = await query(
      `SELECT
         c.id,
         c.name,
         c.description,
         c.grade_level,
         COALESCE(COUNT(ce.student_id), 0)::int AS student_count,
         c.created_at
       FROM classes c
       LEFT JOIN class_enrollments ce ON ce.class_id = c.id
       WHERE c.teacher_id = $1
       GROUP BY c.id, c.name, c.description, c.grade_level, c.created_at
       ORDER BY c.created_at DESC`,
      [payload.userId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        gradeLevel: row.grade_level,
        studentCount: row.student_count || 0,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    log.error('Failed to get classes:', error);
    if (isDevAuthFallbackEnabled() && isDatabaseFailure(error)) {
      return NextResponse.json({
        success: true,
        data: [],
        warning: 'Database unavailable. Returning empty teacher classes in development fallback mode.',
      });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to get classes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    if (!payload || payload.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, gradeLevel } = body;

    if (!payload.schoolId) {
      return NextResponse.json(
        { success: false, error: 'Missing school scope' },
        { status: 401 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Class name is required' },
        { status: 400 }
      );
    }

    // Create class
    const classId = randomUUID();

    const result = await query(
      `INSERT INTO classes (id, school_id, teacher_id, name, description, grade_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, grade_level, created_at`,
      [classId, payload.schoolId, payload.userId, name, description || null, gradeLevel || null]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create class' },
        { status: 500 }
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        description: row.description,
        gradeLevel: row.grade_level,
        studentCount: 0,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    log.error('Failed to create class:', error);
    if (isDevAuthFallbackEnabled() && isDatabaseFailure(error)) {
      return NextResponse.json({
        success: true,
        data: {
          id: `dev-class-${Date.now()}`,
          name: 'Development Class',
          description: null,
          gradeLevel: null,
          studentCount: 0,
          createdAt: new Date().toISOString(),
        },
        warning: 'Database unavailable. Class was simulated in development fallback mode and was not persisted.',
      });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
