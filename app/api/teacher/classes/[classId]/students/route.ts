import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('TeacherStudentsAPI');

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

type TeacherClassStudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  class_id: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
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

    const { classId } = await params;

    // Verify teacher owns this class
    const classCheck = await query(
      `SELECT id FROM classes WHERE id = $1 AND teacher_id = $2`,
      [classId, payload.userId]
    );

    if (classCheck.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    // Get students in class
    const result = await query<TeacherClassStudentRow>(
      `SELECT u.id, u.first_name, u.last_name, u.email, ce.class_id
       FROM class_enrollments ce
       JOIN users u ON ce.student_id = u.id
       WHERE ce.class_id = $1
       ORDER BY u.first_name ASC, u.last_name ASC`,
      [classId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map((row: TeacherClassStudentRow) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.email,
        email: row.email,
        classId: row.class_id,
      })),
    });
  } catch (error) {
    log.error('Failed to get students:', error);
    if (isDevAuthFallbackEnabled() && isDatabaseFailure(error)) {
      return NextResponse.json({
        success: true,
        data: [],
        warning: 'Database unavailable. Returning empty student list in development fallback mode.',
      });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to get students' },
      { status: 500 }
    );
  }
}
