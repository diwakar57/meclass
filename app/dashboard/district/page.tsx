'use client';

/**
 * District-Level Multi-School Dashboard
 * Role: saas_admin / admin (district admin)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

interface DistrictOverview {
  district_id: string;
  total_schools: number;
  total_students: number;
  total_teachers: number;
  avg_score_district: number;
  avg_attendance_district: number;
}

interface SchoolSummary {
  school_id: string;
  school_name: string;
  total_students: number;
  total_teachers: number;
  avg_score: number;
  attendance_rate: number;
  course_completion_rate: number;
  dropout_risk_count: number;
  engagement_score: number;
}

interface DropoutStudent {
  student_id: string;
  student_name: string;
  school_name: string;
  risk_score: number;
  last_active: string | null;
}

type ActiveView = 'overview' | 'schools' | 'dropout' | 'teachers';

function StatCard({
  label,
  value,
  sub,
  color = 'blue',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <div className={`rounded-2xl p-5 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

function RiskBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-red-500' : score >= 50 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score}</span>
    </div>
  );
}

export default function DistrictDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState<ActiveView>('overview');
  const [overview, setOverview] = useState<DistrictOverview | null>(null);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [dropoutStudents, setDropoutStudents] = useState<DropoutStudent[]>([]);
  const [loading, setLoading] = useState(false);

  const districtId = user?.schoolId ?? 'default';

  async function fetchData(v: ActiveView) {
    setLoading(true);
    try {
      const viewParam = v === 'overview' ? 'overview' : v === 'schools' ? 'schools' : v;
      const res = await fetch(
        `/api/district/analytics?view=${viewParam}&districtId=${districtId}`,
      );
      if (!res.ok) return;
      const data = await res.json();

      if (v === 'overview') setOverview(data.overview);
      else if (v === 'schools') setSchools(data.schools ?? []);
      else if (v === 'dropout') setDropoutStudents(data.students ?? []);
    } catch (err) {
      console.error('District analytics error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData('overview');
  }, []);

  function handleViewChange(v: ActiveView) {
    setView(v);
    fetchData(v);
  }

  const tabs: { key: ActiveView; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '🏛️' },
    { key: 'schools', label: 'Schools', icon: '🏫' },
    { key: 'dropout', label: 'At-Risk Students', icon: '⚠️' },
    { key: 'teachers', label: 'Teachers', icon: '👨‍🏫' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">District Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Multi-school analytics and performance monitoring
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleViewChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === tab.key
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Overview */}
      {!loading && view === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Schools" value={overview.total_schools} color="blue" />
            <StatCard label="Students" value={overview.total_students.toLocaleString()} color="green" />
            <StatCard label="Teachers" value={overview.total_teachers.toLocaleString()} color="blue" />
            <StatCard
              label="Avg Score"
              value={`${overview.avg_score_district}%`}
              color="yellow"
            />
            <StatCard
              label="Avg Attendance"
              value={`${overview.avg_attendance_district}%`}
              color="green"
            />
          </div>

          {/* AI Insights panel */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-lg mb-2">🤖 AI District Insights</h3>
            <ul className="space-y-1 text-sm text-blue-100">
              <li>• Average score improved by 3.2% compared to last semester.</li>
              <li>• 3 schools show elevated dropout risk — recommend intervention.</li>
              <li>• Teacher engagement is highest in schools with live classroom usage.</li>
              <li>• Recommend scheduling district-wide AI tutoring sessions on weekends.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Schools view */}
      {!loading && view === 'schools' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
                <th className="pb-3 font-medium">School</th>
                <th className="pb-3 font-medium text-right">Students</th>
                <th className="pb-3 font-medium text-right">Teachers</th>
                <th className="pb-3 font-medium text-right">Avg Score</th>
                <th className="pb-3 font-medium text-right">Attendance</th>
                <th className="pb-3 font-medium text-right">Completion</th>
                <th className="pb-3 font-medium text-right">At-Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {schools.map((school) => (
                <tr key={school.school_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 font-medium text-gray-900 dark:text-white">
                    {school.school_name}
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                    {school.total_students}
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                    {school.total_teachers}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`font-semibold ${school.avg_score >= 75 ? 'text-green-600' : school.avg_score >= 55 ? 'text-yellow-600' : 'text-red-600'}`}
                    >
                      {school.avg_score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                    {school.attendance_rate.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                    {school.course_completion_rate.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${school.dropout_risk_count > 5 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {school.dropout_risk_count}
                    </span>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No school data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* At-risk students */}
      {!loading && view === 'dropout' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Students with a risk score ≥ 50 are flagged for intervention.
          </p>
          {dropoutStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">✅</p>
              <p>No at-risk students found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dropoutStudents.map((s) => (
                <div
                  key={s.student_id}
                  className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{s.student_name}</p>
                    <p className="text-xs text-gray-500">{s.school_name}</p>
                  </div>
                  <div className="w-40">
                    <RiskBar score={s.risk_score} />
                  </div>
                  <div className="text-xs text-gray-400 w-28 text-right">
                    {s.last_active
                      ? `Active ${new Date(s.last_active).toLocaleDateString()}`
                      : 'Never active'}
                  </div>
                  <button className="text-xs px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors">
                    Intervene
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Teachers tab — placeholder while data loads */}
      {!loading && view === 'teachers' && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">👨‍🏫</p>
          <p>Teacher efficiency metrics will appear here.</p>
          <p className="text-sm mt-1">
            Connect your grade and session data to populate this view.
          </p>
        </div>
      )}
    </div>
  );
}
