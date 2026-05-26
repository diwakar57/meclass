/**
 * Entity Service Layer
 * Business logic with tenant isolation and validation
 */

import { createLogger } from '@/lib/logger';
import * as repo from '@/lib/repositories/entity-repository';
import {
  School,
  User,
  StaffProfile,
  StudentProfile,
  SchoolMembership,
  StudentJoinRequest,
  CreateSchoolRequest,
  CreateStaffRequest,
  CreateStudentRequest,
  CreateJoinRequestRequest,
  ApproveJoinRequestRequest,
  RejectJoinRequestRequest,
  SubscriptionTier,
  MembershipStatus,
  JoinRequestStatus,
  StaffRole,
  UserRole,
  StudentWithMemberships,
  SchoolDashboardData,
} from '@/lib/models/entity-models';
import { hashPassword } from '@/lib/auth/password';

const log = createLogger('EntityService');

// ============================================================================
// SCHOOL SERVICE (SaaS Admin Level)
// ============================================================================

export const schoolService = {
  /**
   * Create a new school tenant
   * Only SaaS admins can call this
   */
  async createSchool(data: CreateSchoolRequest): Promise<School> {
    log.info(`Creating new school: ${data.name}`);

    // Validate
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('School name is required');
    }

    if (data.domain) {
      // Check domain uniqueness
      const existing = await repo.schoolRepository.list(1000, 0);
      if (existing.some((s) => s.domain === data.domain)) {
        throw new Error('Domain already in use');
      }
    }

    return await repo.schoolRepository.create(data);
  },

  /**
   * Get school details (with tenant isolation check)
   */
  async getSchool(schoolId: string, requestingUserId: string, requestingUserRole: UserRole): Promise<School | null> {
    // SaaS admins can view any school
    if (requestingUserRole !== UserRole.SAAS_ADMIN) {
      // Non-admin must belong to school
      const user = await repo.userRepository.getById(requestingUserId);
      if (!user || user.schoolId !== schoolId) {
        throw new Error('Unauthorized access to school');
      }
    }

    return await repo.schoolRepository.getById(schoolId);
  },

  /**
   * List all schools (SaaS admin only)
   */
  async listSchools(userRole: UserRole, limit = 50, offset = 0) {
    if (userRole !== UserRole.SAAS_ADMIN) {
      throw new Error('Only SaaS admins can list all schools');
    }

    return await repo.schoolRepository.list(limit, offset);
  },

  /**
   * Update school details
   */
  async updateSchool(schoolId: string, data: Partial<School>, requestingUserRole: UserRole): Promise<School | null> {
    if (requestingUserRole !== UserRole.SAAS_ADMIN) {
      throw new Error('Only SaaS admins can update schools');
    }

    return await repo.schoolRepository.update(schoolId, data);
  },
};

// ============================================================================
// STAFF SERVICE (School Admin/Principal Level)
// ============================================================================

