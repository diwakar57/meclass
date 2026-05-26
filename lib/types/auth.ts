// lib/types/auth.ts - Authentication types

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

export interface DecodedToken {
  userId: string;
  schoolId?: string; // null for saas_admin
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  schoolId?: string;
  role: UserRole;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  schoolId?: string; // Optional for saas_admin
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    schoolId?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  expiresIn: number;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  role: 'student' | 'teacher';
}
