# Student Pace-Aware Test Recommendation System

## 🎯 Overview

Implemented an intelligent test recommendation engine that suggests appropriate tests to students based on:
- **Confidence Scores**: From previous test attempts and answers
- **Learning Pace**: From adaptive class generation (slow/standard/fast multipliers)
- **Performance History**: Tracking strengths and weak areas
- **Next Class Topic**: Aligning with their adaptive class schedule

## 📋 Components Created

### 1. Test Recommendation Service
**File:** `lib/services/test-recommendation-engine.ts`

**Key Functions:**
- `getStudentConfidenceProfile()` - Analyzes student's recent test attempts and confidence metrics
- `recommendTestsForStudent()` - Generates ranked test recommendations (0-100 score)
- `getTestsByConfidenceGap()` - Identifies tests for topics with low confidence

**Confidence Profile Includes:**
- Average confidence across all tests (0-100)
- Confidence by topic
- Recent test count
- Learning pace multiplier (0.5x, 1x, 2x)
- Mastered vs weak topics
- Readiness for challenge

### 2. Test Recommendation Scoring Algorithm

Tests are scored based on multiple factors (0-100):

**Factors (in priority order):**

1. **Next Adaptive Class Match** (+30 points, High urgency)
   - If test topic matches next scheduled class
   - Critical for learning progression

2. **Confidence-Based Difficulty** (+/- 15-20 points)
   - Low confidence (<40%): Recommend easier tests (difficulty 1-3)
   - Medium confidence (40-80%): Recommend medium difficulty (4-6)
   - High confidence (>80%): Recommend challenging tests (7-10)

3. **Weak Topic Reinforcement** (+25 points, High urgency)
   - Tests for topics where student is struggling
   - Prioritized for improvement

4. **Mastered Topic** (-20 points, Low urgency)
   - Skip tests for already mastered topics
   - Deprioritized

5. **Pace Alignment** (+10 points)
   - Slow pace: Prefer shorter tests (<20 min)
   - Fast pace: Allow longer tests (>30 min)
   - Standard pace: Any duration

6. **Recency Bonus** (+10 points)
   - If last test was >7 days ago
   - Encourages regular testing

**Total Score Ranges:**
- 0-30: Not recommended
- 30-60: Optional
- 60-85: Recommended
- 85-100: Highly recommended

### 3. API Endpoint
**File:** `app/api/student/recommended-tests/route.ts`

**GET /api/student/recommended-tests**

Query Parameters:
- `includeGapTests` (boolean, optional) - Include confidence gap tests

Response:
```json
{
  "recommendations": {
    "recommendedTests": [...],  // Top 10 tests ranked
    "nextImmediateTest": {...},  // Highest priority test
    "summary": {
      "confidenceLevel": "low|medium|high",
      "suggestedAction": "Action message",
      "masteryProgress": 0-100
    }
  },
  "metadata": {...}
}
```

### 4. Student Tests UI Update
**File:** `app/dashboard/student/tests/page.tsx`

**New Features:**

1. **Confidence Summary Box**
   - Shows current confidence level (low/medium/high)
   - Displays suggested action based on confidence
   - Shows mastery progress bar (0-100%)

2. **Next Recommended Test Card** (Highlighted)
   - Large, prominent display with emoji indicator
   - Shows test title, topic, difficulty, time estimate
   - Displays confidence reason
   - "Start Test Now" button
   - Color-coded by urgency level

3. **Other Recommended Tests Section**
   - 5 additional recommended tests
   - Each test shows:
     - Title and topic
     - Why it's recommended (confidence reason)
     - Difficulty, urgency, pace indicator
     - Time estimate adjusted for student's pace
     - Recommendation match score (%)
     - "Take Test" button

4. **Stats Updated**
   - Added "Recommended Tests" count
   - Shows how many tests align with their pace

5. **Visual Indicators**
   - 🔴 High urgency tests
   - 🟡 Medium urgency tests
   - 🟢 Low urgency tests
   - 🐢 Slow pace indicators
   - → Standard pace indicators
   - 🚀 Fast pace indicators

## 🔄 Data Flow

```
Student Completes Test
        ↓
Test Recorded with Confidence Scores
        ↓
Student Views Tests Dashboard
        ↓
System Fetches:
  - Recent test attempts (last 60 days)
  - Student's learning plan & adaptive pace
  - Diagnostic profile from learning_dna
        ↓
For Each Available Test:
  - Calculate recommendation score (factors above)
  - Determine urgency level
  - Map to pace alignment
  - Generate reason text
        ↓
Rank Tests by Score (Highest First)
        ↓
Display to Student:
  - Next Immediate Test (top ranked)
  - Other Recommended Tests (2-10)
  - Historical Test Results
```

## 📊 Test Recommendation Scoring Example

**Example Student:**
- Confidence: 55% (medium)
- Pace Multiplier: 1.5x (fast)
- Weak Topic: Algebra
- Last Test: 3 days ago
- Next Class: Geometry

**Test Scoring:**

Test A: "Algebra Basics"
- Confidence match (medium difficulty): +15
- Weak topic reinforcement: +25
- Pace alignment (fast): +10
- No recency bonus: +0
- Not next class: +0
- **Total Score: 50/100** (Optional)

Test B: "Introduction to Geometry"
- Confidence match: +15
- Matches next class: +30
- Pace alignment: +10
- No weakness: +0
- **Total Score: 55/100** (Recommended)

Test C: "Advanced Geometry"
- Confidence mismatch: -10
- Matches next class: +30
- Medium difficulty for confidence: +15
- Pace alignment (fast): +10
- **Total Score: 45/100** (Optional)

**Result:** Test B recommended first (covers weak area, aligns with class schedule)

## 💡 Integration Points

1. **Adaptive Class Generation**
   - Uses pace multiplier from scheduled_classes
   - Aligns with next scheduled class topic
   - Adjusts test duration based on pace

2. **Learning DNA**
   - Retrieves diagnostic profile
   - Knows mastered vs weak topics
   - Understands learning patterns

3. **Test Attempts**
   - Fetches recent attempts
   - Analyzes confidence distribution
   - Tracks performance patterns

## 🎓 Student Experience

1. **Easy to Understand**
   - Clear confidence level indicator
   - Reason shown for each recommendation
   - Progress bar shows mastery level

2. **Personalized**
   - Tests match their pace
   - Difficulty scales with confidence
   - Focuses on weak areas

3. **Actionable**
   - Immediate action: "Start Recommended Test"
   - Clear next steps
   - See why each test is recommended

4. **Progressive**
   - System adapts as student progresses
   - Difficulty increases with confidence
   - New recommendations update after each test

## 📈 Expected Outcomes

- ✅ Students complete tests appropriate to their level
- ✅ Reduced test anxiety (easier tests when confidence is low)
- ✅ Faster progression (challenging tests when ready)
- ✅ Better focus on weak topics
- ✅ Alignment between class schedule and assessments
- ✅ Improved student engagement with testing

## 🔮 Future Enhancements

- [ ] A/B test recommendation variations
- [ ] Machine learning to optimize scoring weights
- [ ] Predict test performance before taking
- [ ] Group similar weak topics for focused learning
- [ ] Recommend study materials before difficult tests
- [ ] Track whether students follow recommendations
- [ ] Adjust recommendations based on time constraints
- [ ] Integration with teacher review notes
