'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createLogger } from '@/lib/logger';

const log = createLogger('DashboardRouter');

/**
 * Dashboard Router Page
 * 
 * This page handles role-based routing after login.
 * When a user visits /dashboard, they are redirected to their role-specific dashboard:
 * - student → /dashboard/student
 * - teacher → /dashboard/teacher
 * - principal → /dashboard/principal
 * - accountant → /dashboard/accountant
 * - supervisor → /dashboard/supervisor
 * - saas_admin → /dashboard/admin
 */
export default function DashboardRouter() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // No user, redirect to login
      log.warn('No user found, redirecting to login');
      router.push('/auth/login');
      return;
    }

    // Map role to dashboard path
    const dashboardMap: Record<string, string> = {
      student: '/dashboard/student',
      parent: '/dashboard/parent',
      teacher: '/dashboard/teacher',
      principal: '/dashboard/principal',
      school_admin: '/dashboard/principal',
      accountant: '/dashboard/accountant',
      supervisor: '/dashboard/supervisor',
      admin: '/dashboard/admin',
      saas_admin: '/dashboard/admin',
    };

    const dashboardPath = dashboardMap[user.role];

    if (!dashboardPath) {
      log.error('Unknown role:', user.role);
      router.push('/auth/login');
      return;
    }

    log.info(`Routing ${user.email} (${user.role}) to ${dashboardPath}`);
    router.push(dashboardPath);
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If we get here, something went wrong
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-red-600 mb-4">Unable to determine dashboard</p>
        <button
          onClick={() => router.push('/auth/login')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
