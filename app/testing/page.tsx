'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Clock, PlayCircle, RotateCcw } from 'lucide-react';

interface TestResult {
  role: string;
  status: string;
  userEmail?: string;
  userRole?: string;
  firstName?: string;
  lastName?: string;
  schoolId?: string;
  token?: string;
  error?: string;
  roleMatch?: boolean;
}

interface DemoUser {
  role: string;
  email: string;
  password: string;
  expectedRole: string;
}

const DEMO_USERS: Record<string, DemoUser> = {
  'SAAS Admin': {
    role: 'SAAS Admin',
    email: 'saasadmin@learnai.study',
    password: 'Demo@12345',
    expectedRole: 'saas_admin',
  },
  'Principal': {
    role: 'Principal (School Admin)',
    email: 'principal@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'principal',
  },
  'Teacher': {
    role: 'Teacher',
    email: 'teacher@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'teacher',
  },
  'Student': {
    role: 'Student',
    email: 'student@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'student',
  },
  'Parent': {
    role: 'Parent',
    email: 'parent@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'parent',
  },
  'Supervisor': {
    role: 'Supervisor',
    email: 'supervisor@demo.learnai.study',
    password: 'Demo@12345',
    expectedRole: 'supervisor',
  },
};

export default function TestingDashboard() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const testRoleLogin = useCallback(async (role: string, credentials: DemoUser): Promise<TestResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const actualRole = data.user?.role;
        const roleMatch = actualRole === credentials.expectedRole;

        return {
          role,
          status: '✅ SUCCESS',
          userEmail: data.user?.email,
          userRole: actualRole,
          token: data.token?.substring(0, 50) + '...',
          firstName: data.user?.firstName,
          lastName: data.user?.lastName,
          schoolId: data.user?.schoolId,
          roleMatch,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          role,
          status: `❌ HTTP ${response.status}`,
          error: errorData.error || 'Login failed',
        };
      }
    } catch (err) {
      return {
        role,
        status: '❌ ERROR',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }, []);

  const runAllTests = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const testResults: TestResult[] = [];

    for (const [key, user] of Object.entries(DEMO_USERS)) {
      const result = await testRoleLogin(key, user);
      testResults.push(result);
      setResults([...testResults]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setLoading(false);
  }, [testRoleLogin]);

  const resetTests = useCallback(() => {
    setResults([]);
    setExpandedRole(null);
  }, []);

  const successCount = results.filter((r) => r.status === '✅ SUCCESS').length;
  const failureCount = results.filter((r) => r.status.includes('❌')).length;
  const totalTests = Object.keys(DEMO_USERS).length;

  const getStatusIcon = (status: string) => {
    if (status === '✅ SUCCESS') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status.includes('❌')) return <AlertCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
  };

  const getStatusColor = (status: string) => {
    if (status === '✅ SUCCESS') return 'bg-green-50 border-green-200';
    if (status.includes('❌')) return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const getProgressPercentage = () => {
    if (results.length === 0) return 0;
    return Math.round(((successCount + failureCount) / totalTests) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧪 LearnAI Authentication Testing Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Test login and authentication for all user roles
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={runAllTests}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            <PlayCircle className="w-5 h-5" />
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </button>
          <button
            onClick={resetTests}
            disabled={loading || results.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>

        {/* Summary Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="text-gray-600 text-sm font-medium mb-2">Total Tests</div>
              <div className="text-3xl font-bold text-gray-900">{totalTests}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border border-green-200 shadow-sm">
              <div className="text-green-700 text-sm font-medium mb-2">✅ Passed</div>
              <div className="text-3xl font-bold text-green-600">{successCount}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-6 border border-red-200 shadow-sm">
              <div className="text-red-700 text-sm font-medium mb-2">❌ Failed</div>
              <div className="text-3xl font-bold text-red-600">{failureCount}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 shadow-sm">
              <div className="text-blue-700 text-sm font-medium mb-2">Progress</div>
              <div className="text-3xl font-bold text-blue-600">{getProgressPercentage()}%</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {results.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-gray-700">Overall Progress</h2>
              <span className="text-sm text-gray-600">
                {successCount + failureCount} / {totalTests}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Test Results */}
        <div className="space-y-4">
          {results.length === 0 && !loading && (
            <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Test</h2>
              <p className="text-gray-600 mb-6">
                Click "Run All Tests" to authenticate all user roles and view their dashboards
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                <p className="text-sm text-blue-800">
                  <strong>6 user roles</strong> will be tested: SAAS Admin, Principal, Teacher,
                  Student, Parent, and Supervisor
                </p>
              </div>
            </div>
          )}

          {results.map((result) => (
            <div
              key={result.role}
              className={`rounded-lg border-2 transition ${getStatusColor(result.status)}`}
            >
              <button
                onClick={() =>
                  setExpandedRole(expandedRole === result.role ? null : result.role)
                }
                className="w-full p-6 flex items-center justify-between hover:bg-opacity-50 transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  {getStatusIcon(result.status)}
                  <div className="text-left">
                    <h3 className="font-semibold text-lg text-gray-900">{result.role}</h3>
                    <p className="text-sm text-gray-600">{result.status}</p>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg
                    className={`w-6 h-6 transition-transform ${
                      expandedRole === result.role ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              </button>

              {expandedRole === result.role && (
                <div className="border-t-2 border-inherit p-6 space-y-4 bg-opacity-30 bg-white">
                  {result.status === '✅ SUCCESS' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Email
                          </div>
                          <p className="text-sm font-mono bg-white p-3 rounded border border-gray-200">
                            {result.userEmail}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Name
                          </div>
                          <p className="text-sm font-mono bg-white p-3 rounded border border-gray-200">
                            {result.firstName} {result.lastName}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Role
                          </div>
                          <p className="text-sm font-mono bg-white p-3 rounded border border-gray-200">
                            {result.userRole} {result.roleMatch && '✅'}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            School
                          </div>
                          <p className="text-sm font-mono bg-white p-3 rounded border border-gray-200 break-all">
                            {result.schoolId || 'Global (SAAS)'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          JWT Token
                        </div>
                        <p className="text-sm font-mono bg-white p-3 rounded border border-gray-200 break-all">
                          {result.token}
                        </p>
                      </div>

                      <div className="bg-green-100 border border-green-300 rounded-lg p-4 mt-4">
                        <p className="text-sm text-green-800">
                          ✅ <strong>Login successful!</strong> User authenticated and token
                          generated.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          Error
                        </div>
                        <p className="text-sm font-mono bg-white p-3 rounded border border-red-200 text-red-700">
                          {result.error}
                        </p>
                      </div>
                      <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                        <p className="text-sm text-red-800">
                          ❌ <strong>Login failed.</strong> Check credentials and server status.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Test Info */}
        <div className="mt-12 bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Test Information</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Tested Endpoint</h3>
              <p className="text-sm font-mono bg-gray-50 p-3 rounded">POST /api/auth/login</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">User Roles (6)</h3>
              <ul className="text-sm space-y-1">
                <li>• 🏢 SAAS Admin (Platform Administrator)</li>
                <li>• 🏫 Principal (School Administrator)</li>
                <li>• 👨‍🏫 Teacher</li>
                <li>• 👨‍🎓 Student</li>
                <li>• 👨‍👩‍👦 Parent</li>
                <li>• 👩‍🔬 Supervisor (Academic Supervisor)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Password</h3>
              <p className="text-sm font-mono bg-gray-50 p-3 rounded">Demo@12345 (all roles)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