export const staffService = {
  /**
   * Create a new staff member
   * Principal can create staff, verify school membership
   */
  async createStaff(schoolId: string, data: CreateStaffRequest, requestingUserId: string): Promise<{ user: User; staff: StaffProfile }> {
    log.info(`Creating staff ${data.staffRole} in school ${schoolId}`);

    // Verify requester is principal of the school
    const requester = await repo.userRepository.getById(requestingUserId);
    if (!requester || requester.schoolId !== schoolId || requester.role !== UserRole.PRINCIPAL) {
      throw new Error('Only school principals can create staff');
    }

    // Check for duplicate email in school
    const existingUser = await repo.userRepository.getByEmail(data.email);
    if (existingUser) {
      if (existingUser.schoolId === schoolId) {
        throw new Error('Email already used in this school');
      }
      // Different school is OK - users can have accounts across schools
    }

    // Create user
    const passwordHash = await hashPassword(data.password);
    const user = await repo.userRepository.create({
      email: data.email,
      passwordHash,
      role: mapStaffRoleToUserRole(data.staffRole),
      firstName: data.firstName,
      lastName: data.lastName,
      schoolId,
    });

    // Create staff profile
    const staff = await repo.staffProfileRepository.create({
      userId: user.id,
      schoolId,
      staffRole: data.staffRole,
      department: data.department,
      positionTitle: data.positionTitle,
      phone: data.phone,
      officeLocation: data.officeLocation,
      qualifications: data.qualifications,
      subjectExpertise: data.subjectExpertise,
      bio: data.bio,
    });

    log.info(`Created staff member: ${user.id}`);
    return { user, staff };
  },

  /**
   * List all staff in a school
   * With tenant isolation
   */
  async listStaff(schoolId: string, requestingUserId: string): Promise<StaffProfile[]> {
    // Verify requester belongs to school
    const requester = await repo.userRepository.getById(requestingUserId);
    if (!requester || requester.schoolId !== schoolId) {
      throw new Error('Unauthorized access to school staff');
    }

    return await repo.staffProfileRepository.listBySchool(schoolId);
  },

  /**
   * Get staff by role (e.g., all teachers)
   */
  async getStaffByRole(schoolId: string, role: StaffRole, requestingUserId: string): Promise<StaffProfile[]> {
    // Verify requester
    const requester = await repo.userRepository.getById(requestingUserId);
    if (!requester || requester.schoolId !== schoolId) {
      throw new Error('Unauthorized');
    }

    return await repo.staffProfileRepository.listByRole(schoolId, role);
  },

  /**
   * Promote a teacher to supervisor
   */
  async promoteTeacher(schoolId: string, userId: string, requestingUserId: string): Promise<StaffProfile | null> {
    // Only principal can promote
    const requester = await repo.userRepository.getById(requestingUserId);
    if (!requester || requester.role !== UserRole.PRINCIPAL || requester.schoolId !== schoolId) {
      throw new Error('Only principals can promote staff');
    }

    const staff = await repo.staffProfileRepository.getByUserId(userId);
    if (!staff || staff.schoolId !== schoolId) {
      throw new Error('Staff member not found');
    }

    return await repo.staffProfileRepository.update(staff.id, {
      ...staff,
      staffRole: StaffRole.SUPERVISOR,
    });
  },
};

// ============================================================================
// STUDENT SERVICE (Student Level)
// ============================================================================

