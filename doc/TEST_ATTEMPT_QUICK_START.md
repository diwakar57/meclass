/**
 * TEST ATTEMPT & CONFIDENCE ANALYSIS
 * QUICK START GUIDE
 */

# 📊 STUDENT TEST ATTEMPT & CONFIDENCE ANALYSIS - QUICK START

## What Is This?

A system that:
1. **Captures** student test attempts with confidence scores
2. **Analyzes** confidence vs actual performance
3. **Classifies** readiness levels (ready, overconfident, underconfident, support required)
4. **Provides** dashboards for students and teachers
5. **Generates** actionable recommendations

## 5-Minute Overview

### FOR STUDENTS

```
1. Take Test
   Click "Start Test"
   → Answer questions
   → Rate confidence (1-5) on each question
   → Submit

2. See Results
   Dashboard shows:
   ✅ Your score (e.g., 78%)
   💭 Your confidence (e.g., 65%)
   📊 Mismatch analysis
   📍 Strong vs weak topics
   💡 Recommendations
```

### FOR TEACHERS

```
1. View Class Analytics
   Dashboard shows:
   📈 Class average score
   👥 Students by readiness level
   🔴 Students needing intervention
   🎯 Topics class struggled with

2. Take Action
   - Help underconfident students build confidence
   - Have overconfident students review content
   - Provide intensive support to at-risk students
   - Reteach struggling topics
```

## File Structure

```
lib/types/test-attempts.ts
  └─ All TypeScript types and enums
  
lib/repositories/test-attempt-repository.ts
  └─ Database operations (create, read, update, delete)
  
lib/services/test-attempt-analysis-service.ts
  └─ Core analysis algorithms (confidence, performance, calibration)
  
lib/services/test-attempt-validation-service.ts
  └─ Input validation and error handling
  
app/api/test-attempts/
  ├─ start/route.ts          → Create new attempt
  ├─ [id]/submit/route.ts     → Submit answers
  ├─ [id]/analyze/route.ts    → Analyze confidence vs performance
  ├─ [id]/route.ts           → Get attempt details
  └─ route.ts                → List attempts
  
components/dashboard/
  ├─ student-test-dashboard.tsx   → Student view
  └─ teacher-test-dashboard.tsx   → Teacher view
```

## Core Concepts

### Confidence vs Performance

```
Student rates confidence: 1-5 (very uncertain to very confident)
System calculates: confidence score 0-100

Student takes test: scores 70%
System calculates: performance score 70%

Comparison:
If confidence = performance     → "Well calibrated"
If confidence > performance     → "Overconfident"
If confidence < performance     → "Underconfident"
```

### Readiness Levels

```
┌──────────┬──────────┬─────────────────────┐
│ Performance │ Confidence │ Readiness Level     │
├─────────────┼────────────┼─────────────────────┤
│ High (≥75%) │ High (≥60) │ READY ✅            │
│ High (≥75%) │ Low (<60)  │ UNDERCONFIDENT 💪  │
│ Low (<75%)  │ High (≥60) │ OVERCONFIDENT ⚠️   │
│ Low (<75%)  │ Low (<60)  │ SUPPORT_REQUIRED 🔴 │
└─────────────┴────────────┴─────────────────────┘
```

## API Usage Examples

### 1. Start a Test

```bash
curl -X POST http://localhost:3000/api/test-attempts/start \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "diag_12345",
    "timeAllowedMinutes": 30
  }'

# Response
{
  "success": true,
  "data": {
    "id": "attempt_xyz",
    "studentId": "student_123",
    "testId": "diag_12345",
    "status": "in_progress",
    "startedAt": "2025-03-23T10:00:00Z",
    "answers": []
  }
}
```

### 2. Submit Test with Answers

```bash
curl -X POST http://localhost:3000/api/test-attempts/attempt_xyz/submit \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "questionId": "q1",
        "selectedAnswer": "B",
        "confidenceScore": 4,
        "secondsSpent": 45
      },
      {
        "questionId": "q2",
        "selectedAnswer": "This is my answer",
        "confidenceScore": 2,
        "secondsSpent": 120
      }
    ]
  }'

# Response
{
  "success": true,
  "data": {
    "id": "attempt_xyz",
    "status": "submitted",
    "percentageScore": 75,
    "totalQuestionsCorrect": 3,
    "totalQuestionsAnswered": 4
  }
}
```

