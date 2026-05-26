# 🔄 Model-Based Architecture - Refactoring Playbook

**Purpose**: Transform the existing codebase into a clean model-based, layered architecture  
**Difficulty**: Medium  
**Estimated Time**: 3-4 weeks (5 phases)

---

## Quick Start Checklist

- [ ] Read Architecture Reference (ARCHITECTURE_REFERENCE.md)
- [ ] Create lib/models directory
- [ ] Create lib/repositories directory
- [ ] Create lib/services directory
- [ ] Start with Phase 1 (Models)
- [ ] Follow dependency flow: Models → Repos → Services → Controllers

---

## Phase 1: Create Model Layer (3-4 days)

### Goal
Define all data models as TypeScript interfaces with validation

### Step 1.1: Create Model Files

```bash
mkdir -p lib/models
touch lib/models/School.ts
touch lib/models/User.ts
touch lib/models/Student.ts
touch lib/models/Curriculum.ts
touch lib/models/Assessment.ts
touch lib/models/LearningPlan.ts
touch lib/models/Payment.ts
touch lib/models/types.ts
```

### Step 1.2: Implement School Model

**File**: `lib/models/School.ts`

```typescript
export interface School {
  id: string;
  name: string;
  domain: string;
  tier: 'starter' | 'professional' | 'enterprise';
  subscription_status: 'active' | 'past_due' | 'cancelled';
  student_limit: number;
  teacher_limit: number;
  stripe_customer_id?: string;
  monthly_price: number;
  renewal_date?: Date;
  created_at: Date;
  updated_at: Date;
}

// Database representation (already exists, just document it)
export const SchoolSchema = `
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_domain (domain),
  INDEX idx_tier (tier)
);
`;

// Validation
import { z } from 'zod';

export const SchoolValidation = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  tier: z.enum(['starter', 'professional', 'enterprise']),
  student_limit: z.number().min(1).max(10000),
  teacher_limit: z.number().min(1).max(1000),
});

export type CreateSchoolInput = z.infer<typeof SchoolValidation>;
```

### Step 1.3: Implement Student Model

**File**: `lib/models/Student.ts`

```typescript
export interface Student {
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

export const StudentSchema = `
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  user_id UUID NOT NULL REFERENCES users(id),
  grade INTEGER NOT NULL,
  interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  learning_style VARCHAR(50) DEFAULT 'visual',
  strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  weaknesses TEXT[] DEFAULT ARRAY[]::TEXT[],
  diagnostic_score DECIMAL(5,2),
  on_iep BOOLEAN DEFAULT false,
  on_504 BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_school_students (school_id),
  INDEX idx_grade_students (school_id, grade),
  INDEX idx_user_students (school_id, user_id)
);
`;

import { z } from 'zod';

export const StudentValidation = z.object({
  grade: z.number().min(1).max(12),
  interests: z.string().array().optional(),
  learning_style: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']).optional(),
  diagnostic_score: z.number().optional(),
  on_iep: z.boolean().optional(),
  on_504: z.boolean().optional(),
});

export type CreateStudentInput = z.infer<typeof StudentValidation>;
```

### Step 1.4: Implement Assessment Model

**File**: `lib/models/Assessment.ts`

```typescript
export interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'essay';
  options?: string[]; // For multiple choice
  correct_answer?: string | string[];
  points: number;
}

export interface Assessment {
  id: string;
  school_id: string;
  topic_id: string;
  questions: Question[];
  difficulty: number; // 1-10
  time_limit_minutes: number;
  passing_score: number; // 0-100
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentResult {
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

export interface Answer {
  question_id: string;
  student_answer: string;
  is_correct: boolean;
  points_earned: number;
}

export const AssessmentSchema = `
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  topic_id UUID NOT NULL REFERENCES topics(id),
  questions JSONB NOT NULL,
  difficulty INTEGER NOT NULL,
  time_limit_minutes INTEGER,
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_school_assessments (school_id),
  INDEX idx_topic_assessments (topic_id),
  INDEX idx_difficulty (difficulty)
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  student_id UUID NOT NULL REFERENCES students(id),
  score DECIMAL(5,2) NOT NULL,
  time_taken_seconds INTEGER,
  completed_at TIMESTAMP DEFAULT NOW(),
  answers JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_school_results (school_id),
  INDEX idx_student_results (student_id),
  INDEX idx_assessment_results (assessment_id),
  INDEX idx_completed (completed_at)
);
`;

import { z } from 'zod';

export const AssessmentValidation = z.object({
  topic_id: z.string().uuid(),
  questions: z.array(z.object({
    text: z.string(),
    type: z.enum(['multiple_choice', 'short_answer', 'essay']),
    options: z.string().array().optional(),
    points: z.number().min(1),
  })),
  difficulty: z.number().min(1).max(10),
  time_limit_minutes: z.number().optional(),
  passing_score: z.number().min(0).max(100).default(70),
});
```

