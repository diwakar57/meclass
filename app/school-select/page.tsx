'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function SchoolSelectPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const fetchSchools = async () => {
      try {
        const response = await fetch('/api/schools/list', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to load schools');

        const data = await response.json();
        setSchools(data.schools);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schools');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, [token, router]);

  const handleSelectSchool = (schoolId: string) => {
    localStorage.setItem('selected_school_id', schoolId);
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading schools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Select School</h1>
          <p className="text-xl text-gray-600">Choose which school to access</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schools.map((school) => (
            <div
              key={school.id}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 cursor-pointer"
              onClick={() => handleSelectSchool(school.id)}
            >
              {school.logo && (
                <img src={school.logo} alt={school.name} className="h-12 w-12 mb-4" />
              )}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{school.name}</h2>
              <p className="text-gray-600 mb-4">{school.domain}</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{school.studentCount || 0} students</span>
                <span>{school.teacherCount || 0} teachers</span>
              </div>
              <button className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                Access School
              </button>
            </div>
          ))}
        </div>

        {schools.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No schools available</p>
            <Link
              href="/auth/login"
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
