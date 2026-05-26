/**
 * Admin Monitoring Control Panel
 * SaaS admin controls which schools have monitoring feature
 * School admin configures monitoring settings
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface School {
  id: string;
  name: string;
  subscriptionTier: string;
  monitoringFeatureEnabled: boolean;
  monitoringSettings: {
    enableFaceDetection: boolean;
    enableTabSwitchDetection: boolean;
    enableMouseTracking: boolean;
    focusPauseDelay: number;
    alertSoundEnabled: boolean;
    pauseClassOnAlert: boolean;
    notifyOnAlert: boolean;
    logRetentionDays: number;
  };
}

export default function MonitoringControlPanel() {
  const { data: session } = useSession();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchSchools();
    }
  }, [session]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/schools');
      const data = await response.json();
      setSchools(data);
    } catch (error) {
      setMessage('Failed to fetch schools');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchool = async (school: School) => {
    setSelectedSchool(school);
    setSettings(school.monitoringSettings);
  };

  const toggleMonitoringFeature = async (schoolId: string, enabled: boolean) => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring-feature', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          enabled,
        }),
      });

      if (!response.ok) throw new Error('Failed to update feature');

      const data = await response.json();
      setMessage(`Monitoring feature ${enabled ? 'enabled' : 'disabled'} for ${data.school.name}`);
      fetchSchools();
      setSelectedSchool(data.school);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedSchool) return;

    try {
      setLoading(true);
      const response = await fetch('/api/monitoring-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          settings,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const data = await response.json();
      setMessage('Settings saved successfully!');
      setSelectedSchool(data.school);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (session?.user?.role !== 'admin') {
    return <div className="p-4 text-red-600">Access denied. Admin only.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Student Monitoring Control Panel</h1>

      {message && (
        <div className={`p-4 mb-4 rounded ${message.includes('successfully') ? 'bg-green-100' : 'bg-red-100'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schools List */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Schools</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {schools.map((school) => (
              <div
                key={school.id}
                onClick={() => handleSelectSchool(school)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedSchool?.id === school.id
                    ? 'bg-blue-100 border-blue-500'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{school.name}</div>
                <div className="text-sm text-gray-600">Tier: {school.subscriptionTier}</div>
                <div className="text-sm mt-1">
                  <span className={school.monitoringFeatureEnabled ? 'text-green-600' : 'text-red-600'}>
                    {school.monitoringFeatureEnabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Control */}
        {selectedSchool && (
          <div className="lg:col-span-2 space-y-6">
            {/* Feature Toggle */}
            <div className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Feature Access</h2>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-600">School: {selectedSchool.name}</div>
                <div className="text-sm font-medium text-gray-600">Subscription: {selectedSchool.subscriptionTier}</div>
              </div>

              <div className="bg-gray-50 p-4 rounded mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSchool.monitoringFeatureEnabled}
                    onChange={(e) => toggleMonitoringFeature(selectedSchool.id, e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 mr-2"
                  />
                  <span className="font-medium">Enable Monitoring Feature</span>
                </label>
                <p className="text-xs text-gray-600 mt-2">
                  Only available for Premium and Enterprise subscribers
                </p>
              </div>
            </div>

            {/* Settings Configuration */}
            {selectedSchool.monitoringFeatureEnabled && settings && (
              <div className="border rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">Configuration Settings</h2>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enableFaceDetection}
                      onChange={(e) =>
                        setSettings({ ...settings, enableFaceDetection: e.target.checked })
                      }
                      className="w-4 h-4 mr-2"
                    />
                    <span>Enable Face Detection</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enableTabSwitchDetection}
                      onChange={(e) =>
                        setSettings({ ...settings, enableTabSwitchDetection: e.target.checked })
                      }
                      className="w-4 h-4 mr-2"
                    />
                    <span>Enable Tab Switch Detection</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enableMouseTracking}
                      onChange={(e) =>
                        setSettings({ ...settings, enableMouseTracking: e.target.checked })
                      }
                      className="w-4 h-4 mr-2"
                    />
                    <span>Enable Mouse Tracking</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.alertSoundEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, alertSoundEnabled: e.target.checked })
                      }
                      className="w-4 h-4 mr-2"
                    />
                    <span>Enable Alert Sound</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.pauseClassOnAlert}
                      onChange={(e) =>
                        setSettings({ ...settings, pauseClassOnAlert: e.target.checked })
                      }
                      className="w-4 h-4 mr-2"
                    />
                    <span>Pause Class on Alert</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifyOnAlert}
                      onChange={(e) =>
                        setSettings({ ...settings, notifyOnAlert: e.target.checked })
                      }
                      className="w-4 h-4 mr-2"
                    />
                    <span>Notify Admin on Alert</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium mb-1">Focus Pause Delay (ms)</label>
                    <input
                      type="number"
                      value={settings.focusPauseDelay}
                      onChange={(e) =>
                        setSettings({ ...settings, focusPauseDelay: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Log Retention (days)</label>
                    <input
                      type="number"
                      value={settings.logRetentionDays}
                      onChange={(e) =>
                        setSettings({ ...settings, logRetentionDays: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={loading}
                  className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
