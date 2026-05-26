'use client';

import React from 'react';
import { SidebarNavigation } from './sidebar-navigation';
import { DashboardHeader } from './dashboard-header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showSidebar?: boolean;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  showSidebar = true,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {showSidebar && (
        <div className="hidden lg:block sticky top-0 h-screen overflow-y-auto">
          <SidebarNavigation />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {title && (
          <DashboardHeader title={title} subtitle={subtitle} />
        )}

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
