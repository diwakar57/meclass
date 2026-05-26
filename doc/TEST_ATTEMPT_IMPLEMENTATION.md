/**
 * TEST ATTEMPT FLOW & CONFIDENCE ANALYSIS
 * COMPREHENSIVE IMPLEMENTATION DOCUMENTATION
 * 
 * This document explains the complete flow of student test attempts and
 * confidence vs performance analysis - the core intelligence layer.
 */

# TEST ATTEMPT FLOW & CONFIDENCE ANALYSIS

## Overview

This system captures student test attempts with confidence scores and performs sophisticated analysis to:
1. Compare confidence vs actual performance
2. Classify readiness levels (ready, overconfident, underconfident, support required)
3. Identify strong and weak topics
4. Generate actionable recommendations
5. Provide educators with class-wide insights

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      STUDENT TEST WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. START TEST ATTEMPT
   ├─ POST /api/test-attempts/start
   ├─ Creates in_progress attempt
   └─ Returns attempt ID & questions

2. TAKE TEST (in browser)
   ├─ Student answers questions
   ├─ Provides confidence scores (1-5 scale)
   ├─ System tracks time per question
   └─ Can save progress without submitting

3. SUBMIT TEST
   ├─ POST /api/test-attempts/{id}/submit
   ├─ Auto-grades multiple choice
   ├─ Queues essay/short answer for LLM grading
   ├─ Calculates percentage score
   ├─ Saves topic-level performance
   └─ Status = submitted

4. GRADE TEST (async)
   ├─ LLM service grades open-ended questions
   ├─ Finalizes all scores
   └─ Status = graded

5. ANALYZE TEST
   ├─ POST /api/test-attempts/{id}/analyze
   ├─ Calculates confidence metrics
   ├─ Calculates performance metrics
   ├─ Identifies mismatch
   ├─ Classifies readiness level
   ├─ Analyzes by topic
   ├─ Generates recommendations
   └─ Saves analysis results

6. DASHBOARD DISPLAY
   ├─ Student sees: readiness badge, calibration chart, topics, recommendations
   └─ Teacher sees: class breakdown, students needing support, topic insights
```

## Data Models

### Test Attempt
```typescript
TestAttempt {
  id: string                    // Unique identifier
  studentId: string             // Which student
  testId: string                // Which test
  status: 'in_progress' | 'submitted' | 'graded' | 'reviewed'
  answers: StudentAnswer[]      // All responses
  percentageScore: number       // Overall score (0-100)
  performanceStatus: PerformanceStatus  // excellent/good/satisfactory/needs_improvement
  totalQuestionsAnswered: number
  totalQuestionsCorrect: number
  startedAt: Date
  submittedAt?: Date
  createdAt: Date
}
```

### Student Answer
```typescript
StudentAnswer {
  questionId: string            // Which question
  topicId: string               // Which topic
  selectedAnswer: string | string[]  // What student answered
  confidenceScore?: 1-5         // How confident (optional)
  secondsSpent: number          // Time spent on this question
  isCorrect: boolean            // Correct or not
  pointsEarned: number          // Score for this answer
  gradedBy: 'auto' | 'llm' | 'human'
  gradingFeedback?: string      // Why correct/incorrect
}
```

## Confidence vs Performance Analysis

### CORE ALGORITHM

The analysis performs the following operations in sequence:

#### 1. Calculate Confidence Metrics
```
Input: StudentAnswer[] (with confidenceScore field)

Steps:
1. Filter answers with confidence scores
2. Convert confidence scale 1-5 → 0-100
   Formula: confidence_1_to_5 * 20
3. Calculate statistics:
   - Average confidence
   - Min/Max confidence
   - Standard deviation
   - Count with/without confidence data

Output: ConfidenceMetrics {
  averageConfidence: 0-100
  questionsWithConfidence: number
  questionsWithoutConfidence: number
}
```

#### 2. Calculate Performance Metrics
```
Input: TestAttempt

