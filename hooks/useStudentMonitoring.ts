/**
 * Student Monitoring Hook
 * Tracks focus, mouse movement, tab switches, and face detection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface MonitoringMetrics {
  focusStatus: 'focused' | 'unfocused';
  mouseMovement: number;
  lastMouseMoveTime: number;
  tabSwitchCount: number;
  faceDetectedStatus: boolean;
  currentUrl: string;
  alertTriggered: boolean;
  timestamp: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  enableFaceDetection: boolean;
  enableTabSwitchDetection: boolean;
  enableMouseTracking: boolean;
  focusPauseDelay: number; // ms before pause
  alertSoundEnabled: boolean;
  schoolId: string;
  classId: string;
  studentId: string;
}

export function useStudentMonitoring(config: MonitoringConfig) {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    focusStatus: 'focused',
    mouseMovement: 0,
    lastMouseMoveTime: Date.now(),
    tabSwitchCount: 0,
    faceDetectedStatus: false,
    currentUrl: typeof window !== 'undefined' ? window.location.href : '',
    alertTriggered: false,
    timestamp: Date.now(),
  });

  const monitoringRef = useRef({
    focusPauseTimer: null as NodeJS.Timeout | null,
    lastMetricsSent: 0,
    alertSound: null as HTMLAudioElement | null,
  });

  // Focus/Blur event listener
  useEffect(() => {
    if (!config.enabled) return;

    const handleFocus = () => {
      setMetrics((prev) => ({ ...prev, focusStatus: 'focused', alertTriggered: false }));
      if (monitoringRef.current.focusPauseTimer) {
        clearTimeout(monitoringRef.current.focusPauseTimer);
        monitoringRef.current.focusPauseTimer = null;
      }
    };

    const handleBlur = () => {
      setMetrics((prev) => ({ ...prev, focusStatus: 'unfocused' }));

      // Set timer to pause class
      monitoringRef.current.focusPauseTimer = setTimeout(
        () => {
          triggerAlert('Student lost focus! Pausing class...');
          sendMonitoringData({ ...metrics, focusStatus: 'unfocused', alertTriggered: true });
        },
        config.focusPauseDelay || 5000
      );
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [config.enabled, config.focusPauseDelay, metrics]);

  // Mouse movement tracking
  useEffect(() => {
    if (!config.enabled || !config.enableMouseTracking) return;

    const handleMouseMove = () => {
      const now = Date.now();
      setMetrics((prev) => ({
        ...prev,
        mouseMovement: prev.mouseMovement + 1,
        lastMouseMoveTime: now,
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [config.enabled, config.enableMouseTracking]);

  // Tab switch detection (using visibility API)
  useEffect(() => {
    if (!config.enabled || !config.enableTabSwitchDetection) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setMetrics((prev) => ({
          ...prev,
          tabSwitchCount: prev.tabSwitchCount + 1,
          focusStatus: 'unfocused',
        }));
        triggerAlert('Tab switch detected! Return to class.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [config.enabled, config.enableTabSwitchDetection]);

  // Periodic monitoring data send
  useEffect(() => {
    if (!config.enabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - monitoringRef.current.lastMetricsSent > 5000) {
        sendMonitoringData(metrics);
        monitoringRef.current.lastMetricsSent = now;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [config.enabled, metrics]);

  const triggerAlert = useCallback(async (message: string) => {
    if (!config.alertSoundEnabled) return;

    try {
      // Play alert sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Send alert notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Study Alert', {
          body: message,
          icon: '/alert-icon.png',
          tag: 'focus-alert',
        });
      }

      setMetrics((prev) => ({ ...prev, alertTriggered: true }));
    } catch (error) {
      console.error('Alert trigger error:', error);
    }
  }, [config.alertSoundEnabled]);

  const sendMonitoringData = useCallback(
    async (data: MonitoringMetrics) => {
      try {
        await fetch('/api/student-monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            schoolId: config.schoolId,
            classId: config.classId,
            studentId: config.studentId,
            timestamp: new Date(),
          }),
        });
      } catch (error) {
        console.error('Failed to send monitoring data:', error);
      }
    },
    [config.schoolId, config.classId, config.studentId]
  );

  const pauseClass = useCallback(async () => {
    try {
      await fetch('/api/class/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: config.classId,
          reason: 'Student lost focus',
          studentId: config.studentId,
        }),
      });
    } catch (error) {
      console.error('Failed to pause class:', error);
    }
  }, [config.classId, config.studentId]);

  return { metrics, triggerAlert, pauseClass };
}
