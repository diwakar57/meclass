'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

interface RoleNavigation {
  [role: string]: NavItem[];
}

const roleNavigation: RoleNavigation = {
  admin: [
    {
      label: 'Dashboard',
      href: '/dashboard/admin',
      icon: '📊',
    },
    {
      label: 'Schools',
      href: '/dashboard/admin/schools',
      icon: '🏫',
      children: [
        { label: 'All Schools', href: '/dashboard/admin/schools', icon: '📋' },
        { label: 'Approvals Pending', href: '/dashboard/admin/schools?filter=pending', icon: '⏳' },
        { label: 'Billing Status', href: '/dashboard/admin/schools/billing', icon: '💰' },
      ],
    },
    {
      label: 'Analytics',
      href: '/dashboard/admin/analytics',
      icon: '📈',
      children: [
        { label: 'Platform Metrics', href: '/dashboard/admin/analytics', icon: '📊' },
        { label: 'Revenue Report', href: '/dashboard/admin/analytics/revenue', icon: '💵' },
        { label: 'User Growth', href: '/dashboard/admin/analytics/growth', icon: '📈' },
      ],
    },
    {
      label: 'Users',
      href: '/dashboard/admin/users',
      icon: '👥',
      children: [
        { label: 'All Users', href: '/dashboard/admin/users', icon: '👤' },
        { label: 'Suspended Accounts', href: '/dashboard/admin/users?status=suspended', icon: '🚫' },
      ],
    },
    {
      label: 'Settings',
      href: '/dashboard/admin/settings',
      icon: '⚙️',
    },
  ],
  principal: [
    {
      label: 'Dashboard',
      href: '/dashboard/principal',
      icon: '📊',
    },
    {
      label: 'School Pattern + AI',
      href: '/dashboard/principal/school-pattern',
      icon: '🧠',
    },
    {
      label: 'Schools',
      href: '/dashboard/principal/schools',
      icon: '🏫',
    },
    {
      label: 'Staff Management',
      href: '/dashboard/principal/staff',
      icon: '👨‍🏫',
      children: [
        { label: 'All Staff', href: '/dashboard/principal/staff', icon: '📋' },
        { label: 'Teachers', href: '/dashboard/principal/staff?role=teacher', icon: '👨‍🏫' },
        { label: 'Administrators', href: '/dashboard/principal/staff?role=admin', icon: '🔐' },
      ],
    },
    {
      label: 'Academics',
      href: '/dashboard/principal/academics',
      icon: '📚',
      children: [
        { label: 'Classes', href: '/dashboard/principal/academics/classes', icon: '🎓' },
        { label: 'Syllabus', href: '/dashboard/principal/academics/syllabus', icon: '📖' },
        { label: 'Grade Reports', href: '/dashboard/principal/academics/grades', icon: '📊' },
        { label: 'Attendance', href: '/dashboard/principal/academics/attendance', icon: '📍' },
      ],
    },
    {
      label: 'Billing & Finance',
      href: '/dashboard/principal/billing',
      icon: '💰',
      children: [
        { label: 'Subscription', href: '/dashboard/principal/billing', icon: '📋' },
        { label: 'Fee Structure', href: '/dashboard/principal/fees', icon: '💸' },
        { label: 'Payments', href: '/dashboard/principal/payments', icon: '💳' },
        { label: 'Invoices', href: '/dashboard/principal/invoices', icon: '🧾' },
      ],
    },
    {
      label: 'Announcements',
      href: '/dashboard/principal/announcements',
      icon: '📢',
    },
    {
      label: 'Settings',
      href: '/dashboard/principal/settings',
      icon: '⚙️',
    },
  ],
  teacher: [
    {
      label: 'Dashboard',
      href: '/dashboard/teacher',
      icon: '📊',
    },
    {
      label: 'Classes',
      href: '/dashboard/teacher/classes',
      icon: '🎓',
      children: [
        { label: 'All Classes', href: '/dashboard/teacher/classes', icon: '📋' },
        { label: 'Create Class', href: '/dashboard/teacher/classes', icon: '➕' },
      ],
    },
    {
      label: 'Course Management',
      href: '/dashboard/teacher/courses',
      icon: '📚',
      children: [
        { label: 'All Courses', href: '/dashboard/teacher/courses', icon: '📋' },
        { label: 'Create Course', href: '/dashboard/teacher/courses/new', icon: '➕' },
        { label: 'Syllabus', href: '/dashboard/teacher/syllabus', icon: '📖' },
      ],
    },
    {
      label: 'Assignments',
      href: '/dashboard/teacher/assignments',
      icon: '📝',
      children: [
        { label: 'All Assignments', href: '/dashboard/teacher/assignments', icon: '📋' },
        { label: 'Create Assignment', href: '/dashboard/teacher/assignments/new', icon: '➕' },
        { label: 'Grading Queue', href: '/dashboard/teacher/assignments/grading', icon: '✅' },
      ],
    },
    {
      label: 'Quizzes',
      href: '/dashboard/teacher/quizzes',
      icon: '❓',
      children: [
        { label: 'All Quizzes', href: '/dashboard/teacher/quizzes', icon: '📋' },
        { label: 'Generate Quiz', href: '/dashboard/teacher/quizzes/generate', icon: '✨' },
        { label: 'Results', href: '/dashboard/teacher/quizzes/results', icon: '📊' },
      ],
    },
    {
      label: 'Gradebook',
      href: '/dashboard/teacher/grades',
      icon: '📊',
    },
    {
      label: 'Students',
      href: '/dashboard/teacher/students',
      icon: '👥',
      children: [
        { label: 'Class Roster', href: '/dashboard/teacher/students', icon: '📋' },
        { label: 'Individual Progress', href: '/dashboard/teacher/students/progress', icon: '📈' },
      ],
    },
    {
      label: 'Announcements',
      href: '/dashboard/teacher/announcements',
      icon: '📢',
    },
    {
      label: 'Settings',
      href: '/dashboard/teacher/settings',
      icon: '⚙️',
    },
  ],
  student: [
    {
      label: 'Dashboard',
      href: '/dashboard/student',
      icon: '📊',
    },
    {
      label: 'My Learning',
      href: '/dashboard/student/progress',
      icon: '📈',
      children: [
        { label: 'Progress', href: '/dashboard/student/progress', icon: '📊' },
        { label: 'Learning Path', href: '/dashboard/student/learning-path', icon: '🗺️' },
        { label: 'Topics', href: '/dashboard/student/topics', icon: '📚' },
        { label: 'Learning DNA', href: '/dashboard/student/learning-dna', icon: '🧬' },
      ],
    },
    {
      label: 'Schools & Classes',
      href: '/dashboard/student/schools',
      icon: '🏫',
      children: [
        { label: 'Enrolled Schools', href: '/dashboard/student/schools', icon: '✅' },
        { label: 'Find Schools', href: '/dashboard/student/schools?tab=discover', icon: '🔍' },
      ],
    },
    {
      label: 'Courses',
      href: '/dashboard/student/courses',
      icon: '🎓',
    },
    {
      label: 'Assessments',
      href: '/dashboard/student/tests',
      icon: '❓',
      children: [
        { label: 'All Tests', href: '/dashboard/student/tests', icon: '📋' },
        { label: 'Test History', href: '/dashboard/student/tests/history', icon: '📜' },
      ],
    },
    {
      label: 'Assignments',
      href: '/dashboard/student/assignments',
      icon: '📝',
      children: [
        { label: 'Course Work', href: '/dashboard/student/assignments', icon: '📝' },
        { label: 'Grade Sheet', href: '/dashboard/student/grades', icon: '📄' },
      ],
    },
    {
      label: 'Profile',
      href: '/dashboard/student/profile',
      icon: '👤',
      children: [
        { label: 'My Profile', href: '/dashboard/student/profile', icon: '👤' },
        { label: 'Settings', href: '/dashboard/student/settings', icon: '⚙️' },
      ],
    },
  ],
  parent: [
    {
      label: 'Dashboard',
      href: '/dashboard/parent',
      icon: '📊',
    },
    {
      label: 'Child Progress',
      href: '/dashboard/parent/child-progress',
      icon: '📈',
      children: [
        { label: 'Overview', href: '/dashboard/parent/child-progress', icon: '📊' },
        { label: 'Detailed Report', href: '/dashboard/parent/child-progress/reports', icon: '📄' },
      ],
    },
    {
      label: 'Grades & Assignments',
      href: '/dashboard/parent/grades',
      icon: '📝',
      children: [
        { label: 'Grades', href: '/dashboard/parent/grades', icon: '📊' },
        { label: 'Assignments', href: '/dashboard/parent/assignments', icon: '📝' },
      ],
    },
    {
      label: 'Attendance',
      href: '/dashboard/parent/attendance',
      icon: '📍',
    },
    {
      label: 'Payments',
      href: '/dashboard/parent/payments',
      icon: '💰',
      children: [
        { label: 'Fee Status', href: '/dashboard/parent/payments', icon: '📊' },
        { label: 'Payment History', href: '/dashboard/parent/payments/history', icon: '📜' },
      ],
    },
    {
      label: 'Messages',
      href: '/dashboard/parent/messages',
      icon: '💬',
    },
    {
      label: 'Announcements',
      href: '/dashboard/parent/announcements',
      icon: '📢',
    },
  ],
  supervisor: [
    {
      label: 'Dashboard',
      href: '/dashboard/supervisor',
      icon: '📊',
    },
    {
      label: 'Schools',
      href: '/dashboard/supervisor/schools',
      icon: '🏫',
    },
    {
      label: 'Analytics',
      href: '/dashboard/supervisor/analytics',
      icon: '📈',
      children: [
        { label: 'Platform Overview', href: '/dashboard/supervisor/analytics', icon: '📊' },
        { label: 'Performance Metrics', href: '/dashboard/supervisor/analytics/performance', icon: '📈' },
        { label: 'User Engagement', href: '/dashboard/supervisor/analytics/engagement', icon: '🔥' },
      ],
    },
    {
      label: 'At-Risk Tracking',
      href: '/dashboard/supervisor/at-risk',
      icon: '⚠️',
    },
    {
      label: 'Reports',
      href: '/dashboard/supervisor/reports',
      icon: '📄',
    },
  ],
  accountant: [
    {
      label: 'Dashboard',
      href: '/dashboard/accountant',
      icon: '💰',
    },
    {
      label: 'Billing',
      href: '/dashboard/accountant/billing',
      icon: '📋',
      children: [
        { label: 'Overview', href: '/dashboard/accountant/billing', icon: '💰' },
        { label: 'Invoices', href: '/dashboard/accountant/billing/invoices', icon: '🧾' },
        { label: 'Payments Received', href: '/dashboard/accountant/billing/payments', icon: '✅' },
      ],
    },
    {
      label: 'Fee Management',
      href: '/dashboard/accountant/fees',
      icon: '💸',
    },
    {
      label: 'Reports',
      href: '/dashboard/accountant/reports',
      icon: '📊',
      children: [
        { label: 'Financial Report', href: '/dashboard/accountant/reports/financial', icon: '📊' },
        { label: 'Collection Report', href: '/dashboard/accountant/reports/collection', icon: '📈' },
      ],
    },
  ],
};

interface SidebarNavigationProps {
  collapsed?: boolean;
}

export function SidebarNavigation({ collapsed = false }: SidebarNavigationProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  if (!user?.role) return null;

  const roleKey =
    user.role === 'saas_admin'
      ? 'admin'
      : user.role === 'school_admin'
        ? 'principal'
        : user.role;

  const navItems = roleNavigation[roleKey] || [];

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className={`bg-white border-r border-gray-200 transition-all ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="space-y-1 p-4">
        {navItems.map((item) => (
          <div key={item.href}>
            <div className="flex items-center justify-between">
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>

              {item.children && !collapsed && (
                <button
                  onClick={() => toggleExpanded(item.label)}
                  className="px-2 py-1 rounded hover:bg-gray-100"
                >
                  <span className={`transition ${expandedItems.includes(item.label) ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </button>
              )}
            </div>

            {/* Submenu */}
            {item.children && expandedItems.includes(item.label) && !collapsed && (
              <div className="ml-6 border-l border-gray-200 pl-2 space-y-1 mt-1">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm transition ${
                      isActive(child.href)
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{child.icon}</span>
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