### Step 1.5: Create Common Types File

**File**: `lib/models/types.ts`

```typescript
// Standard query options
export interface QueryOptions {
  skip?: number;
  limit?: number;
  sort?: Record<string, 'asc' | 'desc'>;
  filters?: Record<string, any>;
}

// Common response wrapper
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// Pagination
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// User roles
export type UserRole = 'saas_admin' | 'principal' | 'teacher' | 'student' | 'parent';

// Standard timestamps
export interface Timestamped {
  created_at: Date;
  updated_at: Date;
}

// Tenant-scoped
export interface TenantScoped {
  school_id: string;
}
```

---

## Phase 2: Create Repository Layer (4-5 days)

### Goal
Extract all database queries into repositories with consistent patterns

### Step 2.1: Create Base Repository Interface

**File**: `lib/repositories/types.ts`

```typescript
import { QueryOptions, PaginatedResult } from '@/lib/models/types';

export interface IRepository<T> {
  // Basic CRUD
  findById(id: string, schoolId: string): Promise<T | null>;
  findAll(schoolId: string, options?: QueryOptions): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, schoolId: string, data: Partial<T>): Promise<T>;
  delete(id: string, schoolId: string): Promise<void>;
  
  // Utility
  count(schoolId: string, filters?: any): Promise<number>;
  exists(id: string, schoolId: string): Promise<boolean>;
  
  // Batch operations
  createMany(entities: T[]): Promise<T[]>;
  updateMany(updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]>;
  deleteMany(ids: string[], schoolId: string): Promise<number>;
  
  // Pagination
  paginate(
    schoolId: string,
    page: number,
    pageSize: number,
    filters?: any
  ): Promise<PaginatedResult<T>>;
}
```

### Step 2.2: Create Student Repository

**File**: `lib/repositories/StudentRepository.ts`