### 3. Analyze Test (After Grading)

```bash
curl -X POST http://localhost:3000/api/test-attempts/attempt_xyz/analyze \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"

# Response
{
  "success": true,
  "data": {
    "testAttemptId": "attempt_xyz",
    "overallConfidence": 60,      # Average confidence
    "overallPerformance": 75,     # Percentage correct
    "overallMismatchScore": 15,   # Gap between them
    "readinessLevel": "underconfident",
    "confidenceMismatchType": "underconfident",
    "strongTopics": [
      {
        "topicId": "topic_alg",
        "topicName": "Algebra",
        "confidence": 80,
        "performance": 85,
        "wellCalibrated": true
      }
    ],
    "weakTopics": [
      {
        "topicId": "topic_geom",
        "topicName": "Geometry",
        "confidence": 40,
        "performance": 60,
        "reason": "underconfident"
      }
    ],
    "readinessAssessment": {
      "level": "underconfident",
      "explanation": "Student performs well but lacks appropriate confidence",
      "recommendedActions": [
        "Share positive feedback from assessment",
        "Assign challenging problems to build confidence",
        "Ready to advance with support"
      ]
    }
  }
}
```

### 4. Get Test Details

```bash
curl -X GET http://localhost:3000/api/test-attempts/attempt_xyz \
  -H "Authorization: Bearer {token}"

# Returns full test attempt with all answers
```

### 5. List Student's Tests

```bash
curl -X GET http://localhost:3000/api/test-attempts?limit=20&offset=0 \
  -H "Authorization: Bearer {token}"

# Returns paginated list of student's test attempts
```

## Integration with Student Dashboard

### Load Test Data

```typescript
async function loadStudentTestDashboard() {
  // Get recent attempts
  const attemptsRes = await fetch('/api/test-attempts?limit=10');
  const attemptsData = await attemptsRes.json();
  
  // Get latest analysis
  const latestAttempt = attemptsData.data[0];
  const analysisRes = await fetch(
    `/api/test-attempts/${latestAttempt.id}/analyze`,
    { method: 'POST' }
  );
  const analysis = await analysisRes.json();
  
  // Render dashboard
  return <StudentTestDashboard data={{
    recentAttempts: attemptsData.data,
    overallPerformance: {
      averageScore: calculateAverage(attemptsData.data),
      totalTestsTaken: attemptsData.pagination.total,
      strengthAreas: analysis.data.strongTopics.map(t => t.topicName),
      improvementAreas: analysis.data.weakTopics.map(t => t.topicName)
    },
    confidenceAnalysis: {
      lastAnalysis: analysis.data,
      trend: calculateTrend(analysis.data, previousAnalysis)
    }
  }} />
}
```

## Integration with Teacher Dashboard

### Load Class Analytics

```typescript
async function loadTeacherTestDashboard(classId: string) {
  // Get all student attempts for class
  const attemptsRes = await fetch(
    `/api/test-attempts?classId=${classId}&limit=1000`
  );
  const attempts = await attemptsRes.json();
  
  // Aggregate analysis
  const classData = aggregateClassAnalytics(attempts.data);
  
  // Render dashboard
  return <TeacherTestDashboard data={classData} />
}

function aggregateClassAnalytics(attempts) {
  // Calculate class average
  const avgScore = attempts.reduce((sum, a) => sum + a.percentageScore, 0) 
                   / attempts.length;
  
  // Count readiness breakdown
  const readiness = {
    ready: 0,
    overconfident: 0,
    underconfident: 0,
    supportRequired: 0
  };
  
  // Analyze by topic
  const topicStats = {};
  
  // Find students needing support
  const needsSupport = [];
  
  return {
    classAverageScore: avgScore,
    studentCount: attempts.length,
    readinessBreakdown: readiness,
    topicStrengths: [],
    topicWeaknesses: [],
    studentsNeedingSupport: needsSupport
  };
}
```

## Validation Examples

### Valid Submission
```typescript
// ✅ All required fields, confidence from 1-5
{
  "answers": [
    {
      "questionId": "q1",
      "selectedAnswer": "B",
      "confidenceScore": 4,
      "secondsSpent": 45
    }
  ]
}
```

