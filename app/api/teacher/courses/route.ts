/**
 * POST /api/teacher/courses
 * Create a new course
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { CourseService } from '@/lib/services/course-service';
import type { AuthContext } from '@/lib/types/auth';
import type { CreateCourseRequest } from '@/lib/models/course-models';

export const POST = withRole(['teacher', 'principal'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const body: CreateCourseRequest = await req.json();

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    // Create course
    const course = await CourseService.createCourse(auth.schoolId, auth.userId, body);

    return NextResponse.json({
      success: true,
      course,
      message: 'Course created successfully',
    });
  } catch (error: any) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});

/**
 * GET /api/teacher/courses
 * List teacher's courses
 */
export const GET = withRole(['teacher', 'principal'], async (req: NextRequest, auth: AuthContext) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const gradeId = searchParams.get('gradeId');

    const result = await CourseService.listTeacherCourses(auth.schoolId, auth.userId, {
      limit,
      offset,
      status: status || undefined,
      gradeId: gradeId || undefined,
    });

    return NextResponse.json({
      success: true,
      courses: result.courses,
      pagination: {
        limit,
        offset,
        total: result.total,
        hasMore: result.hasMore,
      },
    });
  } catch (error: any) {
    console.error('List courses error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