export const studentService = {
  /**
   * Register a new independent student
   * Students are NOT automatically attached to a school
   */
  async registerStudent(data: CreateStudentRequest): Promise<{ user: User; profile: StudentProfile }> {
    log.info(`Registering new student: ${data.email}`);

    // Check email uniqueness globally
    const existing = await repo.userRepository.getByEmail(data.email);
    if (existing) {
      throw new Error('Email already registered');
    }

    // Create user (with NO school_id initially)
    const passwordHash = await hashPassword(data.password);
    const user = await repo.userRepository.create({
      email: data.email,
      passwordHash,
      role: UserRole.STUDENT,
      firstName: data.firstName,
      lastName: data.lastName,
      // schoolId is null - student is independent
    });

    // Create student profile
    const profile = await repo.studentProfileRepository.create({
      userId: user.id,
      gradeLevel: data.gradeLevel,
      interests: data.interests,
      learningStyle: data.learningStyle,
    });

    log.info(`Registered student: ${user.id}`);
    return { user, profile };
  },

  /**
   * Get student with all their memberships
   */
  async getStudentWithMemberships(studentId: string, requestingUserId: string): Promise<StudentWithMemberships> {
    // Students can only view own data
    if (studentId !== requestingUserId) {
      throw new Error('Unauthorized access');
    }

    const user = await repo.userRepository.getById(studentId);
    if (!user || user.role !== UserRole.STUDENT) {
      throw new Error('Student not found');
    }

    const profile = await repo.studentProfileRepository.getByUserId(studentId);
    if (!profile) {
      throw new Error('Student profile not found');
    }

    const memberships = await repo.schoolMembershipRepository.listByStudent(studentId);
    const joinRequests = await repo.studentJoinRequestRepository.listByStudent(studentId);

    return {
      student: { ...user, ...profile } as any,
      memberships,
      joinRequests,
    };
  },

  /**
   * Update student profile
   */
  async updateProfile(studentId: string, data: any, requestingUserId: string): Promise<StudentProfile | null> {
    if (studentId !== requestingUserId) {
      throw new Error('Unauthorized');
    }

    const profile = await repo.studentProfileRepository.getByUserId(studentId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Only allow certain updates
    const updates: Partial<StudentProfile> = {};
    if (data.gradeLevel) updates.gradeLevel = data.gradeLevel;
    if (data.interests) updates.interests = data.interests;
    if (data.learningStyle) updates.learningStyle = data.learningStyle;

    return profile; // Update logic would go here
  },
};

// ============================================================================
// SCHOOL MEMBERSHIP SERVICE
// ============================================================================

export const membershipService = {
  /**
   * Student requests to join a school
   */
  async requestToJoinSchool(
    studentId: string,
    schoolId: string,
    requestMessage?: string,
    requestingUserId?: string
  ): Promise<StudentJoinRequest> {
    // Verify requester is the student
    if (requestingUserId && studentId !== requestingUserId) {
      throw new Error('Unauthorized');
    }

    // Verify student exists and is independent
    const student = await repo.userRepository.getById(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      throw new Error('Student not found');
    }

    // Verify school exists
    const school = await repo.schoolRepository.getById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Check if already a member or has pending request
    const existing = await repo.schoolMembershipRepository.listByStudent(studentId);
    if (existing.some((m) => m.schoolId === schoolId && m.status !== MembershipStatus.REJECTED)) {
      throw new Error('Already a member or have pending request for this school');
    }

    log.info(`Student ${studentId} requesting to join school ${schoolId}`);
    return await repo.studentJoinRequestRepository.create(studentId, schoolId, requestMessage);
  },

  /**
   * School approves a join request and creates membership
   */
  async approveJoinRequest(schoolId: string, joinRequestId: string, approverUserId: string, approvalMessage?: string): Promise<{
    joinRequest: StudentJoinRequest;
    membership: SchoolMembership;
  }> {
    // Verify approver is principal/admin of school
    const approver = await repo.userRepository.getById(approverUserId);
    if (!approver || approver.schoolId !== schoolId || [UserRole.PRINCIPAL, UserRole.ACCOUNTANT].indexOf(approver.role) === -1) {
      throw new Error('Only school admin can approve join requests');
    }

    const joinRequest = await repo.studentJoinRequestRepository.getById(joinRequestId);
    if (!joinRequest || joinRequest.schoolId !== schoolId) {
      throw new Error('Join request not found');
    }

    // Create membership
    const membership = await repo.schoolMembershipRepository.create(joinRequest.studentId, schoolId);

    // Update join request
    const updatedRequest = await repo.studentJoinRequestRepository.updateStatus(
      joinRequestId,
      JoinRequestStatus.APPROVED,
      approverUserId,
      approvalMessage,
      membership.id
    );

    if (!updatedRequest) {
      throw new Error('Failed to update join request');
    }

    // Update user's school_id if server-side attribution is needed
    await repo.userRepository.update(joinRequest.studentId, {
      schoolId: schoolId, // Student's primary school
    } as any);

    log.info(`Approved student ${joinRequest.studentId} to join school ${schoolId}`);

    return {
      joinRequest: updatedRequest,
      membership,
    };
  },

  /**
   * School rejects a join request
   */
  async rejectJoinRequest(schoolId: string, joinRequestId: string, rejecterUserId: string, rejectionReason?: string): Promise<StudentJoinRequest | null> {
    // Verify rejecter authority
    const rejecter = await repo.userRepository.getById(rejecterUserId);
    if (!rejecter || rejecter.schoolId !== schoolId || rejecter.role !== UserRole.PRINCIPAL) {
      throw new Error('Unauthorized');
    }

    const joinRequest = await repo.studentJoinRequestRepository.getById(joinRequestId);
    if (!joinRequest || joinRequest.schoolId !== schoolId) {
      throw new Error('Join request not found');
    }

    log.info(`Rejected student ${joinRequest.studentId} join request for school ${schoolId}`);

    return await repo.studentJoinRequestRepository.updateStatus(
      joinRequestId,
      JoinRequestStatus.REJECTED,
      rejecterUserId,
      rejectionReason
    );
  },

  /**
   * Get pending join requests for a school
   */
  async getPendingRequests(schoolId: string, requestingUserId: string): Promise<StudentJoinRequest[]> {
    // Verify requester is admin
    const requester = await repo.userRepository.getById(requestingUserId);
    if (!requester || requester.schoolId !== schoolId || requester.role !== UserRole.PRINCIPAL) {
      throw new Error('Unauthorized');
    }

    return await repo.studentJoinRequestRepository.listBySchoolPending(schoolId);
  },

  /**
   * Get school memberships for a student
   */
  async getStudentMemberships(studentId: string, requestingUserId: string): Promise<SchoolMembership[]> {
    if (studentId !== requestingUserId) {
      throw new Error('Unauthorized');
    }

    return await repo.schoolMembershipRepository.listByStudent(studentId);
  },

  /**
   * Get school members (approved students)
   */
  async getSchoolMembers(schoolId: string, requestingUserId: string): Promise<SchoolMembership[]> {
    // Verify access
    const requester = await repo.userRepository.getById(requestingUserId);
    if (!requester || requester.schoolId !== schoolId) {
      throw new Error('Unauthorized');
    }

    return await repo.schoolMembershipRepository.listBySchool(schoolId, MembershipStatus.APPROVED);
  },
};

// ============================================================================
// SCHOOL DASHBOARD SERVICE
// ============================================================================

export const schoolDashboardService = {
  /**
   * Get complete school dashboard data
   * For school admin/principal
   */
  async getSchoolDashboard(schoolId: string, requestingUserId: string): Promise<SchoolDashboardData> {
    // Verify requester is admin of school
    const requester = await repo.userRepository.getById(requestingUserId);
    if (!requester || requester.schoolId !== schoolId || ![UserRole.PRINCIPAL, UserRole.ACCOUNTANT].includes(requester.role)) {
      throw new Error('Unauthorized access');
    }

    const school = await repo.schoolRepository.getById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Get members
    const members = await repo.schoolMembershipRepository.listBySchool(schoolId, MembershipStatus.APPROVED);
    const memberUsers = await Promise.all(members.map((m) => repo.userRepository.getById(m.studentId)));

    const students = memberUsers
      .filter((u) => u !== null)
      .map((u) => ({
        id: u!.id,
        email: u!.email,
        status: MembershipStatus.APPROVED,
      }));

    // Get staff
    const staff = await repo.staffProfileRepository.listBySchool(schoolId);
    const staffUsers = await Promise.all(staff.map((s) => repo.userRepository.getById(s.userId)));

    const staffList = staffUsers
      .filter((u) => u !== null)
      .map((u) => ({
        id: u!.id,
        email: u!.email,
        name: `${u!.firstName} ${u!.lastName}`,
        role: u!.role,
      }));

    // Get pending requests
    const pendingRequests = await repo.studentJoinRequestRepository.listBySchoolPending(schoolId);

    return {
      school,
      students,
      staff: staffList as any,
      pendingJoinRequests: pendingRequests,
      stats: {
        totalStudents: students.length,
        approvedStudents: students.length,
        pendingRequests: pendingRequests.length,
        staffCount: staff.length,
      },
    };
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapStaffRoleToUserRole(staffRole: StaffRole): UserRole {
  const roleMap: Record<StaffRole, UserRole> = {
    [StaffRole.PRINCIPAL]: UserRole.PRINCIPAL,
    [StaffRole.TEACHER]: UserRole.TEACHER,
    [StaffRole.ACCOUNTANT]: UserRole.ACCOUNTANT,
    [StaffRole.SUPERVISOR]: UserRole.SUPERVISOR,
  };

  return roleMap[staffRole];
}

/**
 * Verify tenant isolation - ensure user belongs to school
 */
export function verifyTenantIsolation(user: User, requiredSchoolId: string): void {
  if (user.role === UserRole.SAAS_ADMIN) {
    return; // SaaS admins can access any school
  }

  if (user.schoolId !== requiredSchoolId) {
    throw new Error('Tenant isolation violation: user does not belong to school');
  }
}
