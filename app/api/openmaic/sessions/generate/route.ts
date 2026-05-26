/**
 * POST /api/ai-classroom/sessions/generate
 * Generate a personalized AI classroom session for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { createLogger } from '@/lib/logger';
import { generateAIClassroomSession } from '@/lib/integrations/learnai-integration-service';
import { query } from '@/lib/db';

const logger = createLogger('GenerateAIClassroomSession');

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topicId, difficulty, teachingStyle } = await req.json();

    if (!topicId) {
      return NextResponse.json(
        { error: 'topicId is required' },
        { status: 400 }
      );
    }

    // Get student info
    const userResult = await query(
      `SELECT id, school_id FROM users WHERE id = $1`,
      [session.user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { school_id } = userResult.rows[0];

    // Get student profile and learning DNA
    const profileResult = await query(
      `SELECT * FROM student_profiles WHERE user_id = $1`,
      [session.user.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    const profile = profileResult.rows[0];

    // Get learning DNA
    const dnaResult = await query(
      `SELECT * FROM learning_dna WHERE student_id = $1`,
      [session.user.id]
    );

    const learningDNA = dnaResult.rows[0] || {};

    // Get mastery and confidence for this topic
    const masteryResult = await query(
      `SELECT * FROM topic_mastery WHERE student_id = $1 AND topic_id = $2`,
      [session.user.id, topicId]
    );

    const mastery = masteryResult.rows[0] || {
      mastery_level: 0,
      confidence_level: 50,
    };

    // Build student context
    const studentContext = {
      studentId: session.user.id,
      profile: {
        id: profile.id || session.user.id,
        userId: profile.user_id || session.user.id,
        schoolId: school_id,
        gradeLevel: profile.grade_level,
        strengths: profile.strengths || [],
        weakAreas: profile.weak_areas || [],
        learningStyle: profile.learning_style,
        interests: profile.interests || [],
        languagePreference: profile.language_preference || 'en-US',
        onboardingCompleted: Boolean(profile.onboarding_completed),
        diagnosticScore: profile.diagnostic_score || undefined,
        preferredAiTeacherPersona: profile.preferred_ai_teacher_persona || 'friendly',
        createdAt: profile.created_at ? new Date(profile.created_at) : new Date(),
        updatedAt: profile.updated_at ? new Date(profile.updated_at) : new Date(),
      },
      currentMasteryScore: mastery.mastery_level || mastery.mastery_score || 0,
      confidenceLevel: mastery.confidence_level,
      learningDNA: {
        paceType: learningDNA.pace_type || 'moderate',
        mistakeType: learningDNA.mistake_type || 'mixed',
        preferredStyle: learningDNA.preferred_style || 'friendly',
        attentionSpanScore: learningDNA.attention_span || 50,
      },
    };

    // Generate session
    const result = await generateAIClassroomSession({
      topic: { id: topicId } as any,
      studentContext,
      difficultyLevel: difficulty || 5,
      teachingStyle: teachingStyle || 'friendly',
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('Failed to generate AI classroom session', { error });
    return NextResponse.json(
      { error: 'Failed to generate session' },
      { status: 500 }
    );
  }
}
