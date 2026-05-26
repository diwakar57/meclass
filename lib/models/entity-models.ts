/**
 * Entity Models for Multi-Tenant SaaS Platform
 * Covers: Schools, Staff, Students, and Memberships
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  SAAS_ADMIN = 'saas_admin',
  PRINCIPAL = 'principal',
  TEACHER = 'teacher',
  ACCOUNTANT = 'accountant',
  SUPERVISOR = 'supervisor',
  STUDENT = 'student',
}

export enum StaffRole {
  PRINCIPAL = 'principal',
  TEACHER = 'teacher',
  ACCOUNTANT = 'accountant',
  SUPERVISOR = 'supervisor',
}

export enum MembershipStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INACTIVE = 'inactive',
}

export enum JoinRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SubscriptionTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

// ============================================================================
// SCHOOL (TENANT)
// ============================================================================

export interface School {
  id: string;
  name: string;
  domain?: string;
  logoUrl?: string;
  branding?: Record<string, any>;
  subscriptionTier: SubscriptionTier;
  maxStudents: number;
  maxTeachers: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateSchoolRequest {
  name: string;
  domain?: string;
  logoUrl?: string;
  subscriptionTier?: SubscriptionTier;
  maxStudents?: number;
  maxTeachers?: number;
}

export interface UpdateSchoolRequest {
  name?: string;
  domain?: string;
  logoUrl?: string;
  subscriptionTier?: SubscriptionTier;
  maxStudents?: number;
  maxTeachers?: number;
}

// ============================================================================
// USER (BASE)
// ============================================================================

export interface User {
  id: string;
  schoolId?: string; // null for saas_admin
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  schoolId?: string;
}

// ============================================================================
// STAFF PROFILE
// ============================================================================

export interface StaffProfile {
  id: string;
  userId: string;
  schoolId: string;
  staffRole: StaffRole;
  department?: string;
  positionTitle?: string;
  phone?: string;
  officeLocation?: string;
  qualifications?: string;
  subjectExpertise?: string[]; // For teachers
  bio?: string;
  verified: boolean;
  onboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  staffRole: StaffRole;
  department?: string;
  positionTitle?: string;
  phone?: string;
  officeLocation?: string;
  qualifications?: string;
  subjectExpertise?: string[];
  bio?: string;
}

export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  positionTitle?: string;
  officeLocation?: string;
  qualifications?: string;
  subjectExpertise?: string[];
  bio?: string;
}

// ============================================================================
// STUDENT
// ============================================================================

export interface StudentProfile {
  id: string;
  userId: string;
  gradeLevel?: string;
  interests?: string[];
  strengths?: string[];
  weakAreas?: string[];
  learningStyle?: string;
  languagePreference: string;
  onboardingCompleted: boolean;
  diagnosticScore?: number;
  preferredAITeacherPersona: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gradeLevel?: string;
  interests?: string[];
  learningStyle?: string;
}

export interface UpdateStudentProfileRequest {
  gradeLevel?: string;
  interests?: string[];
  strengths?: string[];
  weakAreas?: string[];
  learningStyle?: string;
  languagePreference?: string;
  preferredAITeacherPersona?: string;
}

// ============================================================================
// SCHOOL MEMBERSHIP
// ============================================================================

export interface SchoolMembership {
  id: string;
  studentId: string;
  schoolId: string;
  status: MembershipStatus;
  approvedByUserId?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMembershipRequest {
  studentId: string;
  schoolId: string;
}

export interface ApproveMembershipRequest {
  membershipId: string;
  approvedByUserId: string;
}

export interface RejectMembershipRequest {
  membershipId: string;
  rejectionReason?: string;
}

// ============================================================================
// STUDENT JOIN REQUEST
// ============================================================================

export interface StudentJoinRequest {
  id: string;
  studentId: string;
  schoolId: string;
  status: JoinRequestStatus;
  requestMessage?: string;
  approvalMessage?: string;
  approvedByUserId?: string;
  reviewedAt?: Date;
  membershipId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJoinRequestRequest {
  schoolId: string;
  requestMessage?: string;
}

export interface ApproveJoinRequestRequest {
  joinRequestId: string;
  approvalMessage?: string;
}

export interface RejectJoinRequestRequest {
  joinRequestId: string;
  approvalMessage?: string;
}

// ============================================================================
// STAFF REPORTING RELATIONSHIP
// ============================================================================

export interface StaffReportingRelationship {
  id: string;
  schoolId: string;
  staffMemberId: string;
  supervisorId: string;
  relationshipType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportingRelationshipRequest {
  staffMemberId: string;
  supervisorId: string;
  relationshipType?: string;
}

// ============================================================================
// COMBINED VIEWS / DTO
// ============================================================================

export interface StudentWithMemberships {
  student: User & StudentProfile;
  memberships: SchoolMembership[];
  joinRequests: StudentJoinRequest[];
}

export interface SchoolWithStaff {
  school: School;
  principal: (User & StaffProfile) | null;
  staff: (User & StaffProfile)[];
  studentCount: number;
}

export interface SchoolDashboardData {
  school: School;
  students: { id: string; email: string; status: MembershipStatus }[];
  staff: {
    id: string;
    email: string;
    name: string;
    role: StaffRole;
  }[];
  pendingJoinRequests: StudentJoinRequest[];
  stats: {
    totalStudents: number;
    approvedStudents: number;
    pendingRequests: number;
    staffCount: number;
  };
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
