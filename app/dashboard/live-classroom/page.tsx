'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LiveClassroomPanel } from '@/components/live-classroom/LiveClassroomPanel';

interface LiveSession {
  id: string;
  title: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  teacher_id: string;
  participant_count: number;
  started_at: string | null;
  created_at: string;
}

export default function LiveClassroomPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.role === 'teacher' || user?.role === 'principal';

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSessions() {
    try {
      const res = await fetch('/api/live-session');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createSession() {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch('/api/live-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewTitle('');
        setIsCreating(false);
        setActiveSession(data.session);
        await fetchSessions();
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }

  if (activeSession) {
    return (
      <div className="h-screen flex flex-col bg-gray-950">
        <div className="flex-1 min-h-0 p-4">
          <LiveClassroomPanel
            sessionId={activeSession.id}
            schoolId={user?.schoolId ?? ''}
            userId={user?.id ?? ''}
            userName={([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email) ?? 'User'}
            role={isTeacher ? 'teacher' : 'student'}
            sessionTitle={activeSession.title}
            onEnd={() => {
              setActiveSession(null);
              fetchSessions();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Classrooms</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isTeacher
              ? 'Start a live session for your students'
              : 'Join a live class in progress'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + New Live Session
          </button>
        )}
      </div>

      {/* Create session modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Create Live Session</h2>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createSession()}
              placeholder="Session title (e.g. Chapter 5 — Algebra)"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={createSession}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create &amp; Start
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🎥</div>
          <p className="text-lg font-medium">No live sessions yet</p>
          <p className="text-sm mt-1">
            {isTeacher ? 'Create a session to get started.' : 'Check back when your teacher starts a class.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-2">
                  {session.title}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    session.status === 'live'
                      ? 'bg-red-100 text-red-700'
                      : session.status === 'scheduled'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {session.status === 'live' ? '● LIVE' : session.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {session.participant_count} participant(s) ·{' '}
                {new Date(session.created_at).toLocaleDateString()}
              </p>
              {(session.status === 'live' || (isTeacher && session.status === 'scheduled')) && (
                <button
                  onClick={() => setActiveSession(session)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {session.status === 'live' ? 'Join Now' : 'Start Session'}
                </button>
              )}
              {session.status === 'ended' && (
                <button className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors">
                  View Recording
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
