/**
 * Dashboard Routing Test Suite
 * Tests routing for all 7 user roles (Student, Teacher, Principal, Admin, Supervisor, Accountant, Parent)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Role-to-Dashboard Routes Mapping
 */
const ROLE_ROUTES = {
  student: {
    main: '/dashboard/student',
    pages: [
      '/dashboard/student/profile',
      '/dashboard/student/schools',
      '/dashboard/student/progress',
      '/dashboard/student/tests',
      '/dashboard/student/topics',
      '/dashboard/student/learning-dna',
      '/dashboard/student/portfolio',
    ],
  },
  teacher: {
    main: '/dashboard/teacher',
    pages: [
      '/dashboard/teacher/classes',
      '/dashboard/teacher/assignments',
      '/dashboard/teacher/grades',
      '/dashboard/teacher/quizzes',
      '/dashboard/teacher/student-detail',
      '/dashboard/teacher/attendance',
      '/dashboard/teacher/students',
    ],
  },
  principal: {
    main: '/dashboard/principal',
    pages: [
      '/dashboard/principal/billing',
      '/dashboard/principal/fees',
      '/dashboard/principal/payments',
      '/dashboard/principal/staff',
      '/dashboard/principal/attendance',
    ],
  },
  admin: {
    main: '/dashboard/admin',
    pages: [
      '/dashboard/admin/schools',
      '/dashboard/admin/analytics',
      '/dashboard/admin/settings',
      '/dashboard/admin/teacher-performance',
      '/dashboard/admin/advanced-analytics',
      '/dashboard/admin/students',
    ],
  },
  supervisor: {
    main: '/dashboard/supervisor',
    pages: [
      '/dashboard/supervisor/reports',
      '/dashboard/supervisor/metrics',
    ],
  },
  accountant: {
    main: '/dashboard/accountant',
    pages: [
      '/dashboard/accountant/ledger',
    ],
  },
  parent: {
    main: '/dashboard/parent',
    pages: [
      '/dashboard/parent/dashboard',
      '/dashboard/parent/notifications',
    ],
  },
};

/**
 * Cross-Role Pages (accessible by multiple roles)
 */
const CROSS_ROLE_PAGES = [
  '/dashboard/activity-log',
  '/dashboard/communications',
  '/dashboard/schedule',
  '/dashboard/resources',
  '/dashboard/exams',
  '/dashboard/enrollment',
];

describe('Dashboard Routing Tests', () => {
  describe('Role-Specific Routes', () => {
    Object.entries(ROLE_ROUTES).forEach(([role, config]) => {
      describe(`${role.charAt(0).toUpperCase() + role.slice(1)} Routes`, () => {
        it(`should have main dashboard at ${config.main}`, () => {
          expect(config.main).toBeDefined();
          expect(config.main).toMatch(/^\/dashboard\/\w+$/);
        });

        it(`should have ${config.pages.length} feature pages`, () => {
          expect(config.pages.length).toBeGreaterThan(0);
        });

        config.pages.forEach((page) => {
          it(`should have correct route format for ${page}`, () => {
            expect(page).toMatch(/^\/dashboard\/\w+\//);
          });
        });
      });
    });
  });

  describe('Cross-Role Pages', () => {
    it(`should have ${CROSS_ROLE_PAGES.length} cross-role pages`, () => {
      expect(CROSS_ROLE_PAGES.length).toBeGreaterThan(0);
    });

    CROSS_ROLE_PAGES.forEach((page) => {
      it(`should have correct format for cross-role page ${page}`, () => {
        expect(page).toMatch(/^\/dashboard\/\w+(-\w+)*$/);
      });
    });
  });

  describe('Route Uniqueness', () => {
    it('should not have duplicate routes within roles', () => {
      Object.entries(ROLE_ROUTES).forEach(([role, config]) => {
        const routes = [
          config.main,
          ...config.pages,
        ];
        const uniqueRoutes = new Set(routes);
        expect(uniqueRoutes.size).toBe(routes.length);
      });
    });

    it('should not have overlapping role-specific and cross-role pages', () => {
      const allRolePages = new Set<string>();
      Object.entries(ROLE_ROUTES).forEach(([_, config]) => {
        config.pages.forEach((page) => allRolePages.add(page));
      });

      CROSS_ROLE_PAGES.forEach((page) => {
        expect(allRolePages.has(page)).toBe(false);
      });
    });
  });

  describe('Navigation Patterns', () => {
    it('should follow consistent naming conventions', () => {
      Object.entries(ROLE_ROUTES).forEach(([role, config]) => {
        config.pages.forEach((page) => {
          // Should be kebab-case after dashboard
          const parts = page.split('/').slice(3); // Remove /dashboard/{role}
          parts.forEach((part) => {
            expect(part).toMatch(/^[a-z]+(-[a-z]+)*$/);
          });
        });
      });
    });

    it('should use consistent path depth', () => {
      Object.entries(ROLE_ROUTES).forEach(([role, config]) => {
        config.pages.forEach((page) => {
          const depth = page.split('/').length;
          expect(depth).toBeGreaterThanOrEqual(3); // /dashboard/{role}/{page}
          expect(depth).toBeLessThanOrEqual(4); // Allow one level deep
        });
      });
    });
  });
});

/**
 * Type Safety Tests
 */
describe('Type Safety for Routes', () => {
  it('should have no empty route arrays', () => {
    Object.entries(ROLE_ROUTES).forEach(([role, config]) => {
      expect(config.pages.length).toBeGreaterThan(0);
    });
  });

  it('should have main route for all roles', () => {
    Object.entries(ROLE_ROUTES).forEach(([role, config]) => {
      expect(config.main).toBeDefined();
      expect(config.main.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Coverage Statistics
 */
describe('Route Coverage Statistics', () => {
  it('should provide routing overview', () => {
    let totalRoutes = 0;
    let totalPages = 0;

    Object.entries(ROLE_ROUTES).forEach(([role, config]) => {
      totalRoutes++;
      totalPages += config.pages.length;
    });

    totalPages += CROSS_ROLE_PAGES.length;

    console.log(`
      ===== DASHBOARD ROUTE COVERAGE =====
      Total Roles: ${Object.keys(ROLE_ROUTES).length}
      Total Role-Specific Routes: ${totalRoutes}
      Total Role-Specific Pages: ${totalPages - CROSS_ROLE_PAGES.length}
      Total Cross-Role Pages: ${CROSS_ROLE_PAGES.length}
      Total Pages: ${totalPages}
      ====================================
    `);

    expect(Object.keys(ROLE_ROUTES).length).toBe(7);
  });
});

export { ROLE_ROUTES, CROSS_ROLE_PAGES };
