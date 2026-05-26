// lib/student/student-service.ts - Student profile and onboarding

import { query, transaction } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import type { AuthContext } from '@/lib/types/auth';
import { LearningDNAService } from '@/lib/services/learning-dna';

const log = createLogger('StudentService');

export interface StudentProfile {
  id: string;
  userId: string;
  schoolId: string;
  gradeLevel?: string;
  interests: string[];
  strengths: string[];
  weakAreas: string[];
  learningStyle?: string;
  languagePreference: string;
  onboardingCompleted: boolean;
  diagnosticScore?: number;
  preferredAiTeacherPersona: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingInput {
  gradeLevel: string;
  interests: string[];
  strengths: string[];
  weakAreas: string[];
  learningStyle?: string;
  languagePreference?: string;
}

/**
 * Get student profile
 */
export async function getStudentProfile(
  studentId: string
): Promise<StudentProfile | null> {
  try {
    const result = await query(
      `SELECT id, user_id, school_id, grade_level, interests, strengths, weak_areas,
              learning_style, language_preference, onboarding_completed, diagnostic_score,
              preferred_ai_teacher_persona, created_at, updated_at
       FROM student_profiles WHERE user_id = $1`,
      [studentId]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      schoolId: row.school_id,
      gradeLevel: row.grade_level,
      interests: row.interests || [],
      strengths: row.strengths || [],
      weakAreas: row.weak_areas || [],
      learningStyle: row.learning_style,
      languagePreference: row.language_preference,
      onboardingCompleted: row.onboarding_completed,
      diagnosticScore: row.diagnostic_score,
      preferredAiTeacherPersona: row.preferred_ai_teacher_persona,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error fetching student profile:', error);
    throw error;
  }
}

/**
 * Complete student onboarding
 */
export async function completeOnboarding(
  studentId: string,
  schoolId: string,
  input: OnboardingInput
): Promise<StudentProfile> {
  try {
    const result = await query(
      `UPDATE student_profiles
       SET grade_level = $1, interests = $2, strengths = $3, weak_areas = $4,
           learning_style = $5, language_preference = $6, onboarding_completed = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $7 AND school_id = $8
       RETURNING id, user_id, school_id, grade_level, interests, strengths, weak_areas,
                 learning_style, language_preference, onboarding_completed, diagnostic_score,
                 preferred_ai_teacher_persona, created_at, updated_at`,
      [
        input.gradeLevel,
        input.interests || [],
        input.strengths || [],
        input.weakAreas || [],
        input.learningStyle || null,
        input.languagePreference || 'en-US',
        studentId,
        schoolId,
      ]
    );

    if (!result.rows[0]) {
      throw new Error('Failed to update student profile');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      schoolId: row.school_id,
      gradeLevel: row.grade_level,
      interests: row.interests,
      strengths: row.strengths,
      weakAreas: row.weak_areas,
      learningStyle: row.learning_style,
      languagePreference: row.language_preference,
      onboardingCompleted: row.onboarding_completed,
      diagnosticScore: row.diagnostic_score,
      preferredAiTeacherPersona: row.preferred_ai_teacher_persona,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error completing onboarding:', error);
    throw error;
  }
}

/**
 * Set diagnostic quiz score
 */
export async function setDiagnosticScore(
  studentId: string,
  score: number
): Promise<void> {
  try {
    await query(
      `UPDATE student_profiles
       SET diagnostic_score = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [score, studentId]
    );

    const profile = await query(
      `SELECT school_id, learning_style
       FROM student_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [studentId]
    );

    if (profile.rows[0]?.school_id) {
      await LearningDNAService.updateFromDiagnostic({
        studentId,
        schoolId: profile.rows[0].school_id,
        diagnosticScore: score,
        learningStyle: profile.rows[0].learning_style || undefined,
      });
    }
  } catch (error) {
    log.error('Error setting diagnostic score:', error);
    throw error;
  }
}

/**
 * List all students in school
 */
export async function listStudents(
  schoolId: string,
  limit = 50,
  offset = 0
): Promise<any[]> {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.created_at,
              sp.grade_level, sp.interests, sp.onboarding_completed
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       WHERE u.school_id = $1 AND u.role = 'student'
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [schoolId, limit, offset]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      avatarUrl: row.avatar_url,
      gradeLevel: row.grade_level,
      interests: row.interests,
      onboardingCompleted: row.onboarding_completed,
      createdAt: row.created_at,
    }));
  } catch (error) {
    log.error('Error listing students:', error);
    throw error;
  }
}