Steps:
1. Count correct answers
2. Calculate percentage: (correct / total) * 100
3. Calculate point totals

Output: PerformanceMetrics {
  percentageCorrect: 0-100
  totalQuestions: number
  questionsCorrect: number
}
```

#### 3. Calculate Mismatch
```
Input: 
  confidence: 0-100 (from step 1)
  performance: 0-100 (from step 2)

Steps:
1. Calculate gap: |confidence - performance|
2. Classify:
   - gap ≤ 10%     → well_calibrated
   - confidence > performance  → overconfident
   - confidence < performance  → underconfident
3. Rate severity based on gap size:
   - ≤ 10%         → low
   - 10-20%        → moderate
   - > 20%         → high

Output: MismatchCalculation {
  mismatchScore: 0-100
  mismatchType: 'well_calibrated' | 'overconfident' | 'underconfident'
  severity: 'low' | 'moderate' | 'high'
  explanation: string
}
```

#### 4. Classify Readiness
```
Input:
  confidence: 0-100
  performance: 0-100

Steps:
1. Define "high" thresholds
   - highConfidence = confidence ≥ 60
   - highPerformance = performance ≥ 75
2. Build 2x2 matrix to classify:

   HIGH PERF + HIGH CONF  → READY ✅
   HIGH PERF + LOW CONF   → UNDERCONFIDENT (fix: encouragement)
   LOW PERF + HIGH CONF   → OVERCONFIDENT (fix: review content)
   LOW PERF + LOW CONF    → SUPPORT_REQUIRED (fix: intervention)

Output: ReadinessLevel {
  level: 'ready' | 'underconfident' | 'overconfident' | 'support_required'
  explanation: string
  actionItems: string[]
}
```

#### 5. Topic-Level Analysis
```
Input: StudentAnswer[] (all answers grouped by topicId)

For each topic:
1. Filter answers for that topic
2. Calculate topic confidence (average of topic answers)
3. Calculate topic performance (% correct for topic)
4. Calculate topic mismatch
5. Identify:
   - Strong topics: performance ≥ 80%
   - Weak topics: performance < 75%
   - Overconfident topics: conf ≥ 60 AND perf < 60
   - Underconfident topics: conf < 40 AND perf ≥ 75

Output: ConfidenceDataPoint[] - breakdown by topic
```

#### 6. Generate Insights
```
Strong Topics:
- Topics where student did well (≥80%)
- Sorted by performance (highest first)
- Top 5 topics

Weak Topics:
- Topics where student struggled (<75%)
- Classified by reason:
  - "overconfident": high conf, low perf
  - "underconfident": low conf, high perf
  - "poorly_prepared": both low
- Top 5 topics

Recommendations:
- Based on readiness level
- Ready: "Ready to advance to next topic"
- Underconfident: "You performed better than you think"
- Overconfident: "Review these areas before advancing"
- Support Required: "Intensive intervention needed"
```

## Key Calculations Explained

### Why Normalize to 0-100?
```typescript
// Confidence is 1-5 scale, performance is 0-100
// Need to compare "apples to apples"

confidenceAsPercentage = (confidence - 1) / 4 * 100
// OR simpler: confidence * 20
// 1 → 20%, 3 → 60%, 5 → 100%

performanceAsPercentage = already 0-100

// Now both on same scale, can calculate gap
gap = |confidenceAsPercentage - performanceAsPercentage|
```

### Why These Thresholds?
```typescript
// High performance threshold = 75%
// - 75% is "good" (B grade) in most systems
// - Represents "ready for next step"
// - Not too strict (allows some margin)
// - Not too lenient (ensures mastery)

// High confidence threshold = 60%
// - 60% = "somewhat confident" to "confident" (3-3.5 on 1-5 scale)
// - Represents meaningful confidence (above neutral)
// - Student willing to defend answer

