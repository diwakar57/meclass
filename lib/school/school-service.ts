// lib/school/school-service.ts - School management logic

import { query, transaction } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import type { AuthContext } from '@/lib/types/auth';

const log = createLogger('SchoolService');

export interface SchoolData {
  id: string;
  name: string;
  domain?: string;
  logoUrl?: string;
  branding?: Record<string, any>;
  subscriptionTier: string;
  maxStudents: number;
  maxTeachers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchoolRequest {
  name: string;
  domain?: string;
  logoUrl?: string;
  subscriptionTier?: string;
  maxStudents?: number;
  maxTeachers?: number;
}

/**
 * Get school by ID
 */
export async function getSchool(schoolId: string): Promise<SchoolData | null> {
  try {
    const result = await query(
      `SELECT id, name, domain, logo_url, branding, subscription_tier,
              max_students, max_teachers, created_at, updated_at
       FROM schools WHERE id = $1 AND deleted_at IS NULL`,
      [schoolId]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      logoUrl: row.logo_url,
      branding: row.branding,
      subscriptionTier: row.subscription_tier,
      maxStudents: row.max_students,
      maxTeachers: row.max_teachers,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error fetching school:', error);
    throw error;
  }
}

/**
 * Create new school (SaaS admin only)
 */
export async function createSchool(req: CreateSchoolRequest): Promise<SchoolData> {
  try {
    const id = nanoid();
    const now = new Date();

    const result = await query(
      `INSERT INTO schools (id, name, domain, logo_url, subscription_tier, max_students, max_teachers)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, domain, logo_url, branding, subscription_tier,
                 max_students, max_teachers, created_at, updated_at`,
      [
        id,
        req.name,
        req.domain || null,
        req.logoUrl || null,
        req.subscriptionTier || 'basic',
        req.maxStudents || 100,
        req.maxTeachers || 10,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      logoUrl: row.logo_url,
      branding: row.branding,
      subscriptionTier: row.subscription_tier,
      maxStudents: row.max_students,
      maxTeachers: row.max_teachers,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    log.error('Error creating school:', error);
    throw error;
  }
}

/**
 * Get school statistics
 */
export async function getSchoolStats(schoolId: string): Promise<{
  studentCount: number;
  teacherCount: number;
  classCount: number;
  lessonCount: number;
}> {
  try {
    const studentResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE school_id = $1 AND role = $2',
      [schoolId, 'student']
    );

    const teacherResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE school_id = $1 AND role = $2',
      [schoolId, 'teacher']
    );

    const classResult = await query(
      'SELECT COUNT(*) as count FROM classes WHERE school_id = $1',
      [schoolId]
    );

    const lessonResult = await query(
      'SELECT COUNT(*) as count FROM lessons WHERE school_id = $1',
      [schoolId]
    );

    return {
      studentCount: parseInt(studentResult.rows[0].count),
      teacherCount: parseInt(teacherResult.rows[0].count),
      classCount: parseInt(classResult.rows[0].count),
      lessonCount: parseInt(lessonResult.rows[0].count),
    };
  } catch (error) {
    log.error('Error fetching school stats:', error);
    throw error;
  }
}

/**
 * List all users in school
 */
export async function listSchoolUsers(
  schoolId: string,
  role?: string,
  limit = 50,
  offset = 0
) {
  try {
    let query_str = 'SELECT id, email, role, first_name, last_name, avatar_url, is_active, created_at FROM users WHERE school_id = $1';
    const params: any[] = [schoolId];

    if (role) {
      query_str += ' AND role = $2';
      params.push(role);
    }

    query_str += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit);
    params.push(offset);

    const result = await query(query_str, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      firstName: row.first_name,
      lastName: row.last_name,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  } catch (error) {
    log.error('Error listing school users:', error);
    throw error;
  }
}
