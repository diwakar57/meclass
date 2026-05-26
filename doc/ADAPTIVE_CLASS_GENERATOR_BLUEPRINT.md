# Adaptive Class Generator Blueprint

## 1) Architecture Proposal

### Objective
Design an adaptive class generator that builds topic-by-topic learning sessions from:
- teacher syllabus (structured or raw)
- student diagnostic answers + confidence
- selectable intensity plan (`simple`, `core`, `harsh`)

### New Module Structure

- `lib/adaptive-class-generator/types.ts`
  - canonical contracts for syllabus model, diagnostic profile, study plans, roadmap/session outputs
- `lib/adaptive-class-generator/study-plans.ts`
  - fixed plan definitions and plan catalog
- `lib/adaptive-class-generator/syllabus-parser.ts`
  - parses raw/structured syllabus to normalized module/topic graph with weights/prerequisites
- `lib/adaptive-class-generator/diagnostic-analyzer.ts`
  - computes mastery + confidence patterns + pacing recommendation
- `lib/adaptive-class-generator/roadmap-generator.ts`
  - schedules topic sessions with prerequisite order, remediation and revision checkpoints
- `lib/adaptive-class-generator/ai-prompt-builder.ts`
  - generates strict AI planning prompt + expected JSON schema for downstream LLM refinement
- `lib/adaptive-class-generator/engine.ts`
  - orchestration entrypoint combining all modules
- `app/api/adaptive-class-generator/route.ts`
  - API endpoint for adaptive roadmap generation

### Runtime Boundaries

- Parsing boundary: convert heterogeneous syllabus input to deterministic graph model.
- Analysis boundary: convert diagnostic answers to calibrated mastery/confidence signals.
- Planning boundary: map graph + signals + selected plan into executable class sessions.
- Prompt boundary: produce robust LLM refinement prompt without changing core deterministic plan generation.

## 2) Data Flow

1. Client sends `teacherSyllabus`, optional `studentDiagnostic`, optional `selectedPlanType`.
2. API validates syllabus presence and invokes `generateAdaptiveClassPlan`.
3. `normalizeSyllabus` creates normalized `SyllabusModel` and stable `versionHash`.
4. `analyzeDiagnosticAgainstSyllabus` computes:
   - per-topic mastery
   - confidence calibration pattern (aligned/overconfident-weak/underconfident-strong)
   - pacing recommendation (`slow`/`standard`/`fast`)
5. Engine determines plan recommendation and resolves selected plan.
6. `generateAdaptiveRoadmap`:
   - orders topics via prerequisite-aware topology + adaptive priority
   - allocates sessions per topic using mastery gaps and plan intensity
   - inserts revision sessions/checkpoints by plan frequency
7. `buildAdaptivePlanningPrompt` packages context + schema for optional LLM refinement.
8. API returns typed payload with syllabus model, diagnostic profile, plan recommendation, roadmap, prompt, metadata fingerprint.

## 3) Improved AI Planning Prompt (Design)

### System Prompt Rules
- Instructional designer persona for adaptive K-12 sequencing.
- Enforce prerequisites and dependency order.
- Prioritize weak and overconfident-weak topics.
- Protect confidence for underconfident-strong topics.
- Include periodic revision and measurable mastery checkpoints.
- Return strict JSON only.

### User Prompt Payload
- selected plan + recommendation
- compact syllabus snapshot
- compact diagnostic snapshot
- deterministic draft roadmap (coverage + first sessions)

This keeps LLM behavior constrained and auditable while preserving deterministic fallback logic.

## 4) Backend Logic Design

### Orchestration Logic
- If diagnostic is missing:
  - allow fallback only when `allowDefaultPlanWithoutDiagnostic` is true or `selectedPlanType` provided
- Plan selection:
  - use diagnostic pacing recommendation + baseline score + weak-topic ratio
- Roadmap generation:
  - topic priority score = syllabus importance + mastery gap + confidence risk
  - topological ordering ensures prerequisites are never skipped
  - session allocation scales by plan intensity and topic difficulty

### Key Adaptive Signals
- `masteryScore` from accuracy + confidence calibration
- `confidencePattern` classification
- `overconfidentWeakAreas` and `underconfidentStrongAreas`
- `recommendedPacing`

## 5) JSON Schema Examples

### Request Example