// Mismatch severity
// - ≤10%: Natural variance, don't worry
// - 10-20%: Noticeable, address
// - >20%: Serious, intervention needed
```

## Data Flow Through System

### Database Schema (Required Tables)

```sql
test_attempts {
  id: uuid PRIMARY KEY
  student_id: uuid FK→users
  school_id: uuid FK→schools
  test_id: uuid FK→diagnostic_tests
  status: enum(in_progress, submitted, graded, reviewed)
  answers_json: jsonb  -- StudentAnswer[] serialized
  percentage_score: integer (0-100)
  performance_status: enum(excellent, good, satisfactory, needs_improvement)
  started_at: timestamp
  submitted_at: timestamp
  created_at: timestamp
}

topic_performance_by_attempt {
  id: uuid PRIMARY KEY
  test_attempt_id: uuid FK→test_attempts
  school_id: uuid FK→schools
  topic_id: uuid FK→syllabi_topics
  percentage_correct: integer
  average_confidence: integer (0-100)
  mismatch_score: integer
  mismatch_type: enum(well_calibrated, overconfident, underconfident)
  created_at: timestamp
}

test_attempt_analyses {
  id: uuid PRIMARY KEY
  test_attempt_id: uuid FK→test_attempts
  student_id: uuid FK→users
  school_id: uuid FK→schools
  readiness_level: enum(ready, overconfident, underconfident, support_required)
  confidence_mismatch_type: enum(well_calibrated, overconfident, underconfident)
  overall_confidence: integer
  overall_performance: integer
  overall_mismatch_score: integer
  topic_analysis_json: jsonb  -- ConfidenceDataPoint[]
  strong_topics_json: jsonb
  weak_topics_json: jsonb
  readiness_assessment_json: jsonb
  mismatch_analysis_json: jsonb
  analyzed_at: timestamp
  created_at: timestamp
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/test-attempts/start` | Create new test attempt |
| POST | `/api/test-attempts/{id}/submit` | Submit answers, auto-grade |
| POST | `/api/test-attempts/{id}/analyze` | Perform confidence analysis |
| GET | `/api/test-attempts/{id}` | Get attempt details |
| GET | `/api/test-attempts` | List student's attempts |

## Validation Rules

All operations validated through `TestAttemptValidationService`:

### Test Attempt Validation
- Must have student_id, test_id
- Answer count: 1-200
- Score percentage: 0-100
- Points earned: 0-100,000
- Status transitions must be logical

### Answer Validation
- Question ID required
- Selected answer required
- Confidence score: 1-5 (if provided)
- Time per question: 5 seconds - 1 hour
- Answer text: max 10,000 chars

### Submission Validation
- At least 1 answer required
- All answers must be valid
- Each answer validated individually
- XSS/injection attacks prevented

### Analysis Validation
- Test must be graded first
- Must have answers to analyze
- Warnings if <50% have confidence data

## Error Handling

### Common Errors

```typescript
// Test not graded yet
{
  success: false,
  error: "Test must be graded before analysis can be performed",
  code: "NOT_GRADED"
}

// Unauthorized access
{
  success: false,
  error: "Unauthorized",
  code: 403
}

// Already started
{
  success: false,
  error: "Test attempt already in progress",
  code: "CONFLICT"
}

// Invalid data
{
  success: false,
  error: "Validation failed",
  warnings: [
    "Less than 50% of answers have confidence scores",
    "Some answers are not yet graded"
  ]
}
```

### Graceful Degradation

If confidence data missing:
- Use all answers equally
- Don't fail - just warn
- Analysis still generates recommendations
- Reduced confidence in reliability

If some answers not graded:
- Include graded ones in analysis
- Flag in warnings
- Partial analysis is better than none

## Security Considerations

### Multi-Tenancy
```typescript
// EVERY query includes school_id filter
WHERE school_id = $1 AND ...
// Students can only access own attempts
WHERE student_id = $1 AND school_id = $2 AND ...
// Teachers can access student attempts in their school
WHERE school_id = $1 AND ...
```

### Authorization
```typescript
// Student: own attempts only
if (role === 'student') {
  if (attempt.studentId !== userId) return 403;
}

// Teacher/Principal: can view all in school
if (role === 'teacher' || 'principal') {
  // Can view, but must match school_id
}
```

### Answer Sanitization
```typescript
// Prevent XSS in text answers
selectedAnswer = sanitizeText(selectedAnswer)
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .slice(0, MAX_LENGTH)
```

## Performance Considerations

### Caching
```typescript
// Cache latest analysis per student (24 hours)
// Don't reanalyze unless answers changed
// Topic performance pre-calculated on submit
```

### Batch Operations
```typescript
// Teacher dashboard queries class at once
// Aggregate queries for readiness breakdown
// Use indexes on (school_id, student_id, test_id)
```

### Async Processing
```typescript
// Submit → Immediate auto-grade (MC)
// Send essays to LLM grading queue
// Analysis can't start until all graded
// Send analysis results as background job if heavy
```

## Integration Points

### With Syllabi System
```
Syllabus Topic
  ↓
Defines Test Questions
  ↓
Student Takes Test
  ↓
Performance tracked to Topic
  ↓
Feeds into Learning DNA
```

### With Learning DNA
```
Test Attempt Analysis
  ↓
Readiness Level
  ↓
Feeds → Student Profile
  ↓
Informs AI Lesson Generation
  ↓
"Student underconfident in Topic X"
  → Provide extra encouragement
  → Assign confidence-building problems
```

### With Teacher Dashboard
```
Multiple Test Attempts
  ↓
Aggregate Analysis
  ↓
Class Readiness Breakdown
  ↓
Students Needing Support
  ↓
Actionable Interventions
```

## Testing Strategy

### Unit Tests
```
✓ Confidence metric calculation
✓ Performance metric calculation
✓ Mismatch detection
✓ Readiness classification
✓ Validation rules
✓ Answer sanitization
```

### Integration Tests
```
✓ Full test attempt flow (start → submit → analyze)
✓ Multi-step grading (MC auto, essay async)
✓ Permission checks at each step
✓ Tenant isolation
✓ Error handling & recovery
```

### E2E Tests
```
✓ Student: start test → answer questions → submit
✓ System: auto-grade multiple choice
✓ LLM: grade essays
✓ Analysis: calculate readiness
✓ Dashboard: display results
```

## Troubleshooting

### Analysis Shows 0 Confidence
- Check if students provided confidence scores
- See if answers array populated correctly
- Verify answer objects have confidenceScore field

### Mismatch Type Wrong
- Recalculate manually: |conf - perf|
- Check threshold values in code
- Verify confidence scale conversion (1-5 → 0-100)

### Students Missing from Teacher Dashboard
- Check school_id filter
- Ensure test_attempts in database
- Verify status = 'graded' (can't analyze in_progress)

## Future Enhancements

1. **Confidence Trend Analysis**
   - Track how confidence changes across tests
   - Identify improving/declining patterns
   - Adaptive difficulty adjustment

2. **Careless Mistakes Detection**
   - Identify if low performance from lack of knowledge vs rushing
   - Time-based analysis (too fast = careless)

3. **Learning Patterns**
   - Which topics build on each other
   - How prerequisites affect performance
   - Prerequisite mastery detection

4. **Peer Comparison** (privacy considerations)
   - "Your readiness vs class average"
   - Compare to benchmark (without naming students)

5. **Longitudinal Tracking**
   - Semester/year trends
   - Growth metrics
   - Intervention effectiveness measurement

## References

- Dunning-Kruger Effect: Overconfidence in low performers
- Metacognition: Accuracy of self-assessment
- Threshold concepts: Topic difficulty thresholds
- Formative assessment: Using tests to guide instruction
