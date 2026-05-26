// app/api/lessons/generate/route.ts - Generate personalized lesson for student

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { generatePersonalizedLessonOutlines, getPersonalizedTeacherPrompt } from '@/lib/generation/personalized-generator';
import { getTopic } from '@/lib/curriculum/curriculum-service';
import { getStudentProfile } from '@/lib/student/student-service';
import { getTopicMastery } from '@/lib/progress/progress-service';
import { query } from '@/lib/db';
import { nanoid } from 'nanoid';
import type { AuthContext } from '@/lib/types/auth';

interface GenerateLessonPayload {
  topicId: string;
  teacherRequirements?: string;
}

export const POST = withRole(['student', 'teacher'], async (req: NextRequest, auth: AuthContext) => {
  try {
    const body: GenerateLessonPayload = await req.json();
    const { topicId, teacherRequirements } = body;

    if (!topicId) {
      return NextResponse.json({ error: 'topicId is required' }, { status: 400 });
    }

    // Get topic details
    const topic = await getTopic(topicId);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Determine which student to generate for
    const studentId = req.nextUrl.searchParams.get('studentId') || auth.userId;

    // Get student profile
    const studentProfile = await getStudentProfile(studentId);
    if (!studentProfile) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // Get student's current mastery for this topic
    const mastery = await getTopicMastery(studentId, topicId);
    const masteryScore = mastery?.masteryScore;

    // Generate personalized outlines
    const outlines = await generatePersonalizedLessonOutlines(
      topic,
      studentProfile,
      teacherRequirements,
      masteryScore
    );

    // Save lesson to database (partial - would be completed after full generation)
    const lessonId = nanoid();
    const createdByTeacherId = auth.role === 'teacher' ? auth.userId : null;

    await query(
      `INSERT INTO lessons
       (id, school_id, topic_id, created_by_teacher_id, created_for_student_id,
        title, description, scenes_count, language, difficulty_level, ai_model_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        lessonId,
        auth.schoolId,
        topicId,
        createdByTeacherId,
        studentId,
        `${topic.title} - Personalized Lesson`,
        topic.description || topic.learningObjectives.join('; '),
        outlines.length,
        studentProfile.languagePreference,
        1.0, // difficulty multiplier
        'gpt-4-turbo', // placeholder
      ]
    );

    return NextResponse.json({
      lessonId,
      title: `${topic.title} - Personalized Lesson`,
      outlines,
      studentProfile: {
        gradeLevel: studentProfile.gradeLevel,
        learningStyle: studentProfile.learningStyle,
        interests: studentProfile.interests,
      },
      teacherPersona: getPersonalizedTeacherPrompt(studentProfile),
      currentMastery: masteryScore,
    });
  } catch (error) {
    console.error('Lesson generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate lesson' },
      { status: 500 }
    );
  }
});