```typescript
import { Student, CreateStudentInput } from '@/lib/models/Student';
import { IRepository, QueryOptions } from './types';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface IStudentRepository extends IRepository<Student> {
  findByGrade(grade: number, schoolId: string): Promise<Student[]>;
  findByUserId(userId: string, schoolId: string): Promise<Student | null>;
  findWithProgress(id: string, schoolId: string): Promise<StudentWithProgress | null>;
  findByInterests(interests: string[], schoolId: string): Promise<Student[]>;
}

export interface StudentWithProgress extends Student {
  overall_mastery: number;
  lessons_count: number;
  last_activity: Date;
}

export class StudentRepository implements IStudentRepository {
  async findById(id: string, schoolId: string): Promise<Student | null> {
    try {
      const result = await db.query(
        `SELECT * FROM students 
         WHERE id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('StudentRepository.findById failed', { id, schoolId, error });
      throw error;
    }
  }

  async findByUserId(userId: string, schoolId: string): Promise<Student | null> {
    try {
      const result = await db.query(
        `SELECT * FROM students 
         WHERE user_id = $1 AND school_id = $2`,
        [userId, schoolId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('StudentRepository.findByUserId failed', { userId, schoolId, error });
      throw error;
    }
  }

  async findAll(schoolId: string, options?: QueryOptions): Promise<Student[]> {
    try {
      let query = `SELECT * FROM students WHERE school_id = $1`;
      const params: any[] = [schoolId];
      let paramIndex = 2;

      // Apply filters
      if (options?.filters?.grade) {
        query += ` AND grade = $${paramIndex}`;
        params.push(options.filters.grade);
        paramIndex++;
      }

      if (options?.filters?.learning_style) {
        query += ` AND learning_style = $${paramIndex}`;
        params.push(options.filters.learning_style);
        paramIndex++;
      }

      // Apply sorting
      if (options?.sort) {
        const sortClauses = Object.entries(options.sort)
          .map(([field, direction]) => `${field} ${direction.toUpperCase()}`)
          .join(', ');
        query += ` ORDER BY ${sortClauses}`;
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      // Apply pagination
      if (options?.skip !== undefined) {
        query += ` OFFSET $${paramIndex}`;
        params.push(options.skip);
        paramIndex++;
      }

      if (options?.limit !== undefined) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('StudentRepository.findAll failed', { schoolId, options, error });
      throw error;
    }
  }

  async create(entity: Student): Promise<Student> {
    try {
      const result = await db.query(
        `INSERT INTO students (
          id, school_id, user_id, grade, interests, learning_style, 
          strengths, weaknesses, diagnostic_score, on_iep, on_504, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          entity.id,
          entity.school_id,
          entity.user_id,
          entity.grade,
          JSON.stringify(entity.interests),
          entity.learning_style,
          JSON.stringify(entity.strengths),
          JSON.stringify(entity.weaknesses),
          entity.diagnostic_score,
          entity.on_iep,
          entity.on_504,
        ]
      );

      logger.info('Student created', { id: entity.id });
      return result.rows[0];
    } catch (error) {
      logger.error('StudentRepository.create failed', { entity, error });
      throw error;
    }
  }

  async update(id: string, schoolId: string, data: Partial<Student>): Promise<Student> {
    try {
      const updates: string[] = [];
      const params: any[] = [id, schoolId];
      let paramIndex = 3;

      // Build dynamic update clause
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'school_id' && key !== 'created_at') {
          updates.push(`${key} = $${paramIndex}`);
          params.push(key === 'interests' || key === 'strengths' || key === 'weaknesses' 
            ? JSON.stringify(value) 
            : value);
          paramIndex++;
        }
      });

      updates.push('updated_at = NOW()');

      const result = await db.query(
        `UPDATE students 
         SET ${updates.join(', ')}
         WHERE id = $1 AND school_id = $2
         RETURNING *`,
        params
      );

      logger.info('Student updated', { id });
      return result.rows[0];
    } catch (error) {
      logger.error('StudentRepository.update failed', { id, schoolId, data, error });
      throw error;
    }
  }

  async delete(id: string, schoolId: string): Promise<void> {
    try {
      await db.query(
        `DELETE FROM students WHERE id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      logger.info('Student deleted', { id });
    } catch (error) {
      logger.error('StudentRepository.delete failed', { id, schoolId, error });
      throw error;
    }
  }

  async count(schoolId: string, filters?: any): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as count FROM students WHERE school_id = $1`;
      const params: any[] = [schoolId];
      let paramIndex = 2;

      if (filters?.grade) {
        query += ` AND grade = $${paramIndex}`;
        params.push(filters.grade);
        paramIndex++;
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('StudentRepository.count failed', { schoolId, filters, error });
      throw error;
    }
  }

  async exists(id: string, schoolId: string): Promise<boolean> {
    const student = await this.findById(id, schoolId);
    return student !== null;
  }

  async createMany(entities: Student[]): Promise<Student[]> {
    // Batch insert - more efficient for multiple records
    const promises = entities.map(e => this.create(e));
    return Promise.all(promises);
  }

  async updateMany(updates: Array<{ id: string; data: Partial<Student> }>): Promise<Student[]> {
    const promises = updates.map(u => 
      this.update(u.id, u.data.school_id!, u.data)
    );
    return Promise.all(promises);
  }

  async deleteMany(ids: string[], schoolId: string): Promise<number> {
    try {
      const result = await db.query(
        `DELETE FROM students WHERE id = ANY($1) AND school_id = $2`,
        [ids, schoolId]
      );
      logger.info('Students deleted', { count: ids.length });
      return ids.length;
    } catch (error) {
      logger.error('StudentRepository.deleteMany failed', { ids, schoolId, error });
      throw error;
    }
  }

  async paginate(
    schoolId: string,
    page: number,
    pageSize: number,
    filters?: any
  ): Promise<{ items: Student[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
    const skip = (page - 1) * pageSize;
    const total = await this.count(schoolId, filters);
    const items = await this.findAll(schoolId, {
      skip,
      limit: pageSize,
      filters,
      sort: { created_at: 'desc' },
    });

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    };
  }

  async findByGrade(grade: number, schoolId: string): Promise<Student[]> {
    return this.findAll(schoolId, {
      filters: { grade },
    });
  }

  async findByInterests(interests: string[], schoolId: string): Promise<Student[]> {
    try {
      const result = await db.query(
        `SELECT * FROM students 
         WHERE school_id = $1 
         AND interests && $2::text[]
         ORDER BY created_at DESC`,
        [schoolId, interests]
      );
      return result.rows;
    } catch (error) {
      logger.error('StudentRepository.findByInterests failed', { schoolId, interests, error });
      throw error;
    }
  }

  async findWithProgress(id: string, schoolId: string): Promise<StudentWithProgress | null> {
    try {
      const result = await db.query(
        `SELECT 
          s.*,
          ROUND(AVG(CAST(ar.score AS NUMERIC)), 2) as overall_mastery,
          COUNT(DISTINCT ar.id) as lessons_count,
          MAX(ar.completed_at) as last_activity
         FROM students s
         LEFT JOIN assessment_results ar ON s.id = ar.student_id
         WHERE s.id = $1 AND s.school_id = $2
         GROUP BY s.id`,
        [id, schoolId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('StudentRepository.findWithProgress failed', { id, schoolId, error });
      throw error;
    }
  }
}
```

### Step 2.3: Create Other Repositories

Create similar repositories for:
- `CurriculumRepository` (Curriculum, Subject, Topic)
- `AssessmentRepository` (Assessment, AssessmentResult)
- `SchoolRepository` (School)
- `UserRepository` (User - base class)
- `PaymentRepository` (Payment, Subscription, Invoice)
- `LearningPlanRepository` (LearningPlan)

**File**: `lib/repositories/factory.ts`

```typescript
import { StudentRepository } from './StudentRepository';
import { CurriculumRepository } from './CurriculumRepository';
import { AssessmentRepository } from './AssessmentRepository';
import { SchoolRepository } from './SchoolRepository';
import { PaymentRepository } from './PaymentRepository';
import { Database } from '@/lib/db';

export class RepositoryFactory {
  constructor(private db: Database) {}

  createStudentRepository() {
    return new StudentRepository(this.db);
  }

  createCurriculumRepository() {
    return new CurriculumRepository(this.db);
  }

  createAssessmentRepository() {
    return new AssessmentRepository(this.db);
  }

  createSchoolRepository() {
    return new SchoolRepository(this.db);
  }

  createPaymentRepository() {
    return new PaymentRepository(this.db);
  }
}
```

---

## Phase 3: Create Service Layer (5-7 days)

### Goal
Move all business logic from controllers/API into services

### Step 3.1: Create Base Service Types

**File**: `lib/services/types.ts`

```typescript
export interface IService {
  validate(input: any): void;
  authorize(user: any, resource: any): void;
}

export interface ServiceOptions {
  skipValidation?: boolean;
  skipAuthorization?: boolean;
  transaction?: any;
}
```

### Step 3.2: Create Student Service

**File**: `lib/services/StudentService.ts`

```typescript
import { Student, CreateStudentInput, StudentValidation } from '@/lib/models/Student';
import { IStudentRepository } from '@/lib/repositories/StudentRepository';
import { IEngagementService } from './EngagementService';
import { logger } from '@/lib/logger';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { generateId } from '@/lib/utils/idGenerator';

export interface IStudentService {
  // Student management
  registerStudent(input: CreateStudentInput, schoolId: string, userId: string): Promise<Student>;
  updateStudent(studentId: string, schoolId: string, data: Partial<Student>): Promise<Student>;
  getStudent(studentId: string, schoolId: string): Promise<Student>;
  getStudentsByGrade(grade: number, schoolId: string): Promise<Student[]>;
  getStudentsBySchool(schoolId: string, page?: number, pageSize?: number): Promise<any>;
  deleteStudent(studentId: string, schoolId: string): Promise<void>;

  // Progress tracking
  getStudentProgress(studentId: string, schoolId: string): Promise<any>;
  updateLearningPreferences(studentId: string, schoolId: string, prefs: any): Promise<void>;
  calculateMasteryScore(studentId: string, topicId: string, schoolId: string): Promise<number>;
}

export class StudentService implements IStudentService {
  constructor(
    private studentRepo: IStudentRepository,
    private engagementService: IEngagementService,
    private assessmentRepo: any // Will inject in Phase 3
  ) {}

  // Validation
  private validateInput(input: CreateStudentInput): void {
    try {
      StudentValidation.parse(input);
    } catch (error: any) {
      throw new ValidationError(`Student validation failed: ${error.message}`);
    }
  }

  // Authorization checks
  private validateTenant(schoolId: string, userId: string): void {
    // In real implementation, check if user belongs to school
    if (!schoolId || !userId) {
      throw new ValidationError('School ID and User ID required');
    }
  }

  async registerStudent(
    input: CreateStudentInput,
    schoolId: string,
    userId: string
  ): Promise<Student> {
    logger.info('Registering student', { schoolId, userId });

    // 1. Validate
    this.validateInput(input);
    this.validateTenant(schoolId, userId);

    // 2. Create student
    const student: Student = {
      id: generateId(),
      school_id: schoolId,
      user_id: userId,
      grade: input.grade,
      interests: input.interests || [],
      learning_style: input.learning_style || 'visual',
      strengths: [],
      weaknesses: [],
      diagnostic_score: 0,
      on_iep: input.on_iep || false,
      on_504: input.on_504 || false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const created = await this.studentRepo.create(student);

    // 3. Log engagement event
    await this.engagementService.logEvent({
      school_id: schoolId,
      student_id: created.id,
      event_type: 'STUDENT_REGISTERED',
      metadata: { grade: input.grade },
      timestamp: new Date(),
    });

    logger.info('Student registered successfully', { id: created.id });
    return created;
  }

  async updateStudent(
    studentId: string,
    schoolId: string,
    data: Partial<Student>
  ): Promise<Student> {
    logger.info('Updating student', { studentId, schoolId });

    // 1. Check student exists
    const student = await this.studentRepo.findById(studentId, schoolId);
    if (!student) {
      throw new NotFoundError(`Student ${studentId} not found`);
    }

    // 2. Update
    const updated = await this.studentRepo.update(studentId, schoolId, data);

    // 3. Log event
    await this.engagementService.logEvent({
      school_id: schoolId,
      student_id: studentId,
      event_type: 'STUDENT_UPDATED',
      metadata: { changed_fields: Object.keys(data) },
      timestamp: new Date(),
    });

    return updated;
  }

  async getStudent(studentId: string, schoolId: string): Promise<Student> {
    const student = await this.studentRepo.findById(studentId, schoolId);
    if (!student) {
      throw new NotFoundError(`Student ${studentId} not found`);
    }
    return student;
  }

  async getStudentsByGrade(grade: number, schoolId: string): Promise<Student[]> {
    return this.studentRepo.findByGrade(grade, schoolId);
  }

  async getStudentsBySchool(schoolId: string, page: number = 1, pageSize: number = 20): Promise<any> {
    return this.studentRepo.paginate(schoolId, page, pageSize);
  }

  async deleteStudent(studentId: string, schoolId: string): Promise<void> {
    logger.info('Deleting student', { studentId, schoolId });

    // Check exists
    const student = await this.studentRepo.findById(studentId, schoolId);
    if (!student) {
      throw new NotFoundError(`Student ${studentId} not found`);
    }

    // Delete
    await this.studentRepo.delete(studentId, schoolId);

    // Log event
    await this.engagementService.logEvent({
      school_id: schoolId,
      student_id: studentId,
      event_type: 'STUDENT_DELETED',
      timestamp: new Date(),
    });
  }

  async getStudentProgress(studentId: string, schoolId: string): Promise<any> {
    const student = await this.studentRepo.findWithProgress(studentId, schoolId);
    if (!student) {
      throw new NotFoundError(`Student not found`);
    }

    return {
      student: {
        id: student.id,
        name: `${student.user_id}`, // Would come from joined user table
        grade: student.grade,
      },
      progress: {
        overall_mastery: student.overall_mastery || 0,
        lessons_completed: student.lessons_count || 0,
        last_activity: student.last_activity,
      },
    };
  }

  async updateLearningPreferences(
    studentId: string,
    schoolId: string,
    prefs: { learning_style?: string; interests?: string[] }
  ): Promise<void> {
    await this.updateStudent(studentId, schoolId, {
      learning_style: (prefs.learning_style as any) || undefined,
      interests: prefs.interests || undefined,
    });

    logger.info('Learning preferences updated', { studentId });
  }

  async calculateMasteryScore(
    studentId: string,
    topicId: string,
    schoolId: string
  ): Promise<number> {
    // Get recent assessment results for topic
    const results = await this.assessmentRepo.findTopicResults(studentId, topicId, schoolId);

    if (results.length === 0) return 0;

    // Average of last 3 attempts, weighted by recency
    const recent = results.slice(-3);
    let totalScore = 0;
    let totalWeight = 0;

    recent.forEach((result, idx) => {
      const weight = idx + 1;
      totalScore += result.score * weight;
      totalWeight += weight;
    });

    return Math.round((totalScore / totalWeight) * 100) / 100;
  }
}
```

### Step 3.3: Create Assessment Service

**File**: `lib/services/AssessmentService.ts`

```typescript
import { 
  Assessment, 
  AssessmentResult, 
  AssessmentValidation 
} from '@/lib/models/Assessment';
import { IAssessmentRepository } from '@/lib/repositories/AssessmentRepository';
import { logger } from '@/lib/logger';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { generateId } from '@/lib/utils/idGenerator';

export interface IAssessmentService {
  createAssessment(input: any, schoolId: string): Promise<Assessment>;
  getAssessment(assessmentId: string, schoolId: string): Promise<Assessment>;
  submitAssessment(
    assessmentId: string,
    studentId: string,
    schoolId: string,
    answers: any
  ): Promise<AssessmentResult>;
  getStudentResults(studentId: string, schoolId: string): Promise<AssessmentResult[]>;
  getTopicAssessments(topicId: string, schoolId: string): Promise<Assessment[]>;
  calculateScore(assessment: Assessment, answers: any): number;
}

export class AssessmentService implements IAssessmentService {
  constructor(
    private assessmentRepo: IAssessmentRepository,
    private engagementService: any // Will inject in Phase 3
  ) {}

  async createAssessment(input: any, schoolId: string): Promise<Assessment> {
    logger.info('Creating assessment', { schoolId });

    // Validate
    AssessmentValidation.parse(input);

    const assessment: Assessment = {
      id: generateId(),
      school_id: schoolId,
      topic_id: input.topic_id,
      questions: input.questions,
      difficulty: input.difficulty,
      time_limit_minutes: input.time_limit_minutes || 30,
      passing_score: input.passing_score || 70,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const created = await this.assessmentRepo.create(assessment);

    logger.info('Assessment created', { id: created.id });
    return created;
  }

  async getAssessment(assessmentId: string, schoolId: string): Promise<Assessment> {
    const assessment = await this.assessmentRepo.findById(assessmentId, schoolId);
    if (!assessment) {
      throw new NotFoundError(`Assessment ${assessmentId} not found`);
    }
    return assessment;
  }

  async submitAssessment(
    assessmentId: string,
    studentId: string,
    schoolId: string,
    answers: any
  ): Promise<AssessmentResult> {
    logger.info('Submitting assessment', { assessmentId, studentId });

    // Get assessment
    const assessment = await this.getAssessment(assessmentId, schoolId);

    // Calculate score
    const score = this.calculateScore(assessment, answers);
    const passed = score >= assessment.passing_score;

    // Create result
    const result: AssessmentResult = {
      id: generateId(),
      school_id: schoolId,
      assessment_id: assessmentId,
      student_id: studentId,
      score,
      time_taken_seconds: 0, // Would come from frontend
      completed_at: new Date(),
      answers: answers,
      created_at: new Date(),
    };

    const created = await this.assessmentRepo.createResult(result);

    // Log event
    await this.engagementService.logEvent({
      school_id: schoolId,
      student_id: studentId,
      event_type: 'ASSESSMENT_COMPLETED',
      metadata: {
        assessment_id: assessmentId,
        score,
        passed,
      },
      timestamp: new Date(),
    });

    logger.info('Assessment submitted', { resultId: created.id, score, passed });
    return created;
  }

  async getStudentResults(studentId: string, schoolId: string): Promise<AssessmentResult[]> {
    return this.assessmentRepo.findResultsByStudent(studentId, schoolId);
  }

  async getTopicAssessments(topicId: string, schoolId: string): Promise<Assessment[]> {
    return this.assessmentRepo.findByTopic(topicId, schoolId);
  }

  calculateScore(assessment: Assessment, answers: any): number {
    let totalPoints = 0;
    let earnedPoints = 0;

    assessment.questions.forEach((question) => {
      totalPoints += question.points;

      const studentAnswer = answers[question.id];
      const isCorrect = this.checkAnswer(question, studentAnswer);

      if (isCorrect) {
        earnedPoints += question.points;
      }
    });

    return Math.round((earnedPoints / totalPoints) * 100);
  }

  private checkAnswer(question: any, answer: string): boolean {
    // Simple implementation - in production would be more sophisticated
    return question.correct_answer === answer;
  }
}
```

### Step 3.4: Create Learning Engine Service

**File**: `lib/services/LearningEngineService.ts`

```typescript
import { LearningPlan } from '@/lib/models/LearningPlan';
import { IStudentRepository } from '@/lib/repositories/StudentRepository';
import { ICurriculumRepository } from '@/lib/repositories/CurriculumRepository';
import { IAssessmentRepository } from '@/lib/repositories/AssessmentRepository';
import { ILearningPlanRepository } from '@/lib/repositories/LearningPlanRepository';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils/idGenerator';

export interface ILearningEngineService {
  generateLearningPlan(studentId: string, schoolId: string): Promise<LearningPlan>;
  updateAdaptiveLevel(studentId: string, schoolId: string, performance: number): Promise<void>;
  getNextRecommendedTopic(studentId: string, schoolId: string): Promise<any>;
  updatePlanProgress(studentId: string, schoolId: string, topicId: string): Promise<void>;
}

export class LearningEngineService implements ILearningEngineService {
  constructor(
    private studentRepo: IStudentRepository,
    private curriculumRepo: ICurriculumRepository,
    private assessmentRepo: IAssessmentRepository,
    private planRepo: ILearningPlanRepository,
    private engagementService: any, // Will inject in Phase 3
    private aiService: any // LearnAI AI service
  ) {}

  async generateLearningPlan(studentId: string, schoolId: string): Promise<LearningPlan> {
    logger.info('Generating learning plan', { studentId, schoolId });

    // 1. Get student profile
    const student = await this.studentRepo.findById(studentId, schoolId);
    if (!student) throw new Error('Student not found');

    // 2. Get curriculum for grade
    const topics = await this.curriculumRepo.findByGrade(student.grade, schoolId);

    // 3. Get current mastery for each topic
    const masteryMap = new Map<string, number>();
    for (const topic of topics) {
      const mastery = await this.assessmentRepo.getTopicMastery(studentId, topic.id, schoolId);
      masteryMap.set(topic.id, mastery);
    }

    // 4. Generate personalized plan using AI
    const planTopics = await this.aiService.generateAdaptivePlan({
      student,
      topics,
      masteryMap,
      learningStyle: student.learning_style,
      interests: student.interests,
    });

    // 5. Save plan
    const plan: LearningPlan = {
      id: generateId(),
      school_id: schoolId,
      student_id: studentId,
      generated_at: new Date(),
      topics: planTopics,
      adaptive_level: 5, // Start at medium
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const created = await this.planRepo.create(plan);

    // 6. Log event
    await this.engagementService.logEvent({
      school_id: schoolId,
      student_id: studentId,
      event_type: 'LEARNING_PLAN_GENERATED',
      metadata: { plan_id: created.id, topics: planTopics.length },
      timestamp: new Date(),
    });

    logger.info('Learning plan generated', { planId: created.id, topics: planTopics.length });
    return created;
  }

  async updateAdaptiveLevel(
    studentId: string,
    schoolId: string,
    performance: number
  ): Promise<void> {
    // Get active plan
    const plan = await this.planRepo.findActiveByStudent(studentId, schoolId);
    if (!plan) return;

    // Calculate new adaptive level
    // If performance > 80%, increase difficulty
    // If performance < 50%, decrease difficulty
    const currentLevel = plan.adaptive_level;
    const newLevel = performance > 80
      ? Math.min(10, currentLevel + 1)
      : performance < 50
        ? Math.max(1, currentLevel - 1)
        : currentLevel;

    if (newLevel !== currentLevel) {
      await this.planRepo.updateAdaptiveLevel(plan.id, schoolId, newLevel);
      logger.info('Adaptive level updated', { studentId, from: currentLevel, to: newLevel });
    }
  }

  async getNextRecommendedTopic(studentId: string, schoolId: string): Promise<any> {
    const plan = await this.planRepo.findActiveByStudent(studentId, schoolId);
    if (!plan) {
      throw new Error('No active learning plan');
    }

    // Find first incomplete topic with met prerequisites
    for (const topicPlan of plan.topics) {
      if (topicPlan.status === 'not_started' && topicPlan.prerequisites_met) {
        const topic = await this.curriculumRepo.findById(topicPlan.topic_id, schoolId);
        return topic;
      }
    }

    // All done or prerequisites not met
    throw new Error('No more topics available');
  }

  async updatePlanProgress(
    studentId: string,
    schoolId: string,
    topicId: string
  ): Promise<void> {
    const plan = await this.planRepo.findActiveByStudent(studentId, schoolId);
    if (!plan) return;

    // Update topic status
    const updatedTopics = plan.topics.map(t =>
      t.topic_id === topicId ? { ...t, status: 'completed' as const } : t
    );

    await this.planRepo.updateTopics(plan.id, schoolId, updatedTopics);

    logger.info('Plan progress updated', { studentId, topicId });
  }
}
```

### Step 3.5: Create Service Factory

**File**: `lib/services/factory.ts`

```typescript
import { Database } from '@/lib/db';
import { RepositoryFactory } from '@/lib/repositories/factory';
import { StudentService } from './StudentService';
import { AssessmentService } from './AssessmentService';
import { LearningEngineService } from './LearningEngineService';
import { CurriculumService } from './CurriculumService';
import { PaymentService } from './PaymentService';
import { EngagementService } from './EngagementService';
import { AIService } from './AIService';

export class ServiceFactory {
  private repoFactory: RepositoryFactory;

  constructor(private db: Database) {
    this.repoFactory = new RepositoryFactory(db);
  }

  createStudentService(): StudentService {
    return new StudentService(
      this.repoFactory.createStudentRepository(),
      this.createEngagementService()
    );
  }

  createAssessmentService(): AssessmentService {
    return new AssessmentService(
      this.repoFactory.createAssessmentRepository(),
      this.createEngagementService()
    );
  }

  createLearningEngineService(): LearningEngineService {
    return new LearningEngineService(
      this.repoFactory.createStudentRepository(),
      this.repoFactory.createCurriculumRepository(),
      this.repoFactory.createAssessmentRepository(),
      this.repoFactory.createLearningPlanRepository(),
      this.createEngagementService(),
      new AIService() // LearnAI AI
    );
  }

  createCurriculumService(): CurriculumService {
    return new CurriculumService(
      this.repoFactory.createCurriculumRepository()
    );
  }

  createPaymentService(): PaymentService {
    return new PaymentService(
      this.repoFactory.createPaymentRepository(),
      this.createEngagementService()
    );
  }

  createEngagementService(): EngagementService {
    return new EngagementService(
      this.repoFactory.createEngagementRepository()
    );
  }
}
```

---

## Phase 4: Refactor API Controllers (5-6 days)

###Goal
Replace direct database calls with service calls

### Step 4.1: Refactor Student Registration API

**Before (Current)**:
```typescript
// app/api/students/route.ts
export async function POST(request: NextRequest) {
  const { school_id, user_id, grade, interests } = await request.json();
  
  const result = await db.query(
    'INSERT INTO students (id, school_id, user_id, grade, interests, created_at) VALUES (...)',
    [id, school_id, user_id, grade, JSON.stringify(interests), new Date()]
  );
  
  return NextResponse.json(result.rows[0]);
}
```

**After (Model-Based)**:
```typescript
// app/api/students/route.ts
import { ServiceFactory } from '@/lib/services/factory';
import { verifyAuth } from '@/middleware/auth';
import { validateTenant } from '@/middleware/tenant';
import { response } from '@/lib/api/utils';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    // 2. Validate tenant
    const schoolId = validateTenant(user, request);

    // 3. Parse & validate input
    const data = await request.json();
    const input = {
      grade: data.grade,
      interests: data.interests,
      learning_style: data.learning_style,
      on_iep: data.on_iep,
      on_504: data.on_504,
    };

    // 4. Use service
    const factory = new ServiceFactory(db);
    const service = factory.createStudentService();
    const student = await service.registerStudent(input, schoolId, user.id);

    // 5. Return response
    return response.created(student);
  } catch (error) {
    return response.handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const factory = new ServiceFactory(db);
    const service = factory.createStudentService();
    const result = await service.getStudentsBySchool(schoolId, page, pageSize);

    return response.success(result);
  } catch (error) {
    return response.handleError(error);
  }
}
```

### Step 4.2: Create Response Utility

**File**: `lib/api/utils.ts`

```typescript
import { NextResponse } from 'next/server';
import { ValidationError, AuthorizationError, NotFoundError } from '@/lib/errors';

export class ApiResponse {
  static success<T>(data: T, status = 200) {
    return NextResponse.json(
      { success: true, data, timestamp: new Date() },
      { status }
    );
  }

  static created<T>(data: T) {
    return this.success(data, 201);
  }

  static unauthorized() {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  static forbidden() {
    return NextResponse.json(
      { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  static notFound(message = 'Resource not found') {
    return NextResponse.json(
      { success: false, error: message, code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  static badRequest(message: string) {
    return NextResponse.json(
      { success: false, error: message, code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  static handleError(error: any) {
    console.error('API Error:', error);

    if (error instanceof ValidationError) {
      return this.badRequest(error.message);
    }

    if (error instanceof AuthorizationError) {
      return this.forbidden();
    }

    if (error instanceof NotFoundError) {
      return this.notFound(error.message);
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const response = ApiResponse;
```

---

## Checklist for Each Feature

When implementing a new feature, follow this checklist:

**Step 1: Model Design** ✅
- [ ] Define interface in `lib/models/`
- [ ] Add validation rules (Zod)
- [ ] Add database schema
- [ ] Add to database migrations

**Step 2: Repository** ✅
- [ ] Create repository interface in `lib/repositories/types.ts`
- [ ] Implement repository class
- [ ] Add to factory
- [ ] Write queries for all operations
- [ ] Test with Database

**Step 3: Service** ✅
- [ ] Define service interface
- [ ] Implement service class
- [ ] Add validation
- [ ] Add authorization
- [ ] Add logging
- [ ] Add engagement events
- [ ] Add to factory

**Step 4: Controller/API** ✅
- [ ] Create route handler
- [ ] Add authentication
- [ ] Add authorization
- [ ] Call ONE service method (not multiple for same operation)
- [ ] Format response
- [ ] Handle errors

**Step 5: Testing** ✅
- [ ] Unit test service
- [ ] Integration test API
- [ ] Test error cases
- [ ] Test authorization

**Step 6: Documentation** ✅
- [ ] Document API endpoint
- [ ] Document service methods
- [ ] Add code comments
- [ ] Add examples

---

## Success Criteria

When done, you should have:

✅ All database queries in repositories (not controllers)  
✅ All business logic in services (not controllers)  
✅ All models clearly defined  
✅ All APIs use services  
✅ Multi-tenant isolation enforced  
✅ Consistent error handling  
✅ Audit logging  
✅ Unit and integration tests  
✅ Clean dependency flow  
✅ Easy to test (mockable services)  

---

## Timeline

- **Week 1** (Phase 1-2): Models + Repositories = 25% done
- **Week 2** (Phase 3): Services = 50% done
- **Week 3** (Phase 4): API Refactoring = 75% done
- **Week 4** (Phase 5): Testing + Docs = 100% done

---

## Questions?

- Start with ONE feature completely (e.g., Student Management)
- Follow the 6-step checklist strictly
- Don't skip layers
- Test after each phase
