# 🏗️ AI School Platform - Model-Based Layered Architecture Reference

**Version**: 1.0  
**Status**: Architecture Blueprint (Ready for Implementation)  
**Last Updated**: March 22, 2026

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Layered Architecture](#layered-architecture)
3. [Model Design Reference](#model-design-reference)
4. [Repository Pattern](#repository-pattern)
5. [Service Layer](#service-layer)
6. [Controller/API Layer](#controllerapi-layer)
7. [Middleware & Guards](#middleware--guards)
8. [Implementation Examples](#implementation-examples)
9. [Refactoring Roadmap](#refactoring-roadmap)
10. [File Structure](#file-structure)

---

## Architecture Overview

### Core Principle
**Everything flows through models → repositories → services → controllers**

```
┌─────────────────────────────────────────────────────┐
│                 CLIENT (UI/Mobile)                  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│        MIDDLEWARE & GUARDS LAYER                    │
│  - Authentication (JWT)                             │
│  - Authorization (RBAC)                             │
│  - Tenant Isolation                                 │
│  - Request Validation                               │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      CONTROLLERS / API ROUTES LAYER                 │
│  - Request handlers                                 │
│  - Response formatting                              │
│  - Call services only                               │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│        BUSINESS LOGIC (SERVICES) LAYER              │
│  - Student service                                  │
│  - Learning service                                 │
│  - Assessment service                               │
│  - Payment service                                  │
│  - Engagement service                               │
│  - Multi-service orchestration                      │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│   DATA ACCESS LAYER (REPOSITORIES) LAYER            │
│  - Database queries                                 │
│  - Query optimization                               │
│  - No business logic                                │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│    MODELS LAYER (Data Schema & Types)               │
│  - Student                                          │
│  - Curriculum                                       │
│  - Assessment                                       │
│  - LearningPlan                                     │
│  - School (Tenant)                                  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              DATABASE LAYER                         │
│  - PostgreSQL                                       │
│  - Connection Pool                                  │
└─────────────────────────────────────────────────────┘
```

---

## Layered Architecture

### Layer 1: Models (Core Data Layer)

**Purpose**: Define entities, schema, types, and relationships

**Characteristics**:
- Pure data structures
- No logic
- Include validations
- Include relationships
- Include indexes
- Type-safe (TypeScript)

**Examples**:
```typescript
// models/Student.ts
export interface Student {
  id: string;
  school_id: string;        // Multi-tenant
  user_id: string;
  grade: number;
  interests: string[];
  learning_style: 'visual' | 'auditory' | 'kinesthetic';
  strengths: string[];
  weaknesses: string[];
  created_at: Date;
  updated_at: Date;
}

// models/Assessment.ts
export interface Assessment {
  id: string;
  school_id: string;        // Multi-tenant
  topic_id: string;
  questions: Question[];
  difficulty: number;       // 1-10
  time_limit_minutes: number;
  passing_score: number;
  created_at: Date;
  updated_at: Date;
}
```

**Models to Define/Refactor**:
1. Tenant (School)
2. User (base with roles)
3. Student
4. Teacher
5. Parent
6. Curriculum
7. Topic
8. Lesson
9. Quiz/Assessment
10. QuizAttempt/AssessmentResult
11. LearningPlan
12. EngagementSignal
13. Payment/Subscription
14. APIKey
15. AuditLog

---

### Layer 2: Repositories (Data Access Layer)

**Purpose**: Handle all database queries without business logic

**Characteristics**:
- Database-specific
- No business logic
- Parameterized queries (no SQL injection)
- Handle transactions
- Cache coordination
- Return raw data or DTOs

**Pattern**:
```typescript
// repositories/StudentRepository.ts
export interface IStudentRepository {
  findById(id: string, schoolId: string): Promise<Student>;
  findBySchoolId(schoolId: string): Promise<Student[]>;
  create(student: Student): Promise<Student>;
  update(id: string, schoolId: string, data: Partial<Student>): Promise<Student>;
  delete(id: string, schoolId: string): Promise<void>;
  findWithProgress(id: string, schoolId: string): Promise<StudentWithProgress>;
}

export class StudentRepository implements IStudentRepository {
  constructor(private db: Database) {}

  async findById(id: string, schoolId: string): Promise<Student> {
    const result = await this.db.query(
      'SELECT * FROM students WHERE id = $1 AND school_id = $2',
      [id, schoolId]
    );
    return result.rows[0];
  }

  async create(student: Student): Promise<Student> {
    const result = await this.db.query(
      `INSERT INTO students (id, school_id, user_id, grade, interests, learning_style, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [student.id, student.school_id, student.user_id, student.grade, 
       JSON.stringify(student.interests), student.learning_style]
    );
    return result.rows[0];
  }

  async findWithProgress(id: string, schoolId: string): Promise<StudentWithProgress> {
    const result = await this.db.query(
      `SELECT s.*, 
              JSON_AGG(JSON_BUILD_OBJECT('topic_id', rr.topic_id, 'mastery', rr.mastery)) as topics
       FROM students s
       LEFT JOIN recent_results rr ON s.id = rr.student_id
       WHERE s.id = $1 AND s.school_id = $2
       GROUP BY s.id`,
      [id, schoolId]
    );
    return result.rows[0];
  }
}
```

**Responsibilities**:
- CRUD operations
- Complex queries with JOINs
- Batch operations
- Search/filter operations
- Pagination
- Transactions (when coordinating multi-table updates)

---

### Layer 3: Services (Business Logic Layer)

**Purpose**: Encapsulate core application logic and workflows

**Characteristics**:
- Uses repositories to access data
- No direct database access
- Orchestrates business workflows
- Applies business rules
- Handles validation
- Coordinates multiple repositories
- Can use external services

**Pattern**:
```typescript
// services/StudentService.ts
export interface IStudentService {
  registerStudent(data: RegisterStudentInput): Promise<Student>;
  getStudentWithProgress(studentId: string, schoolId: string): Promise<StudentProfile>;
  updateStudentPreferences(studentId: string, schoolId: string, prefs: any): Promise<void>;
  calculateMasteryScore(studentId: string, topicId: string, schoolId: string): Promise<number>;
  getRecommendedTopics(studentId: string, schoolId: string): Promise<Topic[]>;
}

export class StudentService implements IStudentService {
  constructor(
    private studentRepo: IStudentRepository,
    private assessmentRepo: IAssessmentRepository,
    private curriculumRepo: ICurriculumRepository,
    private engagementService: IEngagementService
  ) {}

  async registerStudent(data: RegisterStudentInput): Promise<Student> {
    // Validate input
    if (!data.grade || data.grade < 1 || data.grade > 12) {
      throw new ValidationError('Invalid grade');
    }

    // Create student
    const student: Student = {
      id: generateId(),
      school_id: data.school_id,
      user_id: data.user_id,
      grade: data.grade,
      interests: data.interests || [],
      learning_style: data.learning_style || 'visual',
      strengths: [],
      weaknesses: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const created = await this.studentRepo.create(student);

    // Log engagement (student created)
    await this.engagementService.logEvent({
      school_id: data.school_id,
      student_id: created.id,
      event_type: 'STUDENT_REGISTERED',
      timestamp: new Date(),
    });

    return created;
  }

  async getStudentWithProgress(studentId: string, schoolId: string): Promise<StudentProfile> {
    const student = await this.studentRepo.findWithProgress(studentId, schoolId);
    
    // Calculate overall mastery
    const topics = await this.curriculumRepo.findTopicsByGrade(student.grade, schoolId);
    let totalMastery = 0;
    
    for (const topic of topics) {
      const mastery = await this.calculateMasteryScore(studentId, topic.id, schoolId);
      totalMastery += mastery;
    }

    return {
      ...student,
      overall_mastery: totalMastery / topics.length,
      recommendations: await this.getRecommendedTopics(studentId, schoolId),
    };
  }

  async calculateMasteryScore(studentId: string, topicId: string, schoolId: string): Promise<number> {
    const attempts = await this.assessmentRepo.findAttemptsByTopicAndStudent(
      studentId, topicId, schoolId
    );

    if (attempts.length === 0) return 0;

    // Simple algorithm: average of last 3 attempts, weighted by recency
    const recentAttempts = attempts.slice(-3);
    let score = 0;
    let weight = 0;

    recentAttempts.forEach((attempt, idx) => {
      const w = idx + 1; // Recency weight
      score += attempt.score * w;
      weight += w;
    });

    return Math.round((score / weight) * 100) / 100;
  }

  async getRecommendedTopics(studentId: string, schoolId: string): Promise<Topic[]> {
    const student = await this.studentRepo.findById(studentId, schoolId);
    const topics = await this.curriculumRepo.findTopicsByGrade(student.grade, schoolId);

    // Recommendation logic: Topics where mastery < 70%
    const recommended = [];
    for (const topic of topics) {
      const mastery = await this.calculateMasteryScore(studentId, topic.id, schoolId);
      if (mastery < 70) {
        recommended.push(topic);
      }
    }

    return recommended.sort((a, b) => a.name.localeCompare(b.name));
  }
}
```

**Service Types**:
1. **Core Domain Services** (StudentService, TeacherService, CurriculumService)
2. **Feature Services** (LearningEngineService, AssessmentService, EngagementService)
3. **Cross-Cutting Services** (PaymentService, NotificationService, AIService)
4. **Support Services** (ValidationService, CacheService, LoggerService)

---

### Layer 4: Controller/API Layer

**Purpose**: Handle HTTP requests and format responses

**Characteristics**:
- Minimal logic (call services)
- Request validation at entry
- Response formatting
- Status codes and error handling
- No database calls directly

**Pattern**:
```typescript
// app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/middleware/auth';
import { validateTenant } from '@/middleware/tenant';
import { StudentService } from '@/services/StudentService';
import { ValidationError, AuthorizationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get tenant context
    const schoolId = validateTenant(user, request);

    // 3. Validate authorization
    if (!['principal', 'saas_admin'].includes(user.role)) {
      throw new AuthorizationError('Only principals can register students');
    }

    // 4. Parse and validate input
    const data = await request.json();
    const validated = validateRegisterStudentInput(data);

    // 5. Call service
    const service = new StudentService(
      new StudentRepository(db),
      new AssessmentRepository(db),
      new CurriculumRepository(db),
      new EngagementService()
    );

    const student = await service.registerStudent({
      school_id: schoolId,
      ...validated,
    });

    // 6. Return response
    return NextResponse.json(
      { 
        success: true,
        data: student,
        message: 'Student registered successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    // Error handling
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Student registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const schoolId = validateTenant(user, request);

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('id');

    const service = new StudentService(
      new StudentRepository(db),
      new AssessmentRepository(db),
      new CurriculumRepository(db),
      new EngagementService()
    );

    if (studentId) {
      const student = await service.getStudentWithProgress(studentId, schoolId);
      return NextResponse.json({ success: true, data: student });
    }

    // List all students in school
    const students = await new StudentRepository(db).findBySchoolId(schoolId);
    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    // ... error handling
  }
}
```

**Responsibilities**:
- Parse requests
- Call ONE service method (not multiple for same operation)
- Format responses
- Handle HTTP status codes
- Log requests (audit)
- Catch and format errors

---

### Layer 5: Middleware & Guards

**Purpose**: Cross-cutting concerns (auth, authz, validation)

**Pattern**:
```typescript
// middleware/auth.ts
export async function verifyAuth(request: NextRequest): Promise<User | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded as User;
  } catch {
    return null;
  }
}

// middleware/tenant.ts
export function validateTenant(user: User, request: NextRequest): string {
  const schoolId = request.headers.get('x-school-id');
  
  if (!schoolId || !user.school_ids.includes(schoolId)) {
    throw new AuthorizationError('Access denied to this school');
  }

  return schoolId;
}

// middleware/authorization.ts
export function requireRole(...roles: string[]) {
  return (handler: Function) => {
    return async (request: NextRequest) => {
      const user = await verifyAuth(request);
      if (!user || !roles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
      return handler(request, user);
    };
  };
}
```

---

## Model Design Reference

### Core Models (Priority 1)

#### 1. School (Tenant)
```typescript
interface School {
  id: string;
  name: string;
  domain: string;
  tier: 'starter' | 'professional' | 'enterprise';
  subscription_status: 'active' | 'past_due' | 'cancelled';
  student_limit: number;
  teacher_limit: number;
  created_at: Date;
  updated_at: Date;
  // Billing
  stripe_customer_id?: string;
  monthly_price: number;
  renewal_date?: Date;
}

// Database schema
CREATE TABLE schools (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  tier VARCHAR(50) DEFAULT 'starter',
  subscription_status VARCHAR(50) DEFAULT 'active',
  student_limit INTEGER,
  teacher_limit INTEGER,
  stripe_customer_id VARCHAR(255),
  monthly_price DECIMAL(10,2),
  renewal_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. User (Base, Multi-Role)
```typescript
interface User {
  id: string;
  school_id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  role: 'saas_admin' | 'principal' | 'teacher' | 'student' | 'parent';
  school_ids: string[];  // For multi-school users
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

CREATE TABLE users (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  password_hash VARCHAR(255),
  role VARCHAR(50),
  school_ids UUID[] DEFAULT ARRAY[]::UUID[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);
```

#### 3. Student
```typescript
interface Student {
  id: string;
  school_id: string;
  user_id: string;
  grade: number;
  interests: string[];
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  strengths: string[];
  weaknesses: string[];
  diagnostic_score?: number;
  on_iep: boolean;
  on_504: boolean;
  created_at: Date;
  updated_at: Date;
}

CREATE TABLE students (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  user_id UUID NOT NULL,
  grade INTEGER,
  interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  learning_style VARCHAR(50),
  strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  weaknesses TEXT[] DEFAULT ARRAY[]::TEXT[],
  diagnostic_score DECIMAL(5,2),
  on_iep BOOLEAN DEFAULT false,
  on_504 BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_school_students (school_id),
  INDEX idx_grade_students (school_id, grade)
);
```

#### 4. Curriculum Hierarchy
```typescript
interface Curriculum {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  grade: number;
  created_at: Date;
}

interface Subject {
  id: string;
  school_id: string;
  curriculum_id: string;
  name: string; // e.g., "Mathematics", "Science"
  code: string; // e.g., "MATH-G5"
  created_at: Date;
}

interface Topic {
  id: string;
  school_id: string;
  subject_id: string;
  name: string; // e.g., "Fractions"
  difficulty: number; // 1-10
  prerequisites: string[]; // topic IDs
  objectives: string[]; // Learning objectives
  created_at: Date;
}

// Database schema
CREATE TABLE curriculums (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  name VARCHAR(255),
  description TEXT,
  grade INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  INDEX idx_school_curriculums (school_id)
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  curriculum_id UUID NOT NULL,
  name VARCHAR(255),
  code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (curriculum_id) REFERENCES curriculums(id),
  INDEX idx_school_subjects (school_id)
);

CREATE TABLE topics (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  name VARCHAR(255),
  difficulty INTEGER,
  prerequisites UUID[] DEFAULT ARRAY[]::UUID[],
  objectives TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  INDEX idx_school_topics (school_id),
  INDEX idx_difficulty (school_id, difficulty)
);
```

#### 5. Assessment & Results
```typescript
interface Assessment {
  id: string;
  school_id: string;
  topic_id: string;
  questions: Question[];
  difficulty: number; // 1-10
  time_limit_minutes: number;
  passing_score: number;
  created_at: Date;
}

interface AssessmentResult {
  id: string;
  school_id: string;
  assessment_id: string;
  student_id: string;
  score: number; // 0-100
  time_taken_seconds: number;
  completed_at: Date;
  answers: Answer[];
  created_at: Date;
}

CREATE TABLE assessments (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  topic_id UUID NOT NULL,
  questions JSONB NOT NULL,
  difficulty INTEGER,
  time_limit_minutes INTEGER,
  passing_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  INDEX idx_school_assessments (school_id)
);

CREATE TABLE assessment_results (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  assessment_id UUID NOT NULL,
  student_id UUID NOT NULL,
  score DECIMAL(5,2),
  time_taken_seconds INTEGER,
  completed_at TIMESTAMP,
  answers JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  INDEX idx_school_results (school_id),
  INDEX idx_student_results (school_id, student_id),
  INDEX idx_topic_results (school_id, assessment_id)
);
```

#### 6. Learning Plan
```typescript
interface LearningPlan {
  id: string;
  school_id: string;
  student_id: string;
  generated_at: Date;
  topics: TopicPlan[];
  adaptive_level: number; // 1-10, adjusts based on performance
  status: 'active' | 'completed' | 'archived';
  created_at: Date;
  updated_at: Date;
}

interface TopicPlan {
  topic_id: string;
  difficulty: number;
  estimated_hours: number;
  priority: number; // 1-10, highest first
  prerequisites_met: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
}

CREATE TABLE learning_plans (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  generated_at TIMESTAMP,
  topics JSONB,
  adaptive_level INTEGER,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  INDEX idx_school_plans (school_id),
  INDEX idx_student_plans (school_id, student_id)
);
```

## Repository Pattern

### Repository Interface Structure

```typescript
// repositories/types.ts
export interface IRepository<T> {
  findById(id: string, schoolId: string): Promise<T>;
  findAll(schoolId: string, options?: QueryOptions): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, schoolId: string, data: Partial<T>): Promise<T>;
  delete(id: string, schoolId: string): Promise<void>;
  count(schoolId: string, filters?: any): Promise<number>;
}

export interface QueryOptions {
  skip?: number;
  limit?: number;
  sort?: Record<string, 'asc' | 'desc'>;
  filters?: Record<string, any>;
}
```

### Concrete Repository Example

```typescript
// repositories/AssessmentRepository.ts
export interface IAssessmentRepository extends IRepository<Assessment> {
  findByTopic(topicId: string, schoolId: string): Promise<Assessment[]>;
  findAttempts(studentId: string, schoolId: string): Promise<AssessmentResult[]>;
  findAttemptsByTopic(studentId: string, topicId: string, schoolId: string): Promise<AssessmentResult[]>;
  recordAttempt(result: AssessmentResult): Promise<AssessmentResult>;
  getTopicMastery(studentId: string, topicId: string, schoolId: string): Promise<number>;
}

export class AssessmentRepository implements IAssessmentRepository {
  constructor(private db: Database) {}

  async findByTopic(topicId: string, schoolId: string): Promise<Assessment[]> {
    const result = await this.db.query(
      'SELECT * FROM assessments WHERE topic_id = $1 AND school_id = $2 ORDER BY created_at DESC',
      [topicId, schoolId]
    );
    return result.rows;
  }

  async getTopicMastery(studentId: string, topicId: string, schoolId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT AVG(score) as avg_score 
       FROM assessment_results 
       WHERE student_id = $1 AND school_id = $2 
         AND assessment_id IN (
           SELECT id FROM assessments WHERE topic_id = $3
         )
       ORDER BY completed_at DESC LIMIT 3`,
      [studentId, schoolId, topicId]
    );
    
    return result.rows[0]?.avg_score || 0;
  }

  async recordAttempt(result: AssessmentResult): Promise<AssessmentResult> {
    const created = await this.db.query(
      `INSERT INTO assessment_results 
       (id, school_id, assessment_id, student_id, score, time_taken_seconds, completed_at, answers, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
       RETURNING *`,
      [result.id, result.school_id, result.assessment_id, result.student_id, 
       result.score, result.time_taken_seconds, JSON.stringify(result.answers)]
    );
    return created.rows[0];
  }
}
```

## Service Layer

### Service Orchestration Example

```typescript
// services/LearningEngineService.ts
export interface ILearningEngineService {
  generateLearningPlan(studentId: string, schoolId: string): Promise<LearningPlan>;
  updateAdaptiveLevel(studentId: string, schoolId: string, performance: number): Promise<void>;
  getNextRecommendedTopic(studentId: string, schoolId: string): Promise<Topic>;
  logLearningEvent(event: LearningEvent): Promise<void>;
}

export class LearningEngineService implements ILearningEngineService {
  constructor(
    private studentRepo: IStudentRepository,
    private topicRepo: ITopicRepository,
    private assessmentRepo: IAssessmentRepository,
    private planRepo: ILearningPlanRepository,
    private engagementService: IEngagementService,
    private aiService: IAIService
  ) {}

  async generateLearningPlan(studentId: string, schoolId: string): Promise<LearningPlan> {
    // Get student profile
    const student = await this.studentRepo.findById(studentId, schoolId);
    
    // Get available topics for grade
    const topics = await this.topicRepo.findByGrade(student.grade, schoolId);

    // Get current mastery
    const masteryMap = new Map<string, number>();
    for (const topic of topics) {
      const mastery = await this.assessmentRepo.getTopicMastery(studentId, topic.id, schoolId);
      masteryMap.set(topic.id, mastery);
    }

    // Generate plan using AI
    const plan = await this.aiService.generatePersonalizedPlan({
      student,
      topics,
      masteryMap,
      learningStyle: student.learning_style,
      interests: student.interests,
    });

    // Store plan
    const saved = await this.planRepo.create(plan);

    // Log event
    await this.engagementService.logEvent({
      school_id: schoolId,
      student_id: studentId,
      event_type: 'LEARNING_PLAN_GENERATED',
      metadata: { plan_id: saved.id, topics_count: saved.topics.length },
      timestamp: new Date(),
    });

    return saved;
  }

  async getNextRecommendedTopic(studentId: string, schoolId: string): Promise<Topic> {
    const plan = await this.planRepo.findActiveByStudent(studentId, schoolId);
    
    if (!plan) {
      throw new Error('No active learning plan');
    }

    // Find first incomplete topic with prerequisites met
    for (const topicPlan of plan.topics) {
      if (topicPlan.status === 'not_started' && topicPlan.prerequisites_met) {
        return await this.topicRepo.findById(topicPlan.topic_id, schoolId);
      }
    }

    // All done
    throw new Error('No more topics to complete');
  }
}
```

## Controller/API Layer

### API Route with Full Pattern

```typescript
// app/api/students/learning-plan/route.ts
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await verifyAuth(request);
    if (!user) {
      return response.unauthorized();
    }

    // 2. Validate tenant
    const schoolId = validateTenant(user, request);

    // 3. Get service
    const service = serviceFactory.createLearningEngineService(schoolId);

    // 4. Call service
    const plan = await service.generateLearningPlan(user.id, schoolId);

    // 5. Return response
    return response.success(plan, 201);
  } catch (error) {
    return response.handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);

    const service = serviceFactory.createLearningEngineService(schoolId);
    const plan = await service.getActivePlan(user.id, schoolId);

    return response.success(plan);
  } catch (error) {
    return response.handleError(error);
  }
}
```

## Middleware & Guards

### Complete Middleware Stack

```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

export async function verifyAuth(request: NextRequest): Promise<User | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret) as User;
    return decoded;
  } catch (error) {
    return null;
  }
}

