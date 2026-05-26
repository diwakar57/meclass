'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminSettings');

interface Settings {
  system: {
    schoolName: string;
    schoolLogo?: string;
    timezone: string;
    language: string;
    academicYear: string;
  };
  security: {
    passwordMinLength: number;
    sessionTimeout: number;
    twoFactorEnabled: boolean;
    ipWhitelistEnabled: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    notificationFrequency: string;
  };
  features: {
    gradesEnabled: boolean;
    attendanceEnabled: boolean;
    assignmentsEnabled: boolean;
    communicationEnabled: boolean;
    portfolioEnabled: boolean;
  };
  integrations: {
    googleClassroom: boolean;
    microsoft365: boolean;
    googleMeet: boolean;
    zoom: boolean;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/admin/settings', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      log.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    if (!settings) return;
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      log.error('Failed to save settings', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="Manage platform configuration">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">Loading settings...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!settings) {
    return (
      <DashboardLayout title="Settings" subtitle="Manage platform configuration">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Unable to load settings.</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Platform Settings" subtitle="Configure system-wide preferences">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* Save Notification */}
          {saved && (
            <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-lg">
              ✅ Settings saved successfully!
            </div>
          )}

          {/* System Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">System Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input
                  type="text"
                  value={settings.system.schoolName}
                  onChange={(e) => setSettings({ ...settings, system: { ...settings.system, schoolName: e.target.value } })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select
                    value={settings.system.timezone}
                    onChange={(e) => setSettings({ ...settings, system: { ...settings.system, timezone: e.target.value } })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option>UTC</option>
                    <option>EST</option>
                    <option>CST</option>
                    <option>MST</option>
                    <option>PST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={settings.system.language}
                    onChange={(e) => setSettings({ ...settings, system: { ...settings.system, language: e.target.value } })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={settings.system.academicYear}
                  onChange={(e) => setSettings({ ...settings, system: { ...settings.system, academicYear: e.target.value } })}
                  placeholder="e.g., 2025-2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-gray-700 font-medium">Two-Factor Authentication</label>
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, twoFactorEnabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-700 font-medium">IP Whitelist</label>
                <input
                  type="checkbox"
                  checked={settings.security.ipWhitelistEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, ipWhitelistEnabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Password Length</label>
                  <input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, passwordMinLength: parseInt(e.target.value) },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (min)</label>
                  <input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, sessionTimeout: parseInt(e.target.value) },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Feature Toggles</h3>
            <div className="space-y-3">
              {Object.entries(settings.features).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <label className="text-gray-700 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        features: { ...settings.features, [key]: e.target.checked },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Integrations</h3>
            <div className="space-y-3">
              {Object.entries(settings.integrations).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <label className="text-gray-700 font-medium">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, [key]: e.target.checked },
                      })
                    }
                    className="w-5 h-5"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveSettings}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
            >
              Save Settings
            </button>
            <button
              onClick={fetchSettings}
              className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
