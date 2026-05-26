/**
 * Repository Layer - Database Operations
 * Handles all CRUD operations with tenant isolation
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import {
  School,
  User,
  StaffProfile,
  StudentProfile,
  SchoolMembership,
  StudentJoinRequest,
  StaffReportingRelationship,
  SubscriptionTier,
  MembershipStatus,
  JoinRequestStatus,
  StaffRole,
  UserRole,
} from '@/lib/models/entity-models';

const log = createLogger('EntityRepository');

// ============================================================================
// SCHOOL REPOSITORY
// ============================================================================

export const schoolRepository = {
  async create(data: {
    name: string;
    domain?: string;
    logoUrl?: string;
    subscriptionTier?: SubscriptionTier;
    maxStudents?: number;
    maxTeachers?: number;
  }): Promise<School> {
    const result = await query(
      `INSERT INTO schools (name, domain, logo_url, subscription_tier, max_students, max_teachers)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, domain, logo_url, subscription_tier, max_students, max_teachers, created_at, updated_at, deleted_at`,
      [
        data.name,
        data.domain || null,
        data.logoUrl || null,
        data.subscriptionTier || SubscriptionTier.BASIC,
        data.maxStudents || 100,
        data.maxTeachers || 10,
      ]
    );

    if (!result.rows[0]) throw new Error('Failed to create school');

    return mapRowToSchool(result.rows[0]);
  },

  async getById(id: string): Promise<School | null> {
    const result = await query(
      'SELECT id, name, domain, logo_url, subscription_tier, max_students, max_teachers, created_at, updated_at, deleted_at FROM schools WHERE id = $1',
      [id]
    );

    return result.rows[0] ? mapRowToSchool(result.rows[0]) : null;
  },

  async list(limit = 50, offset = 0) {
    const result = await query(
      'SELECT id, name, domain, logo_url, subscription_tier, max_students, max_teachers, created_at, updated_at, deleted_at FROM schools WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return result.rows.map(mapRowToSchool);
  },

  async update(id: string, data: Partial<School>): Promise<School | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.domain) {
      updates.push(`domain = $${paramCount++}`);
      values.push(data.domain);
    }
    if (data.logoUrl) {
      updates.push(`logo_url = $${paramCount++}`);
      values.push(data.logoUrl);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const result = await query(
      `UPDATE schools SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING id, name, domain, logo_url, subscription_tier, max_students, max_teachers, created_at, updated_at, deleted_at`,
      values
    );

    return result.rows[0] ? mapRowToSchool(result.rows[0]) : null;
  },
};

// ============================================================================
// USER REPOSITORY
// ============================================================================

export const userRepository = {
  async create(data: {
    email: string;
    passwordHash: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    schoolId?: string;
  }): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, password_hash, role, first_name, last_name, school_id, is_active, email_verified, created_at, updated_at`,
      [data.email, data.passwordHash, data.role, data.firstName || null, data.lastName || null, data.schoolId || null]
    );

    if (!result.rows[0]) throw new Error('Failed to create user');
    return mapRowToUser(result.rows[0]);
  },

  async getById(id: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, password_hash, role, first_name, last_name, school_id, avatar_url, is_active, email_verified, last_login_at, created_at, updated_at 
       FROM users WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  },

  async getByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, password_hash, role, first_name, last_name, school_id, avatar_url, is_active, email_verified, last_login_at, created_at, updated_at 
       FROM users WHERE email = $1`,
      [email]
    );

    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  },

  async listBySchool(schoolId: string, limit = 50, offset = 0) {
    const result = await query(
      `SELECT id, email, password_hash, role, first_name, last_name, school_id, avatar_url, is_active, email_verified, last_login_at, created_at, updated_at 
       FROM users WHERE school_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [schoolId, limit, offset]
    );

    return result.rows.map(mapRowToUser);
  },

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.firstName) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(data.firstName);
    }
    if (data.lastName) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(data.lastName);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING id, email, password_hash, role, first_name, last_name, school_id, avatar_url, is_active, email_verified, last_login_at, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  },
};

// ============================================================================
// STAFF PROFILE REPOSITORY
// ============================================================================

export const staffProfileRepository = {
  async create(data: {
    userId: string;
    schoolId: string;
    staffRole: StaffRole;
    department?: string;
    positionTitle?: string;
    phone?: string;
    officeLocation?: string;
    qualifications?: string;
    subjectExpertise?: string[];
    bio?: string;
  }): Promise<StaffProfile> {
    const result = await query(
      `INSERT INTO staff_profiles (user_id, school_id, staff_role, department, position_title, phone, office_location, qualifications, subject_expertise, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, user_id, school_id, staff_role, department, position_title, phone, office_location, qualifications, subject_expertise, bio, verified, onboarding_complete, created_at, updated_at`,
      [
        data.userId,
        data.schoolId,
        data.staffRole,
        data.department || null,
        data.positionTitle || null,
        data.phone || null,
        data.officeLocation || null,
        data.qualifications || null,
        data.subjectExpertise ? JSON.stringify(data.subjectExpertise) : null,
        data.bio || null,
      ]
    );

    if (!result.rows[0]) throw new Error('Failed to create staff profile');
    return mapRowToStaffProfile(result.rows[0]);
  },

  async getByUserId(userId: string): Promise<StaffProfile | null> {
    const result = await query(
      `SELECT id, user_id, school_id, staff_role, department, position_title, phone, office_location, qualifications, subject_expertise, bio, verified, onboarding_complete, created_at, updated_at 
       FROM staff_profiles WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] ? mapRowToStaffProfile(result.rows[0]) : null;
  },

  async listBySchool(schoolId: string, limit = 50, offset = 0) {
    const result = await query(
      `SELECT id, user_id, school_id, staff_role, department, position_title, phone, office_location, qualifications, subject_expertise, bio, verified, onboarding_complete, created_at, updated_at 
       FROM staff_profiles WHERE school_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [schoolId, limit, offset]
    );

    return result.rows.map(mapRowToStaffProfile);
  },

  async listByRole(schoolId: string, role: StaffRole) {
    const result = await query(
      `SELECT id, user_id, school_id, staff_role, department, position_title, phone, office_location, qualifications, subject_expertise, bio, verified, onboarding_complete, created_at, updated_at 
       FROM staff_profiles WHERE school_id = $1 AND staff_role = $2 ORDER BY created_at DESC`,
      [schoolId, role]
    );

    return result.rows.map(mapRowToStaffProfile);
  },

  async update(id: string, data: Partial<StaffProfile>): Promise<StaffProfile | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.department) {
      updates.push(`department = $${paramCount++}`);
      values.push(data.department);
    }
    if (data.positionTitle) {
      updates.push(`position_title = $${paramCount++}`);
      values.push(data.positionTitle);
    }

    if (updates.length === 0) {
      const current = await query('SELECT id FROM staff_profiles WHERE id = $1', [id]);
      if (!current.rows[0]) return null;
    }

    values.push(id);
    const result = await query(
      `UPDATE staff_profiles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING id, user_id, school_id, staff_role, department, position_title, phone, office_location, qualifications, subject_expertise, bio, verified, onboarding_complete, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapRowToStaffProfile(result.rows[0]) : null;
  },
};

// ============================================================================
// STUDENT PROFILE REPOSITORY
// ============================================================================

export const studentProfileRepository = {
  async create(data: {
    userId: string;
    schoolId?: string;
    gradeLevel?: string;
    interests?: string[];
    learningStyle?: string;
  }): Promise<StudentProfile> {
    const result = await query(
      `INSERT INTO student_profiles (user_id, school_id, grade_level, interests, learning_style)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, school_id, grade_level, interests, strengths, weak_areas, learning_style, language_preference, onboarding_completed, diagnostic_score, preferred_ai_teacher_persona, created_at, updated_at`,
      [
        data.userId,
        data.schoolId || null,
        data.gradeLevel || null,
        data.interests ? JSON.stringify(data.interests) : null,
        data.learningStyle || null,
      ]
    );

    if (!result.rows[0]) throw new Error('Failed to create student profile');
    return mapRowToStudentProfile(result.rows[0]);
  },

  async getByUserId(userId: string): Promise<StudentProfile | null> {
    const result = await query(
      `SELECT id, user_id, school_id, grade_level, interests, strengths, weak_areas, learning_style, language_preference, onboarding_completed, diagnostic_score, preferred_ai_teacher_persona, created_at, updated_at 
       FROM student_profiles WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] ? mapRowToStudentProfile(result.rows[0]) : null;
  },
};

// ============================================================================
// SCHOOL MEMBERSHIP REPOSITORY
// ============================================================================

export const schoolMembershipRepository = {
  async create(studentId: string, schoolId: string): Promise<SchoolMembership> {
    const result = await query(
      `INSERT INTO school_memberships (student_id, school_id, status)
       VALUES ($1, $2, $3)
       RETURNING id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at`,
      [studentId, schoolId, MembershipStatus.PENDING]
    );

    if (!result.rows[0]) throw new Error('Failed to create membership');
    return mapRowToSchoolMembership(result.rows[0]);
  },

  async getById(id: string): Promise<SchoolMembership | null> {
    const result = await query(
      `SELECT id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at 
       FROM school_memberships WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapRowToSchoolMembership(result.rows[0]) : null;
  },

  async listByStudent(studentId: string) {
    const result = await query(
      `SELECT id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at 
       FROM school_memberships WHERE student_id = $1 ORDER BY created_at DESC`,
      [studentId]
    );

    return result.rows.map(mapRowToSchoolMembership);
  },

  async listBySchool(schoolId: string, status?: MembershipStatus) {
    let sql = `SELECT id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at 
              FROM school_memberships WHERE school_id = $1`;
    const params: any[] = [schoolId];

    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;
    const result = await query(sql, params);
    return result.rows.map(mapRowToSchoolMembership);
  },

  async updateStatus(id: string, status: MembershipStatus, approvedByUserId?: string): Promise<SchoolMembership | null> {
    const updates = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [id, status];

    if (approvedByUserId) {
      updates.push('approved_by_user_id = $3');
      updates.push('approved_at = CURRENT_TIMESTAMP');
      params.push(approvedByUserId);
    }

    const result = await query(
      `UPDATE school_memberships SET ${updates.join(', ')} WHERE id = $1 RETURNING id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at`,
      params
    );

    return result.rows[0] ? mapRowToSchoolMembership(result.rows[0]) : null;
  },
};

// ============================================================================
// STUDENT JOIN REQUEST REPOSITORY
// ============================================================================

export const studentJoinRequestRepository = {
  async create(studentId: string, schoolId: string, requestMessage?: string): Promise<StudentJoinRequest> {
    const result = await query(
      `INSERT INTO student_join_requests (student_id, school_id, status, request_message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, student_id, school_id, status, request_message, approval_message, approved_by_user_id, reviewed_at, membership_id, created_at, updated_at`,
      [studentId, schoolId, JoinRequestStatus.PENDING, requestMessage || null]
    );

    if (!result.rows[0]) throw new Error('Failed to create join request');
    return mapRowToStudentJoinRequest(result.rows[0]);
  },

  async getById(id: string): Promise<StudentJoinRequest | null> {
    const result = await query(
      `SELECT id, student_id, school_id, status, request_message, approval_message, approved_by_user_id, reviewed_at, membership_id, created_at, updated_at 
       FROM student_join_requests WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapRowToStudentJoinRequest(result.rows[0]) : null;
  },

  async listBySchoolPending(schoolId: string) {
    const result = await query(
      `SELECT id, student_id, school_id, status, request_message, approval_message, approved_by_user_id, reviewed_at, membership_id, created_at, updated_at 
       FROM student_join_requests WHERE school_id = $1 AND status = $2 ORDER BY created_at ASC`,
      [schoolId, JoinRequestStatus.PENDING]
    );

    return result.rows.map(mapRowToStudentJoinRequest);
  },

  async listByStudent(studentId: string) {
    const result = await query(
      `SELECT id, student_id, school_id, status, request_message, approval_message, approved_by_user_id, reviewed_at, membership_id, created_at, updated_at 
       FROM student_join_requests WHERE student_id = $1 ORDER BY created_at DESC`,
      [studentId]
    );

    return result.rows.map(mapRowToStudentJoinRequest);
  },

  async updateStatus(
    id: string,
    status: JoinRequestStatus,
    approvedByUserId?: string,
    approvalMessage?: string,
    membershipId?: string
  ): Promise<StudentJoinRequest | null> {
    const updates = ['status = $2', 'reviewed_at = CURRENT_TIMESTAMP', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [id, status];
    let paramCount = 3;

    if (approvedByUserId) {
      updates.push(`approved_by_user_id = $${paramCount++}`);
      params.push(approvedByUserId);
    }

    if (approvalMessage) {
      updates.push(`approval_message = $${paramCount++}`);
      params.push(approvalMessage);
    }

    if (membershipId) {
      updates.push(`membership_id = $${paramCount++}`);
      params.push(membershipId);
    }

    const result = await query(
      `UPDATE student_join_requests SET ${updates.join(', ')} WHERE id = $1 RETURNING id, student_id, school_id, status, request_message, approval_message, approved_by_user_id, reviewed_at, membership_id, created_at, updated_at`,
      params
    );

    return result.rows[0] ? mapRowToStudentJoinRequest(result.rows[0]) : null;
  },
};

// ============================================================================
// HELPER FUNCTIONS - ROW MAPPERS
// ============================================================================

function mapRowToSchool(row: any): School {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    logoUrl: row.logo_url,
    branding: row.branding,
    subscriptionTier: row.subscription_tier,
    maxStudents: row.max_students,
    maxTeachers: row.max_teachers,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

function mapRowToUser(row: any): User {
  return {
    id: row.id,
    schoolId: row.school_id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRowToStaffProfile(row: any): StaffProfile {
  return {
    id: row.id,
    userId: row.user_id,
    schoolId: row.school_id,
    staffRole: row.staff_role,
    department: row.department,
    positionTitle: row.position_title,
    phone: row.phone,
    officeLocation: row.office_location,
    qualifications: row.qualifications,
    subjectExpertise: row.subject_expertise ? JSON.parse(row.subject_expertise) : undefined,
    bio: row.bio,
    verified: row.verified,
    onboardingComplete: row.onboarding_complete,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRowToStudentProfile(row: any): StudentProfile {
  return {
    id: row.id,
    userId: row.user_id,
    gradeLevel: row.grade_level,
    interests: row.interests ? JSON.parse(row.interests) : undefined,
    strengths: row.strengths ? JSON.parse(row.strengths) : undefined,
    weakAreas: row.weak_areas ? JSON.parse(row.weak_areas) : undefined,
    learningStyle: row.learning_style,
    languagePreference: row.language_preference,
    onboardingCompleted: row.onboarding_completed,
    diagnosticScore: row.diagnostic_score,
    preferredAITeacherPersona: row.preferred_ai_teacher_persona,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRowToSchoolMembership(row: any): SchoolMembership {
  return {
    id: row.id,
    studentId: row.student_id,
    schoolId: row.school_id,
    status: row.status,
    approvedByUserId: row.approved_by_user_id,
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    rejectionReason: row.rejection_reason,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRowToStudentJoinRequest(row: any): StudentJoinRequest {
  return {
    id: row.id,
    studentId: row.student_id,
    schoolId: row.school_id,
    status: row.status,
    requestMessage: row.request_message,
    approvalMessage: row.approval_message,
    approvedByUserId: row.approved_by_user_id,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
    membershipId: row.membership_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
