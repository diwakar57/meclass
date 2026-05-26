/**
 * Courses List API - GET /api/courses
 * List all courses for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { listStudentCourses, countStudentCourses } from '@/lib/courses/course-service';
import type { AuthContext } from '@/lib/types/auth';

// GET /api/courses - List courses for user
export const GET = withRole(['student', 'teacher', 'principal'], async (
  req: NextRequest,
  auth: AuthContext
) => {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const studentId = url.searchParams.get('studentId');

    // Determine which student's courses to list
    let effectiveStudentId = auth.userId;

    if (studentId && auth.role !== 'student') {
      // Teachers/principals can request courses for specific students
      effectiveStudentId = studentId;
    } else if (studentId && auth.role === 'student' && studentId !== auth.userId) {
      // Students can only view their own courses
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const courses = await listStudentCourses(effectiveStudentId, limit, offset);
    const total = await countStudentCourses(effectiveStudentId);

    return NextResponse.json({
      success: true,
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        generationStatus: course.generationStatus,
        fileSize: course.fileSize,
        createdAt: course.createdAt,
        generatedAt: course.generatedAt,
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Courses listing error:', error);
    return NextResponse.json(
      { error: 'Failed to list courses' },
      { status: 500 }
    );
  }
});
