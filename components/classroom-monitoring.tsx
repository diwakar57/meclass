/**
 * Classroom Component with Student Monitoring
 * Teachers see student monitoring status in real-time
 * Monitoring is active during live class sessions
 */

'use client';

import { useEffect, useState } from 'react';
import { useStudentMonitoring, MonitoringConfig } from '@/hooks/useStudentMonitoring';
import FaceDetectionService, { FaceDetectionResult } from '@/lib/services/face-detection-service';

interface StudentMonitoringStatus {
  studentId: string;
  studentName: string;
  focusStatus: 'focused' | 'unfocused';
  alerts: number;
  tabSwitches: number;
  faceDetected: boolean;
  lastUpdate: Date;
}

interface ClassroomWithMonitoringProps {
  classId: string;
  schoolId: string;
  studentId: string;
  isTeacher?: boolean;
  isStudent?: boolean;
  studentName?: string;
}

export function StudentMonitoringWidget({
  classId,
  schoolId,
  studentId,
  studentName = 'Student',
  isStudent = false,
}: ClassroomWithMonitoringProps) {
  const [monitoringConfig, setMonitoringConfig] = useState<MonitoringConfig | null>(null);
  const [faceDetectionService, setFaceDetectionService] = useState<FaceDetectionService | null>(null);
  const [faceDetectionResult, setFaceDetectionResult] = useState<FaceDetectionResult | null>(null);
  const [showFaceDetectionPrompt, setShowFaceDetectionPrompt] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const { metrics, triggerAlert, pauseClass } = useStudentMonitoring(
    monitoringConfig || {
      enabled: false,
      enableFaceDetection: false,
      enableTabSwitchDetection: false,
      enableMouseTracking: false,
      focusPauseDelay: 5000,
      alertSoundEnabled: true,
      schoolId,
      classId,
      studentId,
    }
  );

  // Fetch monitoring configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(
          `/api/monitoring-feature?schoolId=${schoolId}`
        );
        if (response.ok) {
          const school = await response.json();
          if (school.monitoringFeatureEnabled) {
            setMonitoringConfig({
              enabled: true,
              enableFaceDetection: school.monitoringSettings.enableFaceDetection,
              enableTabSwitchDetection: school.monitoringSettings.enableTabSwitchDetection,
              enableMouseTracking: school.monitoringSettings.enableMouseTracking,
              focusPauseDelay: school.monitoringSettings.focusPauseDelay,
              alertSoundEnabled: school.monitoringSettings.alertSoundEnabled,
              schoolId,
              classId,
              studentId,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch monitoring config:', error);
      }
    };

    fetchConfig();
  }, [schoolId, classId, studentId]);

  // Initialize face detection if enabled
  useEffect(() => {
    if (!monitoringConfig?.enableFaceDetection || !isStudent) return;

    const initializeFaceDetection = async () => {
      try {
        setShowFaceDetectionPrompt(true);

        const service = new FaceDetectionService({
          modelType: 'tensorflow',
          confidenceThreshold: 0.5,
          updateInterval: 1000,
          detectionTimeout: 3000,
        });

        // Create hidden video element
        const video = document.createElement('video');
        video.autoplay = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        setVideoRef(video);

        // Initialize service
        await service.initialize(video);

        service.on('detected', (result: FaceDetectionResult) => {
          setFaceDetectionResult(result);

          // Alert if multiple persons detected
          if (result.multiplePersonsDetected) {
            triggerAlert('Multiple persons detected!');
          }
        });

        service.on('error', (error: Error) => {
          console.error('Face detection error:', error);
        });

        setFaceDetectionService(service);
        setShowFaceDetectionPrompt(false);
      } catch (error) {
        console.error('Failed to initialize face detection:', error);
        setShowFaceDetectionPrompt(false);
      }
    };

    initializeFaceDetection();

    return () => {
      if (faceDetectionService) {
        faceDetectionService.stop();
      }
      if (videoRef) {
        videoRef.remove();
      }
    };
  }, [monitoringConfig?.enableFaceDetection, isStudent, triggerAlert]);

  // Handle focus loss
  useEffect(() => {
    if (metrics.focusStatus === 'unfocused' && metrics.alertTriggered) {
      triggerAlert('Focus lost! Returning to class...');
      if (monitoringConfig?.pauseClassOnAlert) {
        pauseClass();
      }
    }
  }, [metrics, triggerAlert, pauseClass, monitoringConfig?.pauseClassOnAlert]);

  if (!monitoringConfig?.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-xs z-50">
      {/* Face Detection Prompt */}
      {showFaceDetectionPrompt && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded text-sm">
          <p>Enabling face detection... Camera may be requested.</p>
        </div>
      )}

      {/* Monitoring Status */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">{isStudent ? 'Your Status' : `${studentName}'s Status`}</h3>

        {/* Focus Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Focus:</span>
          <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${
            metrics.focusStatus === 'focused'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              metrics.focusStatus === 'focused' ? 'bg-green-600' : 'bg-red-600'
            }`}></span>
            {metrics.focusStatus}
          </div>
        </div>

        {/* Tab Switches */}
        {monitoringConfig.enableTabSwitchDetection && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Tab Switches:</span>
            <span className="text-sm font-medium">{metrics.tabSwitchCount}</span>
          </div>
        )}

        {/* Face Detection */}
        {monitoringConfig.enableFaceDetection && faceDetectionResult && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Face Detected:</span>
            <div className={`flex items-center gap-1 text-xs ${
              faceDetectionResult.faceDetected ? 'text-green-600' : 'text-gray-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                faceDetectionResult.faceDetected ? 'bg-green-600' : 'bg-gray-400'
              }`}></span>
              {faceDetectionResult.faceDetected ? 'Yes' : 'No'}
            </div>
          </div>
        )}

        {/* Alerts Count */}
        {metrics.alertTriggered && (
          <div className="flex items-center justify-between p-2 bg-red-50 rounded">
            <span className="text-sm text-red-700 font-medium">⚠ Alert Triggered</span>
          </div>
        )}

        {/* Mouse Movement */}
        {monitoringConfig.enableMouseTracking && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Activity:</span>
            <span className="text-sm font-medium">{metrics.mouseMovement}</span>
          </div>
        )}
      </div>

      {/* Info Badge */}
      <div className="mt-3 pt-3 border-t text-xs text-gray-600">
        <p>Monitoring Active</p>
        <p>{new Date(metrics.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

/**
 * Teacher View - See all students monitoring status
 */
export function ClassroomMonitoringDashboard({
  classId,
  schoolId,
}: {
  classId: string;
  schoolId: string;
}) {
  const [studentStatuses, setStudentStatuses] = useState<StudentMonitoringStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStudentStatuses();
    }, 2000);

    return () => clearInterval(interval);
  }, [classId, autoRefresh]);

  const fetchStudentStatuses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/student-monitoring?classId=${classId}&schoolId=${schoolId}`);
      const data = await response.json();

      // Process logs into student summaries
      const summaries = processMonitoringLogs(data.logs);
      setStudentStatuses(summaries);
    } catch (error) {
      console.error('Failed to fetch student statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMonitoringLogs = (logs: any[]): StudentMonitoringStatus[] => {
    const summaries: { [key: string]: StudentMonitoringStatus } = {};

    logs.forEach((log) => {
      if (!summaries[log.studentId]) {
        summaries[log.studentId] = {
          studentId: log.studentId,
          studentName: 'Student', // Get from API ideally
          focusStatus: 'focused',
          alerts: 0,
          tabSwitches: 0,
          faceDetected: false,
          lastUpdate: new Date(),
        };
      }

      summaries[log.studentId].focusStatus = log.focusStatus;
      if (log.alertTriggered) summaries[log.studentId].alerts++;
      summaries[log.studentId].tabSwitches += log.tabSwitchCount;
      summaries[log.studentId].faceDetected = log.faceDetected;
      summaries[log.studentId].lastUpdate = new Date(log.timestamp);
    });

    return Object.values(summaries);
  };

  useEffect(() => {
    fetchStudentStatuses();
  }, [classId]);

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Class Monitoring Dashboard</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Auto Refresh</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {studentStatuses.map((student) => (
          <div key={student.studentId} className="bg-white p-4 rounded-lg border">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold">{student.studentName}</h3>
                <p className="text-xs text-gray-600">
                  Updated: {student.lastUpdate.toLocaleTimeString()}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                student.focusStatus === 'focused' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Focus:</span>
                <span className="font-medium text-green-600">{student.focusStatus}</span>
              </div>
              <div className="flex justify-between">
                <span>Alerts:</span>
                <span className={`font-medium ${student.alerts > 0 ? 'text-red-600' : ''}`}>
                  {student.alerts}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tab Switches:</span>
                <span className="font-medium">{student.tabSwitches}</span>
              </div>
              {student.faceDetected && (
                <div className="flex justify-between">
                  <span>Face Detected:</span>
                  <span className="font-medium text-blue-600">✓</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {studentStatuses.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-600">
          No students in monitoring session yet
        </div>
      )}
    </div>
  );
}

export default StudentMonitoringWidget;
