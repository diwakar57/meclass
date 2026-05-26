/**
 * Development Database Mock
 * 
 * This file provides a lightweight mock database layer for development
 * when PostgreSQL is not available. It simulates the database API with
 * in-memory data and local storage.
 * 
 * To use with a real database:
 * 1. Set up PostgreSQL or use Neon (https://neon.tech)
 * 2. Update DATABASE_URL in .env.local
 * 3. Remove this mock file
 */

import { createHash } from 'crypto';

// Demo data structure
export const DEMO_DATA = {
  schools: [
    {
      id: 'school-1',
      name: 'LearnAI Demo Academy',
      slug: 'learnai-demo-academy',
      domain: 'demo.learnai.study',
      subscription_plan: 'pro',
      subscription_status: 'active',
      created_at: new Date('2026-01-15'),
    },
  ],
  users: [
    {
      id: 'user-admin',
      email: 'admin@learnai.com',
      password_hash: hashPassword('admin123'),
      role: 'saas_admin',
      first_name: 'Platform',
      last_name: 'Admin',
      created_at: new Date('2026-01-01'),
    },
    {
      id: 'user-principal',
      email: 'principal@demo.learnai.study',
      password_hash: hashPassword('principal123'),
      role: 'principal',
      first_name: 'Sarah',
      last_name: 'Johnson',
      school_id: 'school-1',
      created_at: new Date('2026-01-15'),
    },
    {
      id: 'user-teacher',
      email: 'teacher@demo.learnai.study',
      password_hash: hashPassword('teacher123'),
      role: 'teacher',
      first_name: 'Michael',
      last_name: 'Carter',
      school_id: 'school-1',
      created_at: new Date('2026-01-15'),
    },
    {
      id: 'user-student',
      email: 'student@demo.learnai.study',
      password_hash: hashPassword('student123'),
      role: 'student',
      first_name: 'Emma',
      last_name: 'Davis',
      school_id: 'school-1',
      created_at: new Date('2026-01-15'),
    },
  ],
  topics: [
    {
      id: 'topic-1',
      key: 'intro-ai',
      title: 'Introduction to AI',
      objective: 'Understand what Artificial Intelligence is and where it is used.',
      difficulty: 'easy',
    },
    {
      id: 'topic-2',
      key: 'machine-learning-basics',
      title: 'Machine Learning Basics',
      objective: 'Learn how machines learn patterns from data.',
      difficulty: 'medium',
    },
  ],
  syllabuses: [
    {
      id: 'syllabus-1',
      school_id: 'school-1',
      teacher_id: 'user-teacher',
      title: 'AI Fundamentals',
      description: 'Complete introduction to AI and machine learning',
      grade: '10',
      created_at: new Date('2026-02-01'),
    },
  ],
  self_assessments: [],
  diagnostic_tests: [],
  test_attempts: [],
  confidence_analyses: [],
  learning_plans: [],
  ai_classroom_sessions: [],
};

/**
 * Hash password for demo purposes
 * Note: This is NOT secure for production - use bcryptjs in real implementation
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Mock query function
 * Returns demo data for development
 */
export async function mockQuery(
  text: string,
  params?: any[]
): Promise<{ rows: any[] }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Simple mock response format
  console.log('[MOCK DB]', text.substring(0, 50), '...');

  return { rows: [] };
}

export default DEMO_DATA;
