'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DataTable } from '@/components/dashboard/dashboard-components';
import { createLogger } from '@/lib/logger';

const log = createLogger('AttendanceTracker');

interface StudentAttendance {
  studentId: string;
  name: string;
  rollNumber: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  timestamp?: string;
}

interface AttendanceSession {
  classId: string;
  className: string;
  date: string;
  time: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  students: StudentAttendance[];
}

interface AttendanceData {
  sessions: AttendanceSession[];
  currentSession: AttendanceSession | null;
  attendanceStats: {
    totalSessions: number;
    averageAttendance: number;
    trend: Array<{ date: string; attendance: number }>;
  };
}

export default function AttendanceTrackerPage() {
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  async function fetchAttendanceData() {
    try {
      const response = await fetch(`/api/teacher/attendance?date=${selectedDate}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch attendance data');
      const data = await response.json();
      setAttendanceData(data.data);
      if (data.data.sessions.length > 0) {
        setSelectedClass(data.data.sessions[0].classId);
      }
    } catch (err) {
      log.error('Failed to load attendance data', err);
    } finally {
      setLoading(false);
    }
  }

  async function submitAttendance() {
    if (!selectedClass || Object.keys(studentStatuses).length === 0) {
      alert('Please mark attendance for at least one student');
      return;
    }

    try {
      const response = await fetch('/api/teacher/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          attendance: studentStatuses,
          remarks,
        }),
      });
      if (!response.ok) throw new Error('Failed to submit attendance');
      alert('Attendance submitted successfully');
      setStudentStatuses({});
      setRemarks({});
      fetchAttendanceData();
    } catch (err) {
      log.error('Failed to submit attendance', err);
      alert('Failed to submit attendance');
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Attendance Tracker" subtitle="Mark student attendance">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="text-center py-12">Loading attendance tracker...</div>
        </main>
      </DashboardLayout>
    );
  }

  if (!attendanceData) {
    return (
      <DashboardLayout title="Attendance Tracker" subtitle="Mark student attendance">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">Unable to load attendance tracker.</p>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const currentSession = attendanceData.sessions.find((s) => s.classId === selectedClass);

  const getStatusColor = (status: string) => {
    const colors: any = {
      present: 'bg-green-100 text-green-800 hover:bg-green-200',
      absent: 'bg-red-100 text-red-800 hover:bg-red-200',
      late: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      excused: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  };

  const toggleStatus = (studentId: string) => {
    const statuses: Array<'present' | 'absent' | 'late' | 'excused'> = ['present', 'absent', 'late', 'excused'];
    const currentStatus = studentStatuses[studentId] || 'present';
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    setStudentStatuses({
      ...studentStatuses,
      [studentId]: statuses[nextIndex],
    });
  };

  const counts = {
    present: Object.values(studentStatuses).filter((s) => s === 'present').length,
    absent: Object.values(studentStatuses).filter((s) => s === 'absent').length,
    late: Object.values(studentStatuses).filter((s) => s === 'late').length,
    excused: Object.values(studentStatuses).filter((s) => s === 'excused').length,
  };

  return (
    <DashboardLayout title="Attendance Tracker" subtitle="Mark and track student attendance">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Date and Class Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                <select
                  value={selectedClass || ''}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {attendanceData.sessions.map((session) => (
                    <option key={session.classId} value={session.classId}>
                      {session.className} ({session.totalStudents} students)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={submitAttendance}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
                >
                  Submit Attendance
                </button>
              </div>
            </div>
          </div>

          {currentSession && (
            <>
              {/* Attendance Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{currentSession.totalStudents}</p>
                </div>
                <div className="bg-green-50 rounded-lg shadow p-4 text-center border border-green-200">
                  <p className="text-sm text-green-700 font-medium">Present</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{counts.present}</p>
                </div>
                <div className="bg-red-50 rounded-lg shadow p-4 text-center border border-red-200">
                  <p className="text-sm text-red-700 font-medium">Absent</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{counts.absent}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg shadow p-4 text-center border border-yellow-200">
                  <p className="text-sm text-yellow-700 font-medium">Late</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{counts.late}</p>
                </div>
                <div className="bg-blue-50 rounded-lg shadow p-4 text-center border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">Excused</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{counts.excused}</p>
                </div>
              </div>

              {/* Student Attendance Form */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <p className="font-bold text-gray-900">{currentSession.className}</p>
                  <p className="text-sm text-gray-600 mt-1">Click on student to toggle attendance status</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Roll #</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Name</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Attendance</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSession.students.map((student) => (
                        <tr key={student.studentId} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-700 font-medium">{student.rollNumber}</td>
                          <td className="px-6 py-3 text-gray-900 font-medium">{student.name}</td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => toggleStatus(student.studentId)}
                              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                getStatusColor(studentStatuses[student.studentId] || 'present')
                              }`}
                            >
                              {(studentStatuses[student.studentId] || 'present').charAt(0).toUpperCase() +
                                (studentStatuses[student.studentId] || 'present').slice(1)}
                            </button>
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              value={remarks[student.studentId] || ''}
                              onChange={(e) =>
                                setRemarks({
                                  ...remarks,
                                  [student.studentId]: e.target.value,
                                })
                              }
                              placeholder="Add remarks..."
                              className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-white rounded-lg shadow p-6">
                <p className="font-bold text-gray-900 mb-4">Attendance Statistics</p>
                <div className="space-y-3">
                  {[
                    { label: 'Attendance Rate', value: `${Math.round((counts.present / currentSession.totalStudents) * 100)}%`, color: 'bg-gradient-to-r from-green-400 to-green-600' },
                    { label: 'Absence Rate', value: `${Math.round((counts.absent / currentSession.totalStudents) * 100)}%`, color: 'bg-gradient-to-r from-red-400 to-red-600' },
                    { label: 'Late Arrivals', value: `${Math.round((counts.late / currentSession.totalStudents) * 100)}%`, color: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
                  ].map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="w-32 text-gray-700 font-medium">{stat.label}</span>
                      <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full flex items-center justify-end pr-2 text-white text-xs font-bold ${stat.color}`}
                          style={{ width: stat.value }}
                        >
                          {stat.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