// middleware/authorization.ts
export function requireRole(...allowedRoles: string[]) {
  return async (user: User | null) => {
    if (!user || !allowedRoles.includes(user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }
  };
}

// middleware/tenant.ts
export function validateTenant(user: User, request: NextRequest): string {
  const schoolId = request.headers.get('x-school-id');
  
  if (!schoolId) {
    throw new ValidationError('School ID required in headers');
  }

  if (!user.school_ids.includes(schoolId)) {
    throw new AuthorizationError('Access denied to this school');
  }

  return schoolId;
}

// middleware/cache.ts
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await fn();
  await redis.setex(key, ttlSeconds, JSON.stringify(result));
  return result;
}
```

---

## Implementation Examples

### Example 1: Student Registration Feature

**Layer 1: Models**
```typescript
// models/Student.ts
interface Student {
  id: string;
  school_id: string;
  user_id: string;
  grade: number;
  interests: string[];
  learning_style: string;
  created_at: Date;
}

interface RegisterStudentInput {
  user_id: string;
  grade: number;
  interests?: string[];
  learning_style?: string;
}
```

**Layer 2: Repository**
```typescript
// repositories/StudentRepository.ts
class StudentRepository {
  async create(student: Student): Promise<Student> {
    const result = await db.query(
      `INSERT INTO students (...)
       VALUES (...) RETURNING *`,
      [...]
    );
    return result.rows[0];
  }

