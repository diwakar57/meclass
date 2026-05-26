# Student Monitoring System - Quick Setup Guide

## Installation Steps

### 1. Database Migration
```bash
# Apply the monitoring schema migration
psql -d your_database -f db/migrations/add-student-monitoring-schema.sql
```

### 2. Install Dependencies
```bash
npm install
# The following are already in package.json or added:
# - @tensorflow/tfjs
# - @tensorflow-models/coco-ssd  
# - recharts (for charts)
```

### 3. Update .env.local
```env
# Add these if not already present
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run Prisma Migrations
```bash
npx prisma migrate dev
```

## Component Integration

### For Classroom
Add to your classroom page component:

```tsx
import { StudentMonitoringWidget, ClassroomMonitoringDashboard } from '@/components/classroom-monitoring';

export default function ClassroomPage() {
  // Student view - monitoring widget
  return (
    <>
      <YourClassroomContent />
      <StudentMonitoringWidget 
        classId={classId}
        schoolId={schoolId}
        studentId={session.user.id}
        isStudent={true}
      />
    </>
  );
}

// Or teacher view - monitoring dashboard
export default function TeacherView() {
  return <ClassroomMonitoringDashboard classId={classId} schoolId={schoolId} />;
}
```

## Enabling Feature for School

### Admin Panel Access
1. Admin user logs in
2. Navigate to: `/dashboard/admin/monitoring-control`
3. Select school from list
4. Check "Enable Monitoring Feature"
5. Configure settings:
   - ☑ Enable Face Detection
   - ☑ Enable Tab Switch Detection
   - ☑ Enable Mouse Tracking
   - ☑ Alert Sound Enabled
   - ☑ Pause Class on Alert
   - ☑ Notify on Alert
   - Focus Pause Delay: 5000ms
   - Log Retention: 90 days
6. Click "Save Settings"

### Note
- Only Premium and Enterprise subscriptions can enable monitoring
- Feature requires users to opt-in/consent
- Face detection requires HTTPS

## File Structure

```
lib/
  services/
    face-detection-service.ts        # Face detection engine
  utils/
    api-helpers.ts                   # API response helpers

hooks/
  useStudentMonitoring.ts            # React hook for monitoring

components/
  classroom-monitoring.tsx            # Student & teacher components

app/api/
  student-monitoring/route.ts        # Monitoring data collection
  class/pause/route.ts               # Class pause/resume
  monitoring-feature/route.ts        # Feature control

app/dashboard/
  admin/monitoring-control/page.tsx  # Admin control panel
  parent/monitoring/page.tsx         # Parent dashboard

db/migrations/
  add-student-monitoring-schema.sql  # Database schema
```

## Usage Flows

### Student During Class
1. Student joins classroom
2. Monitoring widget appears in bottom-right corner
3. System detects:
   - Window focus (live)
   - Tab switches (realtime)
   - Face in frame (every 1 second)
   - Mouse movement (continuous)
4. If loses focus > 5 seconds:
   - Alert sound plays
   - Teacher/parent notified
   - Optional: Class automatically pauses
5. When refocuses:
   - Alert stops
   - Class can resume

### Teacher Monitoring Class
1. Teacher opens class monitoring dashboard
2. See all students' real-time status cards
3. Each card shows:
   - Student name
   - Focus status (green ✓ or red ✗)
   - Number of alerts
   - Tab switches
   - Face detection status
4. Auto-refreshes every 2 seconds
5. Can manually pause/resume class for specific student

### Parent Checking Child's Progress
1. Parent logs into `/dashboard/parent/monitoring`
2. Selects child from dropdown
3. Views:
   - Current focus status
   - Focus timeline chart
   - Tab switch patterns
   - Alert history
   - Today/week/month analytics
4. Can download reports

### SaaS Admin Controlling Feature
1. Admin logs into `/dashboard/admin/monitoring-control`
2. For each school:
   - See subscription tier
   - See if monitoring enabled
   - Enable/disable feature (toggle)
   - Configure default settings
3. Changes apply immediately to school

## Video Element for Face Detection

The system automatically creates a hidden video element for face detection:

```typescript
const video = document.createElement('video');
video.autoplay = true;
video.style.display = 'none';
document.body.appendChild(video);
```

This requires user to grant camera permission:
- System shows permission prompt automatically
- User must click "Allow" for face detection
- Works only on HTTPS or localhost

## Performance Considerations

1. **Monitoring Data**: Sent every 5 seconds per student
2. **Face Detection**: Process every 1 second (adjustable)
3. **Chart Updates**: Refresh every 2 seconds (teacher view)
4. **Database Queries**: Optimized with indexes
5. **Typical Load**: ~100-500KB per hour per student

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Face detection permission denied | User click "Allow" on browser prompt; needs HTTPS |
| Alerts not pausing class | Check school has feature enabled; verify pauseClassOnAlert setting |
| No monitoring data sent | Check classroom is active; verify network connection; check browser console |
| High database size | Archive old logs; adjust logRetentionDays setting |
| Face detection slow | Use TensorFlow instead of MediaPipe; reduce update frequency |

## Testing

### Test Student Monitoring (Dev)
```bash
# 1. Start dev server
npm run dev

# 2. As teacher: view /dashboard/admin/monitoring-control
# 3. Create test class and invite student
# 4. As student: join class and observe monitoring widget
# 5. Switch tabs/windows - should trigger alert
# 6. Check monitoring logs in database
```

### Load Testing
```bash
# Test with multiple students simultaneously
# Each student: ~500KB/hour
# Database: Indexes handle 1000+ students easily
```

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Enable feature for beta schools  
3. ✅ Gather feedback from teachers/parents
4. Upgrade to face detection with MediaPipe
5. Add emotion detection (smile, confusion)
6. Integrate with calendar for auto-start
7. Generate downloadable reports

## Support

For issues or questions:
- Check logs: Browser DevTools > Console
- Review docs: `/MONITORING_SYSTEM.md`
- Contact: admin@platform.com
