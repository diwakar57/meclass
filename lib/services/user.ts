import { UserRepository, type CreateUserInput as RepoCreateUserInput } from '@/lib/repositories/user';
import { SchoolRepository } from '@/lib/repositories/school';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken, generateRefreshToken } from '@/lib/auth/jwt';
import { createLogger } from '@/lib/logger';
import type { User, UserRole } from '@/lib/types/models';

const log = createLogger('UserService');

export interface SignupInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class UserService {
  /**
   * Register a new user (signup)
   */
  static async signup(input: SignupInput): Promise<AuthResponse> {
    try {
      // Check if email already exists
      const existingUser = await UserRepository.findByEmail(input.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // For teachers/principals, validate school code
      let schoolId: string | undefined;
      if ((input.role === 'teacher' || input.role === 'principal') && input.schoolCode) {
        // For now, use schoolCode as-is. In production, validate against school codes table
        // TODO: Implement proper school code validation
        schoolId = input.schoolCode;
      }

      // Create user
      const user = await UserRepository.create({
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        schoolId,
      });

      // Generate tokens
      const accessToken = await generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || undefined,
      });

      const refreshToken = await generateRefreshToken(user.id, user.schoolId || undefined);

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      log.error('Signup failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    try {
      // Find user with password
      const userWithPassword = await UserRepository.findByEmailWithPassword(input.email);
      if (!userWithPassword) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const passwordValid = await verifyPassword(input.password, userWithPassword.password_hash);
      if (!passwordValid) {
        throw new Error('Invalid email or password');
      }

      // Convert to User object
      const user: User = {
        id: userWithPassword.id,
        email: userWithPassword.email,
        firstName: userWithPassword.first_name,
        lastName: userWithPassword.last_name,
        role: userWithPassword.role as UserRole,
        schoolId: userWithPassword.school_id || null,
        avatarUrl: userWithPassword.avatar_url,
        createdAt: userWithPassword.created_at,
        updatedAt: userWithPassword.updated_at,
      };

      // Generate tokens
      const accessToken = await generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || undefined,
      });

      const refreshToken = await generateRefreshToken(user.id, user.schoolId || undefined);

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      log.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      return await UserRepository.findById(userId);
    } catch (error) {
      log.error('Failed to get user:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<User> {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      log.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, input: { firstName?: string; lastName?: string; avatarUrl?: string }): Promise<User> {
    try {
      const user = await UserRepository.update(userId, {
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: input.avatarUrl,
      });

      return user;
    } catch (error) {
      log.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Get teachers for a school
   */
  static async getTeachersBySchool(schoolId: string): Promise<User[]> {
    try {
      return await UserRepository.findByRole('teacher', schoolId);
    } catch (error) {
      log.error('Failed to get teachers:', error);
      throw error;
    }
  }

  /**
   * Get students by school
   */
  static async getStudentsBySchool(schoolId: string): Promise<User[]> {
    try {
      return await UserRepository.findByRole('student', schoolId);
    } catch (error) {
      log.error('Failed to get students:', error);
      throw error;
    }
  }

  /**
   * Email exists check
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      return await UserRepository.emailExists(email);
    } catch (error) {
      log.error('Failed to check email:', error);
      throw error;
    }
  }
}
