/**
 * lib/auth/role-redirects.ts
 * Centralized dashboard routing based on user role
 * Single source of truth for role-to-dashboard mapping
 */

import type { UserRole } from '@/lib/types/models';

/**
 * Maps each user role to their correct dashboard route
 * Used by:
 * - Login/signup pages
 * - AuthContext
 * - Middleware
 * - Dashboard components
 */
export const DASHBOARD_ROUTES: Record<UserRole | string, string> = {
  student: '/dashboard/student',
  teacher: '/dashboard/teacher',
  principal: '/dashboard/principal',
  school_admin: '/dashboard/principal', // school_admin is treated as principal
  accountant: '/dashboard/accountant',
  supervisor: '/dashboard/supervisor',
  parent: '/dashboard/parent',
  admin: '/dashboard/admin',
  saas_admin: '/dashboard/admin',
};

/**
 * Get the correct dashboard URL for a given role
 * Falls back to login if role is unknown
 */
export function getCorrectDashboard(role?: string): string {
  if (!role) {
    return '/auth/login';
  }

  return DASHBOARD_ROUTES[role] || '/auth/login';
}

/**
 * Validate that a user is accessing the correct dashboard
 * Used by dashboard components
 */
export function isCorrectDashboard(userRole: string, currentPath: string): boolean {
  const expectedPath = getCorrectDashboard(userRole);
  return currentPath === expectedPath || currentPath.startsWith(expectedPath + '/');
}