  async findById(id: string, schoolId: string): Promise<Student> {
    // Single source of truth for query
  }
}
```

**Layer 3: Service**
```typescript
// services/StudentService.ts
class StudentService {
  async registerStudent(input: RegisterStudentInput, schoolId: string): Promise<Student> {
    // Validate
    validate(input);

    // Create
    const student = await this.studentRepo.create({
      id: generateId(),
      school_id: schoolId,
      user_id: input.user_id,
      grade: input.grade,
      interests: input.interests || [],
      learning_style: input.learning_style || 'visual',
      created_at: new Date(),
    });

    // Side effects
    await this.engagementService.logEvent({ ... });

    return student;
  }
}
```

**Layer 4: Controller**
```typescript
// app/api/students/register/route.ts
export async function POST(request: NextRequest) {
  const user = await verifyAuth(request);
  const schoolId = validateTenant(user, request);

  const input = await request.json();
  const validated = validateInput(input);

  const service = new StudentService(studentRepo, engagementService);
  const student = await service.registerStudent(validated, schoolId);

  return NextResponse.json(student, { status: 201 });
}
```

---

## Refactoring Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create model interfaces for all entities
- [ ] Extract existing database queries into repositories
- [ ] Create repository interfaces
- [ ] Add input validation layer (Zod)

### Phase 2: Service Layer (Week 2)
- [ ] Implement IStudentService
- [ ] Implement ICurriculumService
- [ ] Implement IAssessmentService
- [ ] Implement ILearningEngineService
- [ ] Add dependency injection

### Phase 3: API Refactoring (Week 3)
- [ ] Refactor existing routes to use services
- [ ] Standardize error handling
- [ ] Add response formatting utilities
- [ ] Document all endpoints (OpenAPI)

### Phase 4: Missing Services (Week 4)
- [ ] Implement EngagementService (currently just table)
- [ ] Implement NotificationService
- [ ] Implement AnalyticsService
- [ ] Implement PaymentService

### Phase 5: Testing & Polish (Week 5)
- [ ] Add unit tests for services
- [ ] Add integration tests for API
- [ ] Add database migration tool
- [ ] Add APM/monitoring

---

## File Structure

```
lib/
├── models/
│   ├── Student.ts
│   ├── Curriculum.ts
│   ├── Assessment.ts
│   ├── LearningPlan.ts
│   ├── School.ts
│   ├── User.ts
│   ├── Payment.ts
│   └── types.ts
│
├── repositories/
│   ├── types.ts (IRepository interface)
│   ├── StudentRepository.ts
│   ├── CurriculumRepository.ts
│   ├── AssessmentRepository.ts
│   ├── LearningPlanRepository.ts
│   ├── PaymentRepository.ts
│   └── factory.ts
│
├── services/
│   ├── types.ts (IService interfaces)
│   ├── StudentService.ts
│   ├── CurriculumService.ts
│   ├── AssessmentService.ts
│   ├── LearningEngineService.ts
│   ├── EngagementService.ts
│   ├── NotificationService.ts
│   ├── PaymentService.ts
│   ├── AIService.ts
│   └── factory.ts
│
├── middleware/
│   ├── auth.ts
│   ├── authorization.ts
│   ├── tenant.ts
│   ├── cache.ts
│   └── errorHandler.ts
│
├── api/
│   └── utils.ts (response formatting)
│
└── utils/
    ├── validation.ts
    ├── errors.ts
    ├── logger.ts
    ├── idGenerator.ts
    └── secrets.ts

app/api/
├── auth/
│   └── route.ts
├── students/
│   ├── route.ts
│   ├── learning-plan/route.ts
│   └── progress/route.ts
├── assessments/
│   └── route.ts
├── curriculum/
│   └── route.ts
└── ...
```

---

## Next Steps

1. **Review this architecture** - Does it match your requirements?
2. **Start with Phase 1** - Create model interfaces
3. **Extract repositories** - Move DB queries into repository classes
4. **Implement services** - Move business logic upward
5. **Refactor controllers** - Use services instead of direct DB calls

This ensures all features follow the model-based, layered architecture consistently.