### Invalid Submissions
```typescript
// ❌ Missing selected answer
{
  "answers": [
    {
      "questionId": "q1",
      "confidenceScore": 4
    }
  ]
}
// Error: "Selected answer is required"

// ❌ Confidence out of range
{
  "answers": [
    {
      "questionId": "q1",
      "selectedAnswer": "B",
      "confidenceScore": 10  // Should be 1-5
    }
  ]
}
// Error: "Confidence score must be between 1 and 5"

// ❌ Time seems wrong
{
  "answers": [
    {
      "questionId": "q1",
      "selectedAnswer": "B",
      "confidenceScore": 4,
      "secondsSpent": 0.5  // Less than 5 seconds
    }
  ]
}
// Warning: "Time spent seems unusual"
```

## Error Handling

### Test Not Graded
```json
{
  "success": false,
  "error": "Test must be graded before analysis can be performed",
  "code": "NOT_GRADED"
}
```

**Fix:** Wait for grading service to complete

### Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "code": 403
}
```

**Fix:** Student can only access own attempts; teachers can access class

### Already Started
```json
{
  "success": false,
  "error": "Test attempt already in progress",
  "code": "CONFLICT"
}
```

**Fix:** Submit or delete the in-progress attempt first

## Key Metrics Explained

### Confidence Score (0-100)
- **0-25**: Very uncertain about answers
- **25-50**: Somewhat uncertain
- **50-75**: Moderately confident
- **75-100**: Very confident

### Mismatch Gap
- **0-10%**: Well calibrated (✓ no action)
- **11-20%**: Noticeable gap (consider action)
- **21%+**: Significant gap (take action)

### Performance Status
- **90-100%**: Excellent (ready to advance)
- **80-89%**: Good (strong foundation)
- **70-79%**: Satisfactory (needs review)
- **0-69%**: Needs improvement (requires support)

## Classroom Applications

### For Students
- See where they're overconfident → review that topic
- See where they're underconfident → get encouragement
- Track progress across multiple tests
- Understand their own learning patterns

### For Teachers
- Identify students overestimating abilities → prevent false positives
- Identify students underestimating abilities → build confidence
- Find class-wide weak topics → reteach
- Measure intervention effectiveness

### For Parents
- See child's confidence calibration (accuracy of self-assessment)
- Monitor readiness level before advancing
- Understand specific weak areas
- See growth trends over time

## Next Steps for Implementation

1. **Database Setup**
   ```sql
   -- Ensure these tables exist (see schema details in docs)
   CREATE TABLE test_attempts (...)
   CREATE TABLE topic_performance_by_attempt (...)
   CREATE TABLE test_attempt_analyses (...)
   ```

2. **Test with Sample Data**
   ```bash
   # Start test
   curl ... POST /api/test-attempts/start
   
   # Submit answers
   curl ... POST /api/test-attempts/{id}/submit
   
   # Analyze (after grading)
   curl ... POST /api/test-attempts/{id}/analyze
   ```

3. **Integrate Dashboards**
   ```tsx
   // Student dashboard
   import { StudentTestDashboard } from '@/components/dashboard/student-test-dashboard'
   
   // Teacher dashboard
   import { TeacherTestDashboard } from '@/components/dashboard/teacher-test-dashboard'
   ```

4. **Monitor & Iterate**
   - Check validation errors
   - Review false readiness classifications
   - Calibrate thresholds if needed
   - Add new metrics based on feedback

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Analysis shows 0% confidence | Check if students provided confidence scores |
| Readiness always "READY" | May need to adjust thresholds (75% perf, 60% conf) |
| No weak topics identified | Good! Or check if students actually struggled |
| Teacher dashboard empty | Ensure tests are status=graded (not in_progress) |
| Mismatch seems wrong | Manually calculate \|confidence - performance\| |

## Performance Tips

- Cache latest analysis (~24 hour TTL)
- Don't reanalyze unless answers changed
- Pre-calculate topic performance on submit
- Aggregate class stats asynchronously
- Index: (school_id, student_id, test_id)

## Security Checklist

- ✅ All queries include school_id filter
- ✅ Students only access own attempts
- ✅ Teachers access school attempts only
- ✅ Answer text sanitized (prevent XSS)
- ✅ Authorization checks on each endpoint
- ✅ Validation before database save
- ✅ Errors don't leak sensitive info

## References

- Dunning-Kruger: Why overconfident people think they're smarter
- Metacognition: Understanding your own understanding
- Formative Assessment: Using tests to guide teaching
- Confidence Calibration: Accuracy of self-assessment
