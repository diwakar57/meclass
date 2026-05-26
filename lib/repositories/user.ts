import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { hashPassword } from '@/lib/auth/password';
import type { User, UserRole } from '@/lib/types/models';

const log = createLogger('UserRepository');

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId?: string;
  avatarUrl?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  email?: string;
}

export class UserRepository {
  /**
   * Create a new user
   */
  static async create(input: CreateUserInput, trx?: any): Promise<User> {
    try {
      const passwordHash = await hashPassword(input.password);
      const db = trx || query;

      const result = await db(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, school_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, first_name, last_name, role, school_id, avatar_url, created_at, updated_at`,
        [
          input.email,
          passwordHash,
          input.firstName,
          input.lastName,
          input.role,
          input.schoolId || null,
          input.avatarUrl || null,
        ]
      );

      if (result.rowCount === 0) {
        throw new Error('Failed to create user');
      }

      const row = result.rows[0];
      return this.rowToUser(row);
    } catch (error) {
      log.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await query(
        `SELECT id, email, first_name, last_name, role, school_id, avatar_url, created_at, updated_at, deleted_at
         FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [email]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return this.rowToUser(result.rows[0]);
    } catch (error) {
      log.error('Failed to find user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      const result = await query(
        `SELECT id, email, first_name, last_name, role, school_id, avatar_url, created_at, updated_at, deleted_at
         FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return this.rowToUser(result.rows[0]);
    } catch (error) {
      log.error('Failed to find user by id:', error);
      throw error;
    }
  }

  /**
   * Get user with password hash (for authentication)
   */
  static async findByEmailWithPassword(email: string): Promise<any | null> {
    try {
      const result = await query(
        `SELECT id, email, password_hash, first_name, last_name, role, school_id, avatar_url, created_at, updated_at
         FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [email]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      log.error('Failed to find user with password:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(id: string, input: UpdateUserInput): Promise<User> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.firstName !== undefined) {
        updates.push(`first_name = $${paramCount++}`);
        values.push(input.firstName);
      }
      if (input.lastName !== undefined) {
        updates.push(`last_name = $${paramCount++}`);
        values.push(input.lastName);
      }
      if (input.avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramCount++}`);
        values.push(input.avatarUrl);
      }
      if (input.email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(input.email);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} AND deleted_at IS NULL
         RETURNING id, email, first_name, last_name, role, school_id, avatar_url, created_at, updated_at`,
        values
      );

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      return this.rowToUser(result.rows[0]);
    } catch (error) {
      log.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * List users by role
   */
  static async findByRole(role: UserRole, schoolId?: string, limit = 50, offset = 0): Promise<User[]> {
    try {
      let sql = `SELECT id, email, first_name, last_name, role, school_id, avatar_url, created_at, updated_at
                 FROM users WHERE role = $1 AND deleted_at IS NULL`;
      const params: any[] = [role];

      if (schoolId) {
        sql += ` AND school_id = $2`;
        params.push(schoolId);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows.map((row: any) => this.rowToUser(row));
    } catch (error) {
      log.error('Failed to find users by role:', error);
      throw error;
    }
  }

  /**
   * Soft delete user
   */
  static async softDelete(id: string): Promise<void> {
    try {
      const result = await query(
        `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }
    } catch (error) {
      log.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
        [email]
      );
      return result.rows.length > 0;
    } catch (error) {
      log.error('Failed to check email existence:', error);
      throw error;
    }
  }

  /**
   * Convert database row to User object
   */
  private static rowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      schoolId: row.school_id || null,
      avatarUrl: row.avatar_url,
      emailVerified: row.email_verified || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
