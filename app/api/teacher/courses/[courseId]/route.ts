/**
 * GET /api/teacher/courses/[courseId]
 * PUT /api/teacher/courses/[courseId]
 * Get or update a course
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { CourseService } from '@/lib/services/course-service';
import type { AuthContext } from '@/lib/types/auth';
import type { UpdateCourseRequest } from '@/lib/models/course-models';

export const GET = withRole(['teacher', 'principal'], async (req: NextRequest, auth: AuthContext, { params }: { params: Promise<{ courseId: string }> }) => {
  try {
    const { courseId } = await params;

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    const courseDetails = await CourseService.getCourseDetails(courseId, auth.schoolId);

    if (!courseDetails) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // For teachers, verify ownership
    if (auth.role === 'teacher' && courseDetails.course.teacherId !== auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      course: courseDetails.course,
      calendar: courseDetails.calendar,
      topics: courseDetails.topics,
      totalEstimatedSessions: courseDetails.totalEstimatedSessions,
    });
  } catch (error: any) {
    console.error('Get course error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withRole(['teacher'], async (req: NextRequest, auth: AuthContext, { params }: { params: Promise<{ courseId: string }> }) => {
  try {
    const { courseId } = await params;
    const body: UpdateCourseRequest = await req.json();

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Invalid auth context' }, { status: 401 });
    }

    const course = await CourseService.updateCourse(courseId, auth.schoolId, auth.userId, body);

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      course,
      message: 'Course updated successfully',
    });
  } catch (error: any) {
    console.error('Update course error:', error);
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 403 : 400 });
  }
});
