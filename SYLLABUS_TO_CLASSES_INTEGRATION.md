# Teacher Syllabus to Student Adaptive Classes - Integration Guide

## 🎯 What This Does

Converts a teacher's syllabus into **personalized learning classes** for each student, automatically adapting to their individual learning pace based on:
- Student diagnostic test results
- Learning pace preference (slow, standard, fast)
- Performance history

## 🔄 Complete Workflow

### 1. **Teacher Creates & Publishes Syllabus** 
   - Path: `/dashboard/teacher/syllabus`
   - Create syllabus with grade, subject, and title
   - Add ordered topics with descriptions
   - Publish to finalize

### 2. **Teacher Generates Classes** (NEW)
   - Path: `/dashboard/teacher/syllabus/page.tsx`
   - After publishing, see "Generate Adaptive Classes" section
   - Select pace type: Simple (slow), Core (standard), or Harsh (fast)
   - Click **"🚀 Generate Classes for All Students"**
   - API automatically:
     - Fetches all enrolled students
     - Calculates personalized pace for each via diagnostic profile
     - Creates adaptive learning roadmap
     - Schedules classes with pace-adjusted durations
     - Returns per-student summaries

### 3. **Student Views Personalized Schedule**
   - Path: `/dashboard/student/adaptive-classes` (NEW)
   - See all generated classes with:
     - Learning objectives
     - Difficulty level
     - Estimated time (adjusted for their pace)
     - Scheduled date
     - Current status
   - View next recommended class
   - See estimated completion date

## 📁 Files Created/Modified

### New Service
- **`lib/services/syllabus-class-generator.ts`**
  - Core conversion logic
  - Database integration
  - Pace multiplier calculation

### New API Routes
- **`app/api/teacher/syllabus/[syllabusId]/generate-classes/route.ts`**
  - POST: Generate classes from syllabus
  - GET: Get generation status

- **`app/api/student/adaptive-classes/route.ts`**
  - GET: Fetch student's adaptive classes with filters

### UI Components
- **`app/dashboard/teacher/syllabus/page.tsx`** (updated)
  - Added "Generate Adaptive Classes" button and form
  - Real-time generation results display

- **`app/dashboard/student/adaptive-classes/page.tsx`** (NEW)
  - Beautiful class schedule UI
  - Completion tracking
  - Pacing indicators

## 💡 Key Features

### For Teachers
✅ One-click class generation for all students  
✅ Choose baseline pace type  
✅ Detailed generation report (students processed, classes created)  
✅ Error tracking for failed students  

### For Students  
✅ Personalized class schedule  
✅ Pace-adjusted durations (0.5x slow, 1x standard, 2x fast)  
✅ Learning objectives by class  
✅ Difficulty indicators  
✅ Completion time estimates  
✅ Next class recommendations  

### System Level
✅ Reuses existing adaptive class generation engine  
✅ Integrates with student diagnostic profiles  
✅ Stores in scheduled_classes table with metadata  
✅ Role-based authorization (teacher creates, student views own)  

## 🗂️ Database Tables Used

| Table | Purpose |
|-------|---------|
| `teacher_syllabi` | Stores teacher syllabus content |
| `learning_plans` | Student learning plans |
| `scheduled_classes` | Individual class sessions with pace info |
| `learning_dna` | Student diagnostic profiles |
| `users` | Student/teacher data |

Key columns in `scheduled_classes`:
- `pace_multiplier` (0.5, 1, 2) - speed adjustment
- `estimated_duration_minutes` - adjusted duration
- `order_index` - sequence
- `status` - pending/in-progress/completed

## 🚀 How It Works Under the Hood

```
1. Teacher publishes syllabus → stored in teacher_syllabi
                    ↓
2. Teacher clicks "Generate Classes"
                    ↓
3. System fetches:
   - Syllabus topics
   - All enrolled students
   - Each student's diagnostic profile
                    ↓
4. For each student:
   - Run adaptive class generation engine
   - Get personalized roadmap with topics
   - Determine pace multiplier (0.5x | 1x | 2x)
   - Create learning plan if needed
   - Insert scheduled_classes records
                    ↓
5. Classes appear in student dashboard
   - Student sees personalized schedule
   - Durations adjusted by pace
   - Can track completion
```

## 📋 API Examples

### Generate Classes (Teacher)
```bash
POST /api/teacher/syllabus/{syllabusId}/generate-classes
Content-Type: application/json

{
  "studentIds": ["id1", "id2"],  // optional, uses all if omitted
  "planType": "core",             // simple, core, or harsh
  "allowDefaultPlan": true
}

Response:
{
  "success": true,
  "studentsProcessed": 25,
  "totalSessionsCreated": 450,
  "classCollections": [
    {
      "studentId": "xyz",
      "displayName": "John Doe",
      "totalSessions": 18,
      "estimatedCompletionWeeks": 4,
      "paceRecommendation": "standard"
    }
  ],
  "errors": []
}
```

### Get Adaptive Classes (Student)
```bash
GET /api/student/adaptive-classes?filter=pending&limit=10&offset=0

Response:
{
  "classes": [
    {
      "id": "class1",
      "topicName": "Introduction to Variables",
      "objectives": ["Understand variable types", "..."],
      "difficulty": "low",
      "estimatedDurationMinutes": 45,
      "paceMultiplier": 1.5,
      "scheduledDate": "2026-04-05T00:00:00Z",
      "status": "pending"
    }
  ],
  "summary": {
    "totalClasses": 20,
    "completed": 2,
    "inProgress": 1,
    "pending": 17,
    "currentPaceMultiplier": 1.5,
    "nextClass": {...},
    "estimatedCompletionDate": "2026-05-10T00:00:00Z"
  }
}
```

## ✨ Next Steps to Consider

- [ ] Link adaptive classes to lesson/session generation
- [ ] Add class completion tracking UI
- [ ] Show student progress against adaptive pace
- [ ] Adjust difficulty based on performance
- [ ] Add class notes and resources
- [ ] Implement class collaboration features
