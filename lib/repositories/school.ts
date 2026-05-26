import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { School, SchoolStatus } from '@/lib/types/models';

const log = createLogger('SchoolRepository');

export interface CreateSchoolInput {
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  principalId: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface UpdateSchoolInput {
  name?: string;
  description?: string;
  website?: string;
  logo?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: SchoolStatus;
}

export class SchoolRepository {
  /**
   * Create a new school
   */
  static async create(input: CreateSchoolInput): Promise<School> {
    try {
      const result = await query(
        `INSERT INTO schools (name, description, website, logo, principal_id, city, state, country, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
         RETURNING id, name, description, website, logo, principal_id, city, state, country, status, created_at, updated_at`,
        [
          input.name,
          input.description || null,
          input.website || null,
          input.logo || null,
          input.principalId,
          input.city || null,
          input.state || null,
          input.country || null,
        ]
      );

      if (result.rowCount === 0) {
        throw new Error('Failed to create school');
      }

      return this.rowToSchool(result.rows[0]);
    } catch (error) {
      log.error('Failed to create school:', error);
      throw error;
    }
  }

  /**
   * Find school by ID
   */
  static async findById(id: string): Promise<School | null> {
    try {
      const result = await query(
        `SELECT id, name, description, website, logo, principal_id, city, state, country, status, created_at, updated_at, deleted_at
         FROM schools WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return this.rowToSchool(result.rows[0]);
    } catch (error) {
      log.error('Failed to find school by id:', error);
      throw error;
    }
  }

  /**
   * Find schools by principal ID
   */
  static async findByPrincipalId(principalId: string): Promise<School[]> {
    try {
      const result = await query(
        `SELECT id, name, description, website, logo, principal_id, city, state, country, status, created_at, updated_at
         FROM schools WHERE principal_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [principalId]
      );

      return result.rows.map((row: any) => this.rowToSchool(row));
    } catch (error) {
      log.error('Failed to find schools by principal:', error);
      throw error;
    }
  }

  /**
   * Find schools by status
   */
  static async findByStatus(status: SchoolStatus, limit = 50, offset = 0): Promise<School[]> {
    try {
      const result = await query(
        `SELECT id, name, description, website, logo, principal_id, city, state, country, status, created_at, updated_at
         FROM schools WHERE status = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      return result.rows.map((row: any) => this.rowToSchool(row));
    } catch (error) {
      log.error('Failed to find schools by status:', error);
      throw error;
    }
  }

  /**
   * Update school
   */
  static async update(id: string, input: UpdateSchoolInput): Promise<School> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(input.description);
      }
      if (input.website !== undefined) {
        updates.push(`website = $${paramCount++}`);
        values.push(input.website);
      }
      if (input.logo !== undefined) {
        updates.push(`logo = $${paramCount++}`);
        values.push(input.logo);
      }
      if (input.city !== undefined) {
        updates.push(`city = $${paramCount++}`);
        values.push(input.city);
      }
      if (input.state !== undefined) {
        updates.push(`state = $${paramCount++}`);
        values.push(input.state);
      }
      if (input.country !== undefined) {
        updates.push(`country = $${paramCount++}`);
        values.push(input.country);
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(input.status);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await query(
        `UPDATE schools SET ${updates.join(', ')} WHERE id = $${paramCount} AND deleted_at IS NULL
         RETURNING id, name, description, website, logo, principal_id, city, state, country, status, created_at, updated_at`,
        values
      );

      if (result.rowCount === 0) {
        throw new Error('School not found');
      }

      return this.rowToSchool(result.rows[0]);
    } catch (error) {
      log.error('Failed to update school:', error);
      throw error;
    }
  }

  /**
   * Approve school
   */
  static async approve(id: string): Promise<School> {
    return this.update(id, { status: 'approved' as SchoolStatus });
  }

  /**
   * Reject school
   */
  static async reject(id: string): Promise<School> {
    return this.update(id, { status: 'rejected' as SchoolStatus });
  }

  /**
   * List all schools with pagination
   */
  static async listAll(limit = 50, offset = 0): Promise<School[]> {
    try {
      const result = await query(
        `SELECT id, name, description, website, logo, principal_id, city, state, country, status, created_at, updated_at
         FROM schools WHERE deleted_at IS NULL
         ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map((row: any) => this.rowToSchool(row));
    } catch (error) {
      log.error('Failed to list schools:', error);
      throw error;
    }
  }

  /**
   * Count schools by status
   */
  static async countByStatus(status: SchoolStatus): Promise<number> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM schools WHERE status = $1 AND deleted_at IS NULL`,
        [status]
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      log.error('Failed to count schools:', error);
      throw error;
    }
  }

  /**
   * Soft delete school
   */
  static async softDelete(id: string): Promise<void> {
    try {
      const result = await query(
        `UPDATE schools SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error('School not found');
      }
    } catch (error) {
      log.error('Failed to delete school:', error);
      throw error;
    }
  }

  /**
   * Convert database row to School object
   */
  private static rowToSchool(row: any): School {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      website: row.website,
      logo: row.logo,
      principalId: row.principal_id,
      city: row.city,
      state: row.state,
      country: row.country,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
