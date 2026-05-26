import type { UserRole } from '@/lib/types/models';

export interface DevFallbackUser {
  id: string;
  email: string;
  role: UserRole;
  schoolId?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

interface DevFallbackAccount {
  password: string;
  user: DevFallbackUser;
}

const DEV_FALLBACK_ACCOUNTS: Record<string, DevFallbackAccount> = {
  'admin@learnai.com': {
    password: 'admin123',
    user: {
      id: 'demo-saas-admin-001',
      email: 'admin@learnai.com',
      role: 'saas_admin',
      firstName: 'Platform',
      lastName: 'Admin',
    },
  },
  'principal@demo.learnai.study': {
    password: 'principal123',
    user: {
      id: 'demo-principal-001',
      email: 'principal@demo.learnai.study',
      role: 'principal',
      schoolId: 'school-demo-001',
      firstName: 'Sarah',
      lastName: 'Johnson',
    },
  },
  'teacher@demo.learnai.study': {
    password: 'teacher123',
    user: {
      id: 'demo-teacher-001',
      email: 'teacher@demo.learnai.study',
      role: 'teacher',
      schoolId: 'school-demo-001',
      firstName: 'Michael',
      lastName: 'Carter',
    },
  },
  'student@demo.learnai.study': {
    password: 'student123',
    user: {
      id: 'demo-student-001',
      email: 'student@demo.learnai.study',
      role: 'student',
      schoolId: 'school-demo-001',
      firstName: 'Emma',
      lastName: 'Davis',
    },
  },
  'parent@demo.learnai.study': {
    password: 'parent123',
    user: {
      id: 'demo-parent-001',
      email: 'parent@demo.learnai.study',
      role: 'parent',
      schoolId: 'school-demo-001',
      firstName: 'Robert',
      lastName: 'Wilson',
    },
  },
};

export function isDevAuthFallbackEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const value = (process.env.ENABLE_DEV_AUTH_FALLBACK || 'true').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

export function getDevFallbackUser(email: string, password: string): DevFallbackUser | null {
  if (!isDevAuthFallbackEnabled()) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  const account = DEV_FALLBACK_ACCOUNTS[normalized];
  if (!account) {
    return null;
  }

  if (account.password !== password) {
    return null;
  }

  return account.user;
}
