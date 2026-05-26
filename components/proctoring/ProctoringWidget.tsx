'use client';

/**
 * ProctoringWidget
 *
 * Embeds into an exam page and monitors:
 *   - Tab/window switching
 *   - Webcam feed (face detection placeholder)
 *   - Copy-paste / keyboard shortcuts
 *   - DevTools detection
 *
 * Events are batched and sent to /api/proctoring/[id]/events every 10 seconds.
 * On unmount (exam end) it calls the report endpoint.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

type EventType =
  | 'tab_switch'
  | 'window_blur'
  | 'face_not_detected'
  | 'copy_paste_attempt'
  | 'devtools_open';

interface RawEvent {
  event_type: EventType;
  details: Record<string, unknown>;
  occurred_at: string;
}

interface ProctoringWidgetProps {
  sessionId: string;
  onFlagged?: (score: number) => void;
}

export function ProctoringWidget({ sessionId, onFlagged }: ProctoringWidgetProps) {
  const [status, setStatus] = useState<'monitoring' | 'flagged' | 'ended'>('monitoring');
  const [eventCount, setEventCount] = useState(0);
  const [suspicionScore, setSuspicionScore] = useState(0);
  const eventQueue = useRef<RawEvent[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Event recording helpers ─────────────────────────────────────────────

  const pushEvent = useCallback((type: EventType, details: Record<string, unknown> = {}) => {
    const event: RawEvent = {
      event_type: type,
      details,
      occurred_at: new Date().toISOString(),
    };
    eventQueue.current.push(event);
    setEventCount((n) => n + 1);
  }, []);

  // ── Flush event queue to server ─────────────────────────────────────────

  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;
    const events = [...eventQueue.current];
    eventQueue.current = [];

    try {
      const res = await fetch(`/api/proctoring/${sessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (res.ok) {
        const data = await res.json();
        // Approximate score from event count (real score comes from session row)
        const approxScore = Math.min(100, eventCount * 5);
        setSuspicionScore(approxScore);
        if (approxScore >= 70) {
          setStatus('flagged');
          onFlagged?.(approxScore);
        }
      }
    } catch (err) {
      console.error('[Proctoring] Failed to flush events', err);
      // Re-queue on failure
      eventQueue.current = [...events, ...eventQueue.current];
    }
  }, [sessionId, eventCount, onFlagged]);

  // ── DOM event listeners ─────────────────────────────────────────────────

  useEffect(() => {
    const onBlur = () => pushEvent('window_blur', { url: window.location.href });
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') pushEvent('tab_switch');
    };
    const onCopy = (e: ClipboardEvent) =>
      pushEvent('copy_paste_attempt', { action: 'copy', selection: window.getSelection()?.toString().slice(0, 50) });
    const onPaste = () => pushEvent('copy_paste_attempt', { action: 'paste' });

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);

    // DevTools heuristic: window size comparison
    const devToolsCheck = setInterval(() => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        pushEvent('devtools_open');
      }
    }, 5000);

    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      clearInterval(devToolsCheck);
    };
  }, [pushEvent]);

  // ── Webcam setup ────────────────────────────────────────────────────────

  useEffect(() => {
    let frameInterval: ReturnType<typeof setInterval>;

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // TODO: Integrate face-api.js (or equivalent) for real-time face detection.
        // The interval below is left intentionally empty as a placeholder for the
        // SDK integration point. Remove this comment block and add the actual
        // face detection logic when the SDK is available.
        frameInterval = setInterval(() => {
          // Face detection hook — implement with face-api.js or mediapipe:
          // const detections = await faceapi.detectAllFaces(videoRef.current, ...);
          // if (detections.length === 0) pushEvent('face_not_detected', { confidence: 0 });
          // if (detections.length > 1)  pushEvent('multiple_faces', { count: detections.length });
        }, 5000);
      })
      .catch(() => {
        pushEvent('face_not_detected', { reason: 'camera_access_denied' });
      });

    return () => {
      clearInterval(frameInterval);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [pushEvent]);

  // ── Flush loop ──────────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(flushEvents, 10000);
    return () => {
      clearInterval(interval);
      flushEvents(); // final flush on unmount
    };
  }, [flushEvents]);

  // ── Render ──────────────────────────────────────────────────────────────

  const statusColor =
    status === 'monitoring'
      ? 'bg-green-500'
      : status === 'flagged'
        ? 'bg-red-500'
        : 'bg-gray-400';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Camera preview */}
      <div className="w-32 h-24 rounded-xl overflow-hidden border-2 border-gray-700 bg-gray-900 shadow-xl">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Status badge */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-medium shadow-lg ${status === 'flagged' ? 'bg-red-600 animate-pulse' : 'bg-gray-800'}`}
      >
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
        {status === 'monitoring' && 'Proctored'}
        {status === 'flagged' && '⚠ Flagged'}
        {status === 'ended' && 'Session Ended'}
        {status !== 'ended' && (
          <span className="opacity-60 ml-1">Score: {suspicionScore}</span>
        )}
      </div>
    </div>
  );
}
