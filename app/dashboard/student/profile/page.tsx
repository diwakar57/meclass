'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DashboardLogoutButton } from '@/components/dashboard/logout-button';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/lib/contexts/AuthContext';

const log = createLogger('StudentProfile');

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevelId?: string;
  interests: string[];
  learningStyle?: string;
  avatar?: string;
  twoFAEnabled: boolean;
}

interface ProfileApiResponse {
  success: boolean;
  data?: StudentProfile;
  error?: string;
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentProfile>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFAToken: '',
  });
  const [passwordRequires2FA, setPasswordRequires2FA] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState<'totp' | 'sms' | 'email'>('totp');
  const [twoFAPhone, setTwoFAPhone] = useState('');
  const [twoFAStep, setTwoFAStep] = useState<'setup' | 'verify'>('setup');
  const [twoFAQrCode, setTwoFAQrCode] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState<string | null>(null);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setSaveError(null);
      const response = await fetch('/api/students/profile', { credentials: 'include' });
      const data = (await response.json()) as ProfileApiResponse;

      if (!response.ok || !data.data) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      setProfile(data.data);
      setFormData(data.data);
    } catch (err) {
      log.error('Failed to load profile', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaveError(null);
    setSaveSuccess(null);
    setSavingProfile(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gradeLevelId: formData.gradeLevelId,
        learningStyle: formData.learningStyle,
        interests: formData.interests,
      };

      const response = await fetch('/api/students/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as ProfileApiResponse;
      if (!response.ok || !data.data) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfile(data.data);
      setFormData(data.data);
      setEditing(false);
      setSaveSuccess('Profile updated successfully.');
    } catch (err) {
      log.error('Failed to save profile', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password must match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/user/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
          ...(passwordRequires2FA && passwordForm.twoFAToken
            ? { twoFAToken: passwordForm.twoFAToken }
            : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'REQUIRE_2FA') {
          setPasswordRequires2FA(true);
          setPasswordError('Two-factor authentication code is required.');
          return;
        }
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordMessage('Password changed successfully.');
      setPasswordRequires2FA(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFAToken: '',
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handle2FASetup() {
    setTwoFAError(null);
    setTwoFAMessage(null);
    setTwoFALoading(true);

    try {
      const response = await fetch('/api/user/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          method: twoFAMethod,
          ...(twoFAMethod === 'sms' ? { phoneNumber: twoFAPhone } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup 2FA');
      }

      setTwoFAQrCode(data.qrCode || '');
      setTwoFASecret(data.secret || '');
      setTwoFAStep('verify');
      setTwoFAMessage('2FA setup initiated. Enter the verification code to enable it.');
    } catch (err) {
      setTwoFAError(err instanceof Error ? err.message : 'Failed to setup 2FA');
    } finally {
      setTwoFALoading(false);
    }
  }

  async function handle2FAVerify() {
    setTwoFAError(null);
    setTwoFAMessage(null);
    setTwoFALoading(true);

    try {
      const response = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: twoFACode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify 2FA code');
      }

      setProfile((prev) => (prev ? { ...prev, twoFAEnabled: true } : prev));
      setTwoFAMessage('Two-factor authentication enabled successfully.');
      setTwoFACode('');
      setTwoFAStep('setup');
      setTwoFAOpen(false);
    } catch (err) {
      setTwoFAError(err instanceof Error ? err.message : 'Failed to verify 2FA');
    } finally {
      setTwoFALoading(false);
    }
  }

  async function handleDisable2FA() {
    setTwoFAError(null);
    setTwoFAMessage(null);
    setTwoFALoading(true);

    try {
      const response = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: disable2FAPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      setProfile((prev) => (prev ? { ...prev, twoFAEnabled: false } : prev));
      setDisable2FAPassword('');
      setTwoFAMessage('Two-factor authentication disabled successfully.');
    } catch (err) {
      setTwoFAError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setTwoFALoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="My Profile" subtitle="Manage your account and learning preferences">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 text-center shadow">
            Loading profile...
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout title="My Profile" subtitle="Manage your account and learning preferences">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-700">Unable to load profile data.</p>
            <button
              type="button"
              onClick={() => fetchProfile()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  const initials = fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your account and learning preferences">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">

          {(saveError || saveSuccess) && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                saveError
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-green-200 bg-green-50 text-green-700'
              }`}
            >
              {saveError || saveSuccess}
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.firstName}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                    {initials}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{fullName || 'Student User'}</h2>
                  <p className="text-gray-600">{profile.email}</p>
                </div>
              </div>
              <DashboardLogoutButton />
            </div>

            {editing ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grade Level</label>
                    <input
                      type="text"
                      placeholder="e.g., 10th Grade"
                      value={formData.gradeLevelId || ''}
                      onChange={(e) => setFormData({...formData, gradeLevelId: e.target.value})}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Learning Style</label>
                    <select
                      value={formData.learningStyle || ''}
                      onChange={(e) => setFormData({...formData, learningStyle: e.target.value})}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select...</option>
                      <option value="visual">Visual</option>
                      <option value="auditory">Auditory</option>
                      <option value="kinesthetic">Kinesthetic</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Interests</label>
                  <input
                    type="text"
                    placeholder="Comma-separated interests (e.g., Math, Science, Art)"
                    value={formData.interests?.join(', ') || ''}
                    onChange={(e) => setFormData({...formData, interests: e.target.value.split(',').map(i => i.trim())})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaveError(null);
                      setSaveSuccess(null);
                      setEditing(false);
                      setFormData(profile);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600">Grade Level</h4>
                    <p className="text-gray-900">{profile.gradeLevelId || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600">Learning Style</h4>
                    <p className="text-gray-900">{profile.learningStyle || 'Not specified'}</p>
                  </div>
                </div>

                {profile.interests && profile.interests.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600">Interests</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.interests.map((interest) => (
                        <span key={interest} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setEditing(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-lg font-bold mb-6">Security & Account</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Change Password</h4>
                  <p className="text-sm text-gray-600">Update your password regularly</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordOpen((prev) => !prev);
                    setPasswordError(null);
                    setPasswordMessage(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {passwordOpen ? 'Close' : 'Change'}
                </button>
              </div>
              {passwordOpen && (
                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>

                  {passwordRequires2FA && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Two-Factor Code</label>
                      <input
                        type="text"
                        value={passwordForm.twoFAToken}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, twoFAToken: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="Enter your 2FA code"
                      />
                    </div>
                  )}

                  {passwordError && (
                    <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{passwordError}</p>
                  )}
                  {passwordMessage && (
                    <p className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">{passwordMessage}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={passwordLoading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              )}

              <div className="border-t pt-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600">Add an extra layer of security</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFAOpen((prev) => !prev);
                    setTwoFAError(null);
                    setTwoFAMessage(null);
                    setTwoFAStep('setup');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {twoFAOpen ? 'Close' : profile.twoFAEnabled ? 'Manage' : 'Enable'}
                </button>
              </div>

              <div className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
                Status: <span className="font-semibold">{profile.twoFAEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>

              {twoFAOpen && (
                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  {twoFAStep === 'setup' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                        <select
                          value={twoFAMethod}
                          onChange={(e) => setTwoFAMethod(e.target.value as 'totp' | 'sms' | 'email')}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="totp">Authenticator App (TOTP)</option>
                          <option value="sms">SMS</option>
                          <option value="email">Email</option>
                        </select>
                      </div>

                      {twoFAMethod === 'sms' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={twoFAPhone}
                            onChange={(e) => setTwoFAPhone(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            placeholder="+1 555 123 4567"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handle2FASetup}
                        disabled={twoFALoading}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {twoFALoading ? 'Starting setup...' : 'Start 2FA Setup'}
                      </button>
                    </>
                  ) : (
                    <>
                      {twoFAQrCode && (
                        <div className="rounded border border-gray-200 bg-white p-3 text-xs text-gray-700 break-all">
                          QR Provisioning URI: {twoFAQrCode}
                        </div>
                      )}

                      {twoFASecret && (
                        <div className="rounded border border-gray-200 bg-white p-3 text-xs text-gray-700 break-all">
                          Manual Secret: {twoFASecret}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                        <input
                          type="text"
                          value={twoFACode}
                          onChange={(e) => setTwoFACode(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          placeholder="Enter verification code"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handle2FAVerify}
                        disabled={twoFALoading}
                        className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {twoFALoading ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                    </>
                  )}

                  <div className="border-t pt-3">
                    <p className="mb-2 text-sm font-medium text-gray-700">Disable 2FA</p>
                    <div className="flex flex-col gap-3 md:flex-row">
                      <input
                        type="password"
                        value={disable2FAPassword}
                        onChange={(e) => setDisable2FAPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="Enter password to disable"
                      />
                      <button
                        type="button"
                        onClick={handleDisable2FA}
                        disabled={twoFALoading}
                        className="rounded-lg border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  </div>

                  {twoFAError && (
                    <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{twoFAError}</p>
                  )}
                  {twoFAMessage && (
                    <p className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">{twoFAMessage}</p>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium">Quick Logout</h4>
                <p className="text-sm text-gray-600 mb-3">Use this button to sign out from your profile page directly.</p>
                <DashboardLogoutButton />
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
