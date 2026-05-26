// lib/types/models.ts - Core TypeScript models for SaaS platform

export type UserRole =
  | 'saas_admin'
  | 'admin'
  | 'school_admin'
  | 'principal'
  | 'teacher'
  | 'accountant'
  | 'supervisor'
  | 'parent'
  | 'student';
export type SchoolStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'suspended';
export type MembershipStatus = 'pending' | 'approved' | 'rejected';
export type SubscriptionTier = 'free' | 'professional' | 'enterprise';

// USER MODEL
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId?: string | null;
  avatarUrl?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// STUDENT PROFILE
export interface StudentProfile {
  id: string;
  userId: string;
  languagePreference: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// TEACHER PROFILE
export interface TeacherProfile {
  id: string;
  userId: string;
  schoolId: string;
  qualifications?: string;
  subjectExpertise?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// PRINCIPAL PROFILE
export interface PrincipalProfile {
  id: string;
  userId: string;
  schoolId: string;
  phone?: string;
  officeLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ACCOUNTANT PROFILE
export interface AccountantProfile {
  id: string;
  userId: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

// SCHOOL (TENANT)
export interface School {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  principalId: string;
  country?: string;
  city?: string;
  state?: string;
  subscriptionTier?: SubscriptionTier;
  apiKey?: string;
  status: SchoolStatus;
  createdAt: Date;
  updatedAt: Date;
}

// SCHOOL MEMBERSHIP
export interface SchoolMembership {
  id: string;
  studentId: string;
  schoolId: string;
  status: MembershipStatus;
  approvedByUserId?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// CLASS
export interface Class {
  id: string;
  schoolId: string;
  name: string;
  teacherId: string;
  gradeLevel?: string;
  createdAt: Date;
  updatedAt: Date;
}

// SUBSCRIPTION
export interface Subscription {
  id: string;
  schoolId: string;
  planType: SubscriptionTier;
  monthlyCost: number;
  status: 'active' | 'inactive' | 'cancelled';
  startedAt: Date;
  endsAt?: Date;
  updatedAt: Date;
}

// SESSION
export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  schoolId?: string | null;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

// AUTH RESPONSE
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// API RESPONSE
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// PAGINATION
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ACADEMIC MODELS (PHASE 1 - SYLLABUS MANAGEMENT)
export type SyllabusStatus = 'draft' | 'published' | 'archived';

export interface Grade {
  id: string;
  schoolId: string;
  name: string;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Syllabus {
  id: string;
  schoolId: string;
  gradeId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  status: SyllabusStatus;
  version: number;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyllabusUnit {
  id: string;
  syllabusId: string;
  title: string;
  description?: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  syllabusId: string;
  syllabusUnitId?: string | null;
  schoolId: string;
  title: string;
  description?: string;
  orderIndex: number;
  sourceGradeId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicDependency {
  id: string;
  topicId: string;
  dependsOnTopicId?: string | null;
  dependsOnTopicName?: string | null;
  dependsOnGradeId?: string | null;
  createdAt: Date;
}
