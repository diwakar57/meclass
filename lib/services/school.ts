import { SchoolRepository, type CreateSchoolInput as RepoCreateSchoolInput } from '@/lib/repositories/school';
import { SchoolMembershipRepository } from '@/lib/repositories/school-membership';
import { UserRepository } from '@/lib/repositories/user';
import { createLogger } from '@/lib/logger';
import type { School, SchoolStatus, SchoolMembership } from '@/lib/types/models';

const log = createLogger('SchoolService');

export interface RegisterSchoolInput {
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
}

export class SchoolService {
  /**
   * Register a new school
   */
  static async registerSchool(input: RegisterSchoolInput): Promise<School> {
    try {
      // Verify principal exists
      const principal = await UserRepository.findById(input.principalId);
      if (!principal || principal.role !== 'principal') {
        throw new Error('Invalid principal');
      }

      // Create school
      const school = await SchoolRepository.create({
        name: input.name,
        description: input.description,
        website: input.website,
        logo: input.logo,
        principalId: input.principalId,
        city: input.city,
        state: input.state,
        country: input.country,
      });

      log.info('School registered', { schoolId: school.id, principalId: input.principalId });
      return school;
    } catch (error) {
      log.error('Failed to register school:', error);
      throw error;
    }
  }

  /**
   * Get school by ID
   */
  static async getSchoolById(schoolId: string): Promise<School | null> {
    try {
      return await SchoolRepository.findById(schoolId);
    } catch (error) {
      log.error('Failed to get school:', error);
      throw error;
    }
  }

  /**
   * Get schools by principal
   */
  static async getSchoolsByPrincipal(principalId: string): Promise<School[]> {
    try {
      return await SchoolRepository.findByPrincipalId(principalId);
    } catch (error) {
      log.error('Failed to get schools by principal:', error);
      throw error;
    }
  }

  /**
   * Update school
   */
  static async updateSchool(schoolId: string, input: UpdateSchoolInput): Promise<School> {
    try {
      const school = await SchoolRepository.update(schoolId, input);
      return school;
    } catch (error) {
      log.error('Failed to update school:', error);
      throw error;
    }
  }

  /**
   * Approve school (SaaS admin only)
   */
  static async approveSchool(schoolId: string): Promise<School> {
    try {
      const school = await SchoolRepository.approve(schoolId);
      log.info('School approved', { schoolId });
      return school;
    } catch (error) {
      log.error('Failed to approve school:', error);
      throw error;
    }
  }

  /**
   * Reject school (SaaS admin only)
   */
  static async rejectSchool(schoolId: string): Promise<School> {
    try {
      const school = await SchoolRepository.reject(schoolId);
      log.info('School rejected', { schoolId });
      return school;
    } catch (error) {
      log.error('Failed to reject school:', error);
      throw error;
    }
  }

  /**
   * Get pending school registrations (SaaS admin)
   */
  static async getPendingSchools(limit = 50, offset = 0): Promise<School[]> {
    try {
      return await SchoolRepository.findByStatus('pending', limit, offset);
    } catch (error) {
      log.error('Failed to get pending schools:', error);
      throw error;
    }
  }

  /**
   * Get approved schools for discovery
   */
  static async getApprovedSchools(limit = 50, offset = 0, searchTerm?: string): Promise<School[]> {
    try {
      let schools = await SchoolRepository.findByStatus('approved' as any, limit, offset);

      // Simple text search if provided
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        schools = schools.filter(
          school =>
            school.name.toLowerCase().includes(lowerSearch) ||
            school.city?.toLowerCase().includes(lowerSearch)
        );
      }

      return schools;
    } catch (error) {
      log.error('Failed to get approved schools:', error);
      throw error;
    }
  }

  /**
   * Count pending school registrations
   */
  static async countPendingSchools(): Promise<number> {
    try {
      return await SchoolRepository.countByStatus('pending');
    } catch (error) {
      log.error('Failed to count pending schools:', error);
      throw error;
    }
  }

  /**
   * Request to join school
   */
  static async requestToJoinSchool(studentId: string, schoolId: string): Promise<SchoolMembership> {
    try {
      // Check if school exists
      const school = await SchoolRepository.findById(schoolId);
      if (!school) {
        throw new Error('School not found');
      }

      // Check if student is already a member
      const isMember = await SchoolMembershipRepository.isMember(studentId, schoolId);
      if (isMember) {
        throw new Error('Already a member of this school');
      }

      // Create pending membership
      const membership = await SchoolMembershipRepository.create({
        studentId,
        schoolId,
      }, 'pending');

      log.info('Join request created', { studentId, schoolId });
      return membership;
    } catch (error) {
      log.error('Failed to request join:', error);
      throw error;
    }
  }

  /**
   * Approve student join request
   */
  static async approveStudentJoinRequest(membershipId: string, approvedBy: string): Promise<SchoolMembership> {
    try {
      const membership = await SchoolMembershipRepository.approve(membershipId, approvedBy);
      log.info('Join request approved', { membershipId, approvedBy });
      return membership;
    } catch (error) {
      log.error('Failed to approve join request:', error);
      throw error;
    }
  }

  /**
   * Reject student join request
   */
  static async rejectStudentJoinRequest(membershipId: string): Promise<SchoolMembership> {
    try {
      const membership = await SchoolMembershipRepository.reject(membershipId);
      log.info('Join request rejected', { membershipId });
      return membership;
    } catch (error) {
      log.error('Failed to reject join request:', error);
      throw error;
    }
  }

  /**
   * Get pending join requests for school
   */
  static async getPendingJoinRequests(schoolId: string, limit = 50, offset = 0): Promise<SchoolMembership[]> {
    try {
      return await SchoolMembershipRepository.findBySchoolId(schoolId, 'pending');
    } catch (error) {
      log.error('Failed to get pending join requests:', error);
      throw error;
    }
  }

  /**
   * Get student's school memberships
   */
  static async getStudentSchools(studentId: string): Promise<SchoolMembership[]> {
    try {
      return await SchoolMembershipRepository.findByStudentId(studentId);
    } catch (error) {
      log.error('Failed to get student schools:', error);
      throw error;
    }
  }

  /**
   * Get approved members of school
   */
  static async getSchoolMembers(schoolId: string): Promise<SchoolMembership[]> {
    try {
      return await SchoolMembershipRepository.findBySchoolId(schoolId, 'approved');
    } catch (error) {
      log.error('Failed to get school members:', error);
      throw error;
    }
  }

  /**
   * Count school members
   */
  static async countSchoolMembers(schoolId: string): Promise<number> {
    try {
      return await SchoolMembershipRepository.countMembersBySchool(schoolId);
    } catch (error) {
      log.error('Failed to count school members:', error);
      throw error;
    }
  }
}
