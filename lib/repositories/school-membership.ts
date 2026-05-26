import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { SchoolMembership, MembershipStatus } from '@/lib/types/models';

const log = createLogger('SchoolMembershipRepository');

export interface CreateMembershipInput {
  studentId: string;
  schoolId: string;
  joinRequestId?: string;
}

export interface UpdateMembershipInput {
  status?: MembershipStatus;
  invitationType?: string;
}

export class SchoolMembershipRepository {
  /**
   * Create a new school membership
   */
  static async create(input: CreateMembershipInput, status: MembershipStatus = 'pending'): Promise<SchoolMembership> {
    try {
      const result = await query(
        `INSERT INTO school_memberships (student_id, school_id, status)
         VALUES ($1, $2, $3)
         RETURNING id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at`,
        [input.studentId, input.schoolId, status]
      );

      if (result.rowCount === 0) {
        throw new Error('Failed to create membership');
      }

      return this.rowToMembership(result.rows[0]);
    } catch (error) {
      log.error('Failed to create membership:', error);
      throw error;
    }
  }

  /**
   * Find membership by ID
   */
  static async findById(id: string): Promise<SchoolMembership | null> {
    try {
      const result = await query(
        `SELECT id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at
         FROM school_memberships WHERE id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return this.rowToMembership(result.rows[0]);
    } catch (error) {
      log.error('Failed to find membership by id:', error);
      throw error;
    }
  }

  /**
   * Find memberships by student ID
   */
  static async findByStudentId(studentId: string): Promise<SchoolMembership[]> {
    try {
      const result = await query(
        `SELECT id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at
         FROM school_memberships WHERE student_id = $1
         ORDER BY created_at DESC`,
        [studentId]
      );

      return result.rows.map((row: any) => this.rowToMembership(row));
    } catch (error) {
      log.error('Failed to find memberships by student:', error);
      throw error;
    }
  }

  /**
   * Find memberships by school ID
   */
  static async findBySchoolId(schoolId: string, status?: MembershipStatus): Promise<SchoolMembership[]> {
    try {
      let sql = `SELECT id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at
                 FROM school_memberships WHERE school_id = $1`;
      const params: any[] = [schoolId];

      if (status) {
        sql += ` AND status = $2`;
        params.push(status);
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await query(sql, params);
      return result.rows.map((row: any) => this.rowToMembership(row));
    } catch (error) {
      log.error('Failed to find memberships by school:', error);
      throw error;
    }
  }

  /**
   * Check if student is member of school
   */
  static async isMember(studentId: string, schoolId: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT id FROM school_memberships WHERE student_id = $1 AND school_id = $2 AND status = 'approved'`,
        [studentId, schoolId]
      );

      return result.rows.length > 0;
    } catch (error) {
      log.error('Failed to check membership:', error);
      throw error;
    }
  }

  /**
   * Find pending membership requests
   */
  static async findPendingBySchool(schoolId: string, limit = 50, offset = 0): Promise<SchoolMembership[]> {
    try {
      const result = await query(
        `SELECT id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at
         FROM school_memberships WHERE school_id = $1 AND status = 'pending'
         ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
        [schoolId, limit, offset]
      );

      return result.rows.map((row: any) => this.rowToMembership(row));
    } catch (error) {
      log.error('Failed to find pending memberships:', error);
      throw error;
    }
  }

  /**
   * Approve membership
   */
  static async approve(id: string, approvedBy: string): Promise<SchoolMembership> {
    try {
      const result = await query(
        `UPDATE school_memberships SET status = 'approved', approved_by_user_id = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at`,
        [approvedBy, id]
      );

      if (result.rowCount === 0) {
        throw new Error('Membership not found');
      }

      return this.rowToMembership(result.rows[0]);
    } catch (error) {
      log.error('Failed to approve membership:', error);
      throw error;
    }
  }

  /**
   * Reject membership
   */
  static async reject(id: string): Promise<SchoolMembership> {
    try {
      const result = await query(
        `UPDATE school_memberships SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, student_id, school_id, status, approved_by_user_id, approved_at, rejection_reason, created_at, updated_at`,
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error('Membership not found');
      }

      return this.rowToMembership(result.rows[0]);
    } catch (error) {
      log.error('Failed to reject membership:', error);
      throw error;
    }
  }

  /**
   * Remove membership
   */
  static async remove(id: string): Promise<void> {
    try {
      const result = await query(`DELETE FROM school_memberships WHERE id = $1`, [id]);

      if (result.rowCount === 0) {
        throw new Error('Membership not found');
      }
    } catch (error) {
      log.error('Failed to remove membership:', error);
      throw error;
    }
  }

  /**
   * Count approved members by school
   */
  static async countMembersBySchool(schoolId: string): Promise<number> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM school_memberships WHERE school_id = $1 AND status = 'approved'`,
        [schoolId]
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      log.error('Failed to count members:', error);
      throw error;
    }
  }

  /**
   * Convert database row to SchoolMembership object
   */
  private static rowToMembership(row: any): SchoolMembership {
    return {
      id: row.id,
      studentId: row.student_id,
      schoolId: row.school_id,
      status: row.status,
      approvedByUserId: row.approved_by_user_id,
      approvedAt: row.approved_at,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
