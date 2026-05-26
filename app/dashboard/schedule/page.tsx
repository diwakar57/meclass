'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('Schedule');

interface ScheduleEvent {
  id: string;
  title: string;
  instructor?: string;
  classroom?: string;
  startTime: string;
  endTime: string;
  day: string;
  type: 'class' | 'exam' | 'assignment' | 'event';
  description?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

interface ScheduleData {
  weekSchedule: ScheduleEvent[];
  upcomingEvents: ScheduleEvent[];
  todaySchedule: ScheduleEvent[];
  deadlines: Array<{ title: string; dueDate: string; subject: string }>;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 10 }, (_, i) => {
  const hour = i + 8; // Start from 8 AM
  return `${hour % 12 === 0 ? 12 : hour % 12}${hour >= 12 ? 'PM' : 'AM'}`;
});

export default function SchedulePage() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'list'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  async function fetchSchedule() {
    try {
      const response = await fetch(`/api/schedule?date=${selectedDate}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch schedule');
      const data = await response.json();
      setScheduleData(data.data);
    } catch (err) {
      log.error('Failed to load schedule', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Schedule" subtitle="View your timetable">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="text-center py-12">Loading schedule...</div>
        </main>
      </DashboardLayout>
    );
  }

  if (!scheduleData) {
    return (
      <DashboardLayout title="Schedule" subtitle="View your timetable">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">Unable to load schedule.</p>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const getEventColor = (type: string) => {
    const colors: any = {
      class: 'bg-blue-100 border-blue-500 text-blue-900',
      exam: 'bg-red-100 border-red-500 text-red-900',
      assignment: 'bg-purple-100 border-purple-500 text-purple-900',
      event: 'bg-green-100 border-green-500 text-green-900',
    };
    return colors[type] || 'bg-gray-100 border-gray-500 text-gray-900';
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      upcoming: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout title="Schedule" subtitle="Your class timetable and events">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div className="flex gap-2">
                {(['week', 'day', 'list'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      viewMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)} View
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Today's Schedule Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="font-bold text-gray-900 mb-4">Today's Schedule</p>
            {scheduleData.todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {scheduleData.todaySchedule.map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border-l-4 ${getEventColor(event.type)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{event.title}</p>
                        <p className="text-sm mt-1">
                          {event.startTime} - {event.endTime}
                        </p>
                        {event.instructor && (
                          <p className="text-sm text-gray-600">Instructor: {event.instructor}</p>
                        )}
                        {event.classroom && (
                          <p className="text-sm text-gray-600">Room: {event.classroom}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No classes scheduled for today</p>
            )}
          </div>

          {/* Week View Grid */}
          {viewMode === 'week' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="p-4 text-left text-sm font-bold text-gray-700 w-24">Time</th>
                      {DAYS.map((day) => (
                        <th key={day} className="p-4 text-center text-sm font-bold text-gray-700">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HOURS.map((hour) => (
                      <tr key={hour} className="border-b border-gray-200">
                        <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">{hour}</td>
                        {DAYS.map((day, dayIdx) => {
                          const event = scheduleData.weekSchedule.find(
                            (e) => e.day === day && e.startTime.includes(hour.replace('PM', '').replace('AM', '').split(':')[0])
                          );
                          return (
                            <td key={day} className="p-2 align-top text-center">
                              {event && (
                                <div className={`p-2 rounded text-xs font-medium ${getEventColor(event.type)}`}>
                                  <p className="font-bold text-[11px]">{event.title}</p>
                                  <p className="text-[10px]">{event.startTime}</p>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Day View */}
          {viewMode === 'day' && (
            <div className="space-y-4">
              <p className="font-bold text-gray-900">
                Schedule for {new Date(selectedDate).toLocaleDateString()}
              </p>
              {scheduleData.todaySchedule.length > 0 ? (
                scheduleData.todaySchedule.map((event) => (
                  <div
                    key={event.id}
                    className={`p-6 rounded-lg border-l-4 ${getEventColor(event.type)}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xl font-bold">{event.title}</p>
                        <p className="text-lg mt-2">
                          <span className="font-bold">{event.startTime}</span>
                          {' - '}
                          <span className="font-bold">{event.endTime}</span>
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-gray-700 mb-3">{event.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {event.instructor && (
                        <p><span className="font-medium">Instructor:</span> {event.instructor}</p>
                      )}
                      {event.classroom && (
                        <p><span className="font-medium">Room:</span> {event.classroom}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg p-8 text-center">
                  <p className="text-gray-600">No classes scheduled on this date</p>
                </div>
              )}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Event</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Date & Time</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Instructor</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Room</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleData.upcomingEvents.map((event) => (
                      <tr key={event.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{event.title}</td>
                        <td className="px-6 py-3 text-gray-700">
                          {new Date(event.startTime).toLocaleDateString()} {event.startTime}
                        </td>
                        <td className="px-6 py-3 text-gray-600">{event.instructor || '-'}</td>
                        <td className="px-6 py-3 text-gray-600">{event.classroom || '-'}</td>
                        <td className="px-6 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getEventColor(event.type)}`}>
                            {event.type}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(event.status)}`}>
                            {event.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          {scheduleData.deadlines.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="font-bold text-gray-900 mb-4">Upcoming Deadlines</p>
              <div className="space-y-3">
                {scheduleData.deadlines.map((deadline, idx) => (
                  <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{deadline.title}</p>
                        <p className="text-sm text-gray-600">{deadline.subject}</p>
                      </div>
                      <p className="text-sm font-bold text-orange-600">
                        Due: {new Date(deadline.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
