# Student Behavior Monitoring System

## Overview

The Student Behavior Monitoring System is a comprehensive solution for tracking student focus, engagement, and behavior during online classes. It provides real-time monitoring, alerts, and insights for parents, teachers, and school administrators.

## Features

### 1. **Real-Time Behavior Tracking**
- **Focus Detection**: Monitors when students blur to other tabs or windows
- **Mouse Movement Tracking**: Records user activity and engagement
- **Tab Switch Detection**: Detects when students switch to other browser tabs
- **Face Detection**: Uses AI/ML to confirm student presence

### 2. **Smart Alerts**
- **Auto-Pause Class**: Automatically pauses class when student loses focus
- **Alert Sounds**: Plays audio notification to re-focus student
- **Parent Notifications**: Notifies parents of concerning behavior patterns
- **Admin Notifications**: Alerts school admins of systematic issues

### 3. **Hierarchical Control**
- **SaaS Admin**: Controls feature availability per school based on subscription tier
- **School Admin**: Configures monitoring settings for their school
- **Teachers**: Views real-time monitoring during class
- **Parents**: Monitors child's focus and engagement
- **Students**: Aware of monitoring status

### 4. **Detailed Analytics**
- Focus time percentage
- Alert frequency
- Tab switch patterns
- Face detection rate
- Engagement trends

## Architecture

### Database Schema

```
StudentMonitoringLogs:
- id: UUID (PK)
- schoolId: UUID (FK)
- classId: UUID (FK)
- studentId: UUID (FK)
- focusStatus: ENUM (focused, unfocused)
- mouseMovement: INT
- tabSwitchCount: INT
- faceDetected: BOOL
- alertTriggered: BOOL
- timestamp: TIMESTAMP

ClassMonitoringEvents:
- id: UUID (PK)
- classId: UUID (FK)
- studentId: UUID (FK)
- eventType: ENUM (CLASS_PAUSED, CLASS_RESUMED, ALERT_TRIGGERED...)
- reason: TEXT
- triggeredBy: UUID (FK - User)
- timestamp: TIMESTAMP
```

### API Endpoints

#### Monitoring Data Collection
```
POST /api/student-monitoring
GET /api/student-monitoring?classId=...&studentId=...&startDate=...&endDate=...
```

#### Class Control
```
POST /api/class/pause (pause class on alert)
PUT /api/class/pause (resume class)
```

#### Feature Control
```
GET /api/monitoring-feature?schoolId=...
POST /api/monitoring-feature (school admin configures)
PATCH /api/monitoring-feature (SaaS admin enables/disables)
```

## Implementation Guide

### 1. Install Dependencies

```bash
npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
# or use MediaPipe
npm install @mediapipe/face_detection
```

### 2. Add Monitoring to Classroom

```tsx
import { StudentMonitoringWidget } from '@/components/classroom-monitoring';

function ClassroomPage() {
  return (
    <div>
      <ClassroomContent />
      <StudentMonitoringWidget 
        classId={classId}
        schoolId={schoolId}
        studentId={studentId}
        isStudent={true}
      />
    </div>
  );
}
```

### 3. Enable Feature for School

1. Go to Admin Panel: `/dashboard/admin/monitoring-control`
2. Select school from list
3. Check "Enable Monitoring Feature" (requires Premium+ subscription)
4. Configure settings as needed
5. Save

### 4. Monitor from Teacher Dashboard

```tsx
import { ClassroomMonitoringDashboard } from '@/components/classroom-monitoring';

function TeacherClassView() {
  return (
    <ClassroomMonitoringDashboard 
      classId={classId}
      schoolId={schoolId}
    />
  );
}
```

### 5. Parent Monitoring

Parents can access: `/dashboard/parent/monitoring`
- View child's focus history
- See alert trends
- Monitor engagement patterns
- Download reports

## Configuration Settings

### Monitoring Settings (Per School)

```json
{
  "enableFaceDetection": boolean,
  "enableTabSwitchDetection": boolean,
  "enableMouseTracking": boolean,
  "focusPauseDelay": 5000,           // ms
  "alertSoundEnabled": boolean,
  "pauseClassOnAlert": boolean,
  "notifyOnAlert": boolean,
  "logRetentionDays": 90
}
```

## Subscription Tiers

| Tier | Monitoring | Features | Price |
|------|-----------|----------|-------|
| Basic | ❌ | - | $X |
| Pro | ✅ Tab Detection | Tab switches, Focus time | $X |
| Premium | ✅ Full | All features except face | $X |
| Enterprise | ✅ Premium + Face | Everything including face detection | Custom |

## Privacy & Compliance

### Data Privacy
- All monitoring data is encrypted in transit and at rest
- Data is school-specific (no cross-school visibility)
- Students can be informed they're being monitored
- GDPR/FERPA compliant data handling

### Consent
- Parents must consent before student monitoring is enabled
- Teachers must inform students of monitoring
- School must have privacy policy disclosing monitoring

### Data Retention
- Default: 90 days
- Configurable by school admin
- Automatic deletion after retention period

## Security Considerations

1. **Authentication**: All APIs require valid session
2. **Authorization**:
   - Admin: Full access
   - School Admin: Their school only
   - Teachers: Their classes only
   - Parents: Their children only
   - Students: Own data only

3. **Rate Limiting**: Monitor endpoints rate-limited to prevent abuse
4. **Encryption**: All monitoring data encrypted at rest

## Troubleshooting

### Face Detection Not Working
- Check camera permissions
- Verify HTTPS connection (required for camera access)
- Check console for model loading errors
- Try alternative model (TensorFlow vs MediaPipe)

### Tab Switch Detection Not Triggering
- Ensure browser tab has focus
- Check Visibility API support
- Verify event listeners are attached

### Alerts Not Pausing Class
- Check "pauseClassOnAlert" is enabled in settings
- Verify classroom.isPaused field in database
- Check class pause API permissions

## Performance Optimization

1. **Batch Monitoring Logs**: Send every 5 seconds instead of real-time
2. **Compress Face Detection**: Use lightweight models
3. **Database Indexing**: Indexes on class_id, student_id, timestamp
4. **Old Data Archival**: Move logs older than retention period

## Future Enhancements

1. **Eye Gaze Tracking**: Know exactly where student is looking
2. **Emotion Detection**: Detect if student is frustrated/confused  
3. **Voice Analysis**: Monitor tone and engagement from microphone
4. **Peer Pressure Prevention**: Alert only to parent, not other students
5. **Machine Learning**: Predict distractions before they happen
6. **Integration with LMS**: Auto-sync with learning platforms

## Support & Questions

For implementation details or issues:
1. Check security logs: `/var/log/monitoring/`
2. Review audit trail: Database `auditLog` table
3. Contact: support@platform.com