```json
{
  "teacherSyllabus": {
    "sourceType": "structured",
    "subjectNameHint": "Mathematics",
    "structured": {
      "subjectName": "Algebra I",
      "modules": [
        {
          "moduleName": "Linear Equations",
          "topics": [
            {
              "topicName": "Solving one-variable equations",
              "prerequisites": [],
              "priority": "high",
              "difficultyTag": "medium",
              "weight": 1.5
            },
            {
              "topicName": "Word problems with equations",
              "prerequisites": ["Solving one-variable equations"],
              "priority": "high",
              "difficultyTag": "high",
              "weight": 2
            }
          ]
        }
      ]
    }
  },
  "studentDiagnostic": {
    "studentId": "student_001",
    "answers": [
      {
        "questionId": "q1",
        "mappedTopics": ["Solving one-variable equations"],
        "correct": true,
        "confidenceScore": 4
      },
      {
        "questionId": "q2",
        "mappedTopics": ["Word problems with equations"],
        "correct": false,
        "confidenceScore": 5
      }
    ],
    "confidenceScale": { "min": 1, "max": 5 }
  },
  "selectedPlanType": "core",
  "allowDefaultPlanWithoutDiagnostic": true,
  "runAiPlanningPrompt": true
}
```

### Response Shape Example

```json
{
  "success": true,
  "structuredSyllabusModel": {
    "id": "syllabus_abc",
    "subjectName": "Algebra I",
    "sourceType": "structured",
    "versionHash": "...",
    "modules": []
  },
  "studentDiagnosticProfile": {
    "studentId": "student_001",
    "baselineScore": 58,
    "recommendedPacing": "slow",
    "weakTopics": ["Word problems with equations"],
    "overconfidentWeakAreas": ["Word problems with equations"]
  },
  "availablePlans": [
    { "planType": "simple" },
    { "planType": "core" },
    { "planType": "harsh" }
  ],
  "planRecommendation": "simple",
  "selectedPlan": { "planType": "core" },
  "generatedClassRoadmap": {
    "roadmapId": "roadmap_123",
    "planType": "core",
    "totalWeeks": 4,
    "totalSessions": 14,
    "sessions": [],
    "coverage": []
  },
  "aiPlanningPrompt": {
    "systemPrompt": "...",
    "userPrompt": "...",
    "expectedJsonSchema": {}
  },
  "metadata": {
    "generatedAt": "2026-01-01T00:00:00.000Z",
    "inputFingerprint": "...",
    "regenerationTriggers": [
      "syllabus_version_change",
      "topic_dependency_change",
      "diagnostic_resubmission",
      "confidence_shift_detected",
      "plan_type_switch"
    ]
  }
}
```

## 6) Sample Generated Output (Condensed)

```json
{
  "planRecommendation": "simple",
  "selectedPlan": {
    "planType": "core",
    "hoursPerWeek": 6,
    "sessionsPerWeek": 4
  },
  "generatedClassRoadmap": {
    "totalWeeks": 3,
    "totalSessions": 10,
    "coverage": [
      {
        "topicName": "Solving one-variable equations",
        "sessionsAllocated": 3,
        "masteryAtBaseline": 78,
        "priority": "high"
      },
      {
        "topicName": "Word problems with equations",
        "sessionsAllocated": 4,
        "masteryAtBaseline": 38,
        "priority": "high"
      }
    ],
    "sessions": [
      {
        "title": "Solving one-variable equations: Foundations",
        "week": 1,
        "difficultyLevel": "medium",
        "practiceTasks": [
          "Solve 8 practice questions on Solving one-variable equations."
        ],
        "masteryCheckpoint": "Student demonstrates >=80% correctness on Solving one-variable equations checkpoint set."
      },
      {
        "title": "Word problems with equations: Foundations",
        "week": 1,
        "difficultyLevel": "hard",
        "practiceTasks": [
          "Solve 12 mixed-difficulty problems on Word problems with equations."
        ],
        "masteryCheckpoint": "Student demonstrates >=80% correctness on Word problems with equations checkpoint set."
      }
    ]
  }
}
```

## 7) Regeneration Strategy

Regenerate roadmap when any of these change:
- syllabus `versionHash`
- topic dependencies/priorities
- diagnostic resubmission
- confidence pattern shift
- selected plan type

This keeps plans stable but correctly adaptive on meaningful learner/syllabus changes.
