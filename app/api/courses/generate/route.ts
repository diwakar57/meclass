/**
 * Course Generation API - POST /api/courses/generate
 * Receives generation request and triggers async generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { getSyllabus } from '@/lib/syllabi/syllabus-service';
import { generateCourseAsync } from '@/lib/services/course-generation-service';
import { getCourse } from '@/lib/courses/course-service';
import type { AuthContext } from '@/lib/types/auth';
import type { GenerateCourseInput } from '@/lib/types/courses';

// POST /api/courses/generate - Start course generation
export const POST = withRole(['student', 'teacher'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const body: GenerateCourseInput = await req.json();

    if (!body.syllabusId) {
      return NextResponse.json({ error: 'syllabusId is required' }, { status: 400 });
    }

    if (!auth.schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 401 });
    }

    // Verify syllabus exists
    const syllabus = await getSyllabus(body.syllabusId);
    if (!syllabus) {
      return NextResponse.json({ error: 'Syllabus not found' }, { status: 404 });
    }

    // Verify school ownership
    if (syllabus.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Determine student ID (use provided or current user if student)
    const studentId = body.studentId || (auth.role === 'student' ? auth.userId : null);

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId required when called by teacher' },
        { status: 400 }
      );
    }

    // Trigger async generation
    // In production, use a queue system (Bull, RabbitMQ) for reliability
    // For MVP, we'll use simple async/await
    generateCourseAsync({
      schoolId: auth.schoolId,
      studentId,
      syllabusId: body.syllabusId,
    }).catch((error) => {
      console.error('Background generation error:', error);
    });

    // Return immediately with pending status
    return NextResponse.json({
      success: true,
      message: 'Course generation started',
      syllabusTitle: syllabus.title,
      expectedDuration: '2-5 minutes',
    });
  } catch (error) {
    console.error('Course generation request error:', error);
    return NextResponse.json(
      { error: 'Failed to start course generation' },
      { status: 500 }
    );
  }
});
