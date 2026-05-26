'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('ParentNotifications');

interface Notification {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'announcement' | 'alert' | 'message' | 'event';
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  relatedChild?: string;
}

interface NotificationSummary {
  totalNotifications: number;
  unreadCount: number;
  notifications: Notification[];
  categories: Array<{ category: string; count: number }>;
}

interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  categories: {
    quizCompletion: boolean;
    parentUpdates: boolean;
    teacherAlerts: boolean;
    paymentReceipts: boolean;
    milestoneCompletions: boolean;
  };
}

type NotificationPreferencesPatch = Partial<Omit<NotificationPreferences, 'categories'>> & {
  categories?: Partial<NotificationPreferences['categories']>;
};

export default function ParentNotificationsPage() {
  const [notificationData, setNotificationData] = useState<NotificationSummary | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'announcement' | 'alert' | 'message' | 'event'>('all');

  useEffect(() => {
    Promise.all([fetchNotifications(), fetchPreferences()]).finally(() => setLoading(false));
  }, [filterCategory]);

  async function fetchNotifications() {
    try {
      let url = '/api/parent/notifications';
      if (filterCategory !== 'all') {
        url += `?category=${filterCategory}`;
      }
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotificationData(data.data);
    } catch (err) {
      log.error('Failed to load notifications', err);
    }
  }

  async function fetchPreferences() {
    try {
      const response = await fetch('/api/notifications/preferences', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch notification preferences');
      const payload = await response.json();
      if (payload?.success && payload?.data) {
        setPreferences({
          inAppEnabled: Boolean(payload.data.inAppEnabled),
          emailEnabled: Boolean(payload.data.emailEnabled),
          categories: {
            quizCompletion: Boolean(payload.data.categories?.quizCompletion),
            parentUpdates: Boolean(payload.data.categories?.parentUpdates),
            teacherAlerts: Boolean(payload.data.categories?.teacherAlerts),
            paymentReceipts: Boolean(payload.data.categories?.paymentReceipts),
            milestoneCompletions: Boolean(payload.data.categories?.milestoneCompletions),
          },
        });
      }
    } catch (err) {
      log.error('Failed to load notification preferences', err);
    }
  }

  async function updatePreferences(next: NotificationPreferencesPatch) {
    if (!preferences) return;

    const merged: NotificationPreferences = {
      ...preferences,
      ...next,
      categories: {
        ...preferences.categories,
        ...(next.categories || {}),
      },
    };

    try {
      setSavingPreferences(true);
      setPreferences(merged);
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      if (!response.ok) throw new Error('Failed to save notification preferences');
    } catch (err) {
      log.error('Failed to update notification preferences', err);
      await fetchPreferences();
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      const response = await fetch(`/api/parent/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      await fetchNotifications();
    } catch (err) {
      log.error('Failed to mark notification', err);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const response = await fetch('/api/parent/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      await fetchNotifications();
    } catch (err) {
      log.error('Failed to mark all as read', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Notifications" subtitle="School announcements and updates">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading notifications...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!notificationData) {
    return (
      <DashboardLayout title="Notifications" subtitle="School announcements and updates">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">No notifications available.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredNotifications = notificationData.notifications.filter(
    (n) => filterCategory === 'all' || n.category === filterCategory
  );

  return (
    <DashboardLayout title="Notifications" subtitle="Stay updated with school news">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Summary & Action */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Unread Notifications</p>
              <p className="text-4xl font-bold text-blue-600 mt-1">{notificationData.unreadCount}</p>
            </div>
            <button
              onClick={handleMarkAllAsRead}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Mark All as Read
            </button>
          </div>

          {/* Preferences */}
          {preferences && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                {savingPreferences ? (
                  <span className="text-xs text-gray-500">Saving...</span>
                ) : (
                  <span className="text-xs text-gray-500">Saved</span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => updatePreferences({ inAppEnabled: !preferences.inAppEnabled })}
                  className={`px-4 py-2 rounded border text-left ${
                    preferences.inAppEnabled
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  In-App Notifications: {preferences.inAppEnabled ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => updatePreferences({ emailEnabled: !preferences.emailEnabled })}
                  className={`px-4 py-2 rounded border text-left ${
                    preferences.emailEnabled
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  Email Notifications: {preferences.emailEnabled ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() =>
                    updatePreferences({
                      categories: { parentUpdates: !preferences.categories.parentUpdates },
                    })
                  }
                  className={`px-4 py-2 rounded border text-left ${
                    preferences.categories.parentUpdates
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  Parent Updates: {preferences.categories.parentUpdates ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() =>
                    updatePreferences({
                      categories: { milestoneCompletions: !preferences.categories.milestoneCompletions },
                    })
                  }
                  className={`px-4 py-2 rounded border text-left ${
                    preferences.categories.milestoneCompletions
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  Milestone Updates: {preferences.categories.milestoneCompletions ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex gap-2">
            {(['all', 'announcement', 'alert', 'message', 'event'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)} (
                {notificationData.categories.find((c) => c.category === cat)?.count || 0})
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const priorityColors: any = {
                high: 'border-red-300 bg-red-50',
                medium: 'border-yellow-300 bg-yellow-50',
                low: 'border-green-300 bg-green-50',
              };
              const categoryEmojis: any = {
                announcement: '📢',
                alert: '⚠️',
                message: '💬',
                event: '📅',
              };
              return (
                <div
                  key={notif.id}
                  className={`p-6 rounded-lg border cursor-pointer transition ${priorityColors[notif.priority]} ${
                    !notif.read ? 'ring-2 ring-blue-400' : ''
                  }`}
                  onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{categoryEmojis[notif.category]}</span>
                        <p className="font-bold text-gray-900 text-lg">{notif.title}</p>
                        {!notif.read && <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold">NEW</span>}
                      </div>
                      <p className="text-gray-700 mt-2">{notif.content}</p>
                      <p className="text-xs text-gray-500 mt-3">{new Date(notif.date).toLocaleString()}</p>
                      {notif.relatedChild && <p className="text-xs text-gray-600 mt-1">Child: {notif.relatedChild}</p>}
                    </div>
                    <div className="ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        notif.priority === 'high'
                          ? 'bg-red-300 text-red-800'
                          : notif.priority === 'medium'
                          ? 'bg-yellow-300 text-yellow-800'
                          : 'bg-green-300 text-green-800'
                      }`}>
                        {notif.priority}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
