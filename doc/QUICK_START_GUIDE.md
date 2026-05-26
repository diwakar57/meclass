# 🚀 Model-Based Architecture - Quick Start Guide

**Purpose**: Get started implementing features using clean, model-based architecture  
**Time to Read**: 10-15 minutes  
**Time to Implement First Feature**: 2-3 days  
**Complexity**: Medium

---

## What You'll Learn

✅ How to structure code models-first  
✅ When to create repositories  
✅ How to write scalable services  
✅ How to connect APIs to services  
✅ How to avoid tight coupling  
✅ How to make code testable  

---

## The Three Core Rules

### Rule 1: Models Drive Everything
```typescript
// ❌ WRONG: Logic embedded in database query
const students = db.query(
  "SELECT s.* FROM students s 
   WHERE s.grade = $1 AND 
         ARRAY_LENGTH(s.strengths, 1) > 0"
);

// ✅ RIGHT: Model defined, logic in service
interface Student {
  id: string;
  grade: number;
  strengths: string[];
}

// Then service has the query logic
const students = studentRepo.findByGradeWithStrengths(grade);
```

### Rule 2: Repositories Hide Database Details
```typescript
// ❌ WRONG: Database query in controller
export async function GET(req) {
  const students = await db.query(
    "SELECT * FROM students WHERE school_id = $1",
    [schoolId]
  );
  return students;
}

// ✅ RIGHT: Repository handles the query
export async function GET(req) {
  const students = await studentRepo.findBySchool(schoolId);
  return students;
}
```

### Rule 3: Services Own the Logic
```typescript
// ❌ WRONG: Business logic in controller
export async function POST(req) {
  const mastery = scores.reduce((a,b) => a+b) / scores.length;
  if (mastery > 70) notify = true;
  await db.update(...);
  return { mastery, notify };
}

// ✅ RIGHT: Business logic in service
export async function POST(req) {
  const result = await learningService.completeTopic(studentId);
  return result;
}

// Service has the logic
async completeTopic(studentId) {
  const mastery = this.calculateMastery(studentId);
  if (mastery > 70) {
    await this.engagementService.notifyStudent(studentId);
  }
  return mastery;
}
```

---

## Checklist for Every Feature

Copy this checklist for each feature you build:

### ☐ Step 1: Define Models (30 minutes)

```typescript
// lib/models/YourResource.ts

// 1. Define the interface
export interface YourResource {
  id: string;
  school_id: string;  // ← Multi-tenant!
  name: string;
  // ... other fields
  created_at: Date;   // ← Always include timestamps!
  updated_at: Date;
}

// 2. Add validation
import { z } from 'zod';
export const YourResourceValidation = z.object({
  name: z.string().min(1).max(255),
  // ... validate each field
});
export type CreateYourResourceInput = z.infer<typeof YourResourceValidation>;

// 3. Write database schema
export const YourResourceSchema = `
  CREATE TABLE your_resources (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_school (school_id)
  );
`;
```

### ☐ Step 2: Create Repository (60 minutes)

```typescript
// lib/repositories/YourResourceRepository.ts

// 1. Define interface
export interface IYourResourceRepository extends IRepository<YourResource> {
  // Custom query methods here
  findByName(name: string, schoolId: string): Promise<YourResource | null>;
  findActiveBySchool(schoolId: string): Promise<YourResource[]>;
}

// 2. Implement
export class YourResourceRepository implements IYourResourceRepository {
  async findById(id: string, schoolId: string): Promise<YourResource | null> {
    const result = await this.db.query(
      'SELECT * FROM your_resources WHERE id = $1 AND school_id = $2',
      [id, schoolId]
    );
    return result.rows[0] || null;
  }

  // Implement all IRepository methods
  async create(entity: YourResource): Promise<YourResource> {
    // Insert into database
  }

  // etc...

  // Add custom queries
  async findByName(name: string, schoolId: string): Promise<YourResource | null> {
    // Query logic
  }
}

// 3. Add to factory
export class RepositoryFactory {
  createYourResourceRepository() {
    return new YourResourceRepository(this.db);
  }
}
```

### ☐ Step 3: Create Service (90 minutes)

```typescript
// lib/services/YourResourceService.ts

// 1. Define interface
export interface IYourResourceService {
  create(input: CreateYourResourceInput, schoolId: string): Promise<YourResource>;
  getById(id: string, schoolId: string): Promise<YourResource>;
  update(id: string, schoolId: string, data: Partial<YourResource>): Promise<YourResource>;
  delete(id: string, schoolId: string): Promise<void>;
  // Custom methods
  doSomethingSpecial(id: string, schoolId: string): Promise<any>;
}

// 2. Implement
export class YourResourceService implements IYourResourceService {
  constructor(
    private repo: IYourResourceRepository,
    private engagementService: IEngagementService
  ) {}

  async create(input: CreateYourResourceInput, schoolId: string): Promise<YourResource> {
    // 1. Validate
    this.validateInput(input);

    // 2. Create entity
    const entity: YourResource = {
      id: generateId(),
      school_id: schoolId,
      ...input,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // 3. Save
    const created = await this.repo.create(entity);

    // 4. Side effects (log event, etc)
    await this.engagementService.logEvent({
      school_id: schoolId,
      event_type: 'YOUR_RESOURCE_CREATED',
      metadata: { resource_id: created.id },
      timestamp: new Date(),
    });

    return created;
  }

  async getById(id: string, schoolId: string): Promise<YourResource> {
    const resource = await this.repo.findById(id, schoolId);
    if (!resource) {
      throw new NotFoundError(`Resource ${id} not found`);
    }
    return resource;
  }

  async update(id: string, schoolId: string, data: Partial<YourResource>): Promise<YourResource> {
    // Check exists
    await this.getById(id, schoolId);

    // Update
    const updated = await this.repo.update(id, schoolId, data);

    // Log event
    await this.engagementService.logEvent({
      school_id: schoolId,
      event_type: 'YOUR_RESOURCE_UPDATED',
      metadata: { resource_id: id, changed: Object.keys(data) },
      timestamp: new Date(),
    });

    return updated;
  }

  async delete(id: string, schoolId: string): Promise<void> {
    // Check exists
    await this.getById(id, schoolId);

    // Delete
    await this.repo.delete(id, schoolId);

    // Log event
    await this.engagementService.logEvent({
      school_id: schoolId,
      event_type: 'YOUR_RESOURCE_DELETED',
      metadata: { resource_id: id },
      timestamp: new Date(),
    });
  }

  async doSomethingSpecial(id: string, schoolId: string): Promise<any> {
    const resource = await this.getById(id, schoolId);
    // Business logic here
    return { /* result */ };
  }

  private validateInput(input: CreateYourResourceInput): void {
    try {
      YourResourceValidation.parse(input);
    } catch (error: any) {
      throw new ValidationError(`Validation failed: ${error.message}`);
    }
  }
}

// 3. Add to factory
export class ServiceFactory {
  createYourResourceService(): IYourResourceService {
    return new YourResourceService(
      this.repoFactory.createYourResourceRepository(),
      this.createEngagementService()
    );
  }
}
```

### ☐ Step 4: Create API Controller (45 minutes)

```typescript
// app/api/your-resources/route.ts

import { NextRequest } from 'next/server';
import { verifyAuth } from '@/middleware/auth';
import { validateTenant } from '@/middleware/tenant';
import { response } from '@/lib/api/utils';
import { ServiceFactory } from '@/lib/services/factory';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    // 2. Tenant
    const schoolId = validateTenant(user, request);

    // 3. Parse & validate
    const body = await request.json();
    const input = YourResourceValidation.parse(body);

    // 4. Service
    const factory = new ServiceFactory(db);
    const service = factory.createYourResourceService();

    // 5. Call service (just one method!)
    const resource = await service.create(input, schoolId);

    // 6. Return
    return response.created(resource);
  } catch (error) {
    return response.handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);

    const factory = new ServiceFactory(db);
    const service = factory.createYourResourceService();

    // Pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const result = await service.getBySchool(schoolId, page, pageSize);

    return response.success(result);
  } catch (error) {
    return response.handleError(error);
  }
}

// Specific resource operations
// app/api/your-resources/[id]/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);

    const factory = new ServiceFactory(db);
    const service = factory.createYourResourceService();

    const resource = await service.getById(params.id, schoolId);

    return response.success(resource);
  } catch (error) {
    return response.handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);

    const body = await request.json();

    const factory = new ServiceFactory(db);
    const service = factory.createYourResourceService();

    const resource = await service.update(params.id, schoolId, body);

    return response.success(resource);
  } catch (error) {
    return response.handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);

    const factory = new ServiceFactory(db);
    const service = factory.createYourResourceService();

    await service.delete(params.id, schoolId);

    return response.success({ message: 'Deleted' });
  } catch (error) {
    return response.handleError(error);
  }
}
```

### ☐ Step 5: Add Tests (60 minutes)

```typescript
// __tests__/services/YourResourceService.test.ts

import { YourResourceService } from '@/lib/services/YourResourceService';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('YourResourceService', () => {
  let service: YourResourceService;
  let mockRepo: any;
  let mockEngagement: any;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockEngagement = {
      logEvent: jest.fn(),
    };

    service = new YourResourceService(mockRepo, mockEngagement);
  });

  it('should create resource', async () => {
    const input = { name: 'Test' };
    const created = { id: '123', ...input, school_id: 'school-1' };
    mockRepo.create.mockResolvedValue(created);

    const result = await service.create(input, 'school-1');

    expect(result.id).toBe('123');
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockEngagement.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'YOUR_RESOURCE_CREATED' })
    );
  });

  it('should throw NotFoundError if not exists', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      service.update('123', 'school-1', { name: 'Updated' })
    ).rejects.toThrow('not found');
  });
});
```

---

## Real-World Example: Add a "Favorite Subject" Feature

### Models
```typescript
// lib/models/FavoriteSubject.ts
export interface FavoriteSubject {
  id: string;
  school_id: string;
  student_id: string;
  subject_id: string;
  created_at: Date;
}
```

### Repository
```typescript
// lib/repositories/FavoriteSubjectRepository.ts
export interface IFavoriteSubjectRepository extends IRepository<FavoriteSubject> {
  findByStudent(studentId: string, schoolId: string): Promise<FavoriteSubject[]>;
  isFavorited(studentId: string, subjectId: string, schoolId: string): Promise<boolean>;
}

export class FavoriteSubjectRepository implements IFavoriteSubjectRepository {
  async findByStudent(studentId: string, schoolId: string): Promise<FavoriteSubject[]> {
    const result = await this.db.query(
      `SELECT * FROM favorite_subjects 
       WHERE student_id = $1 AND school_id = $2`,
      [studentId, schoolId]
    );
    return result.rows;
  }

  async isFavorited(studentId: string, subjectId: string, schoolId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM favorite_subjects 
       WHERE student_id = $1 AND subject_id = $2 AND school_id = $3`,
      [studentId, subjectId, schoolId]
    );
    return result.rows.length > 0;
  }
  // ... other methods
}
```

### Service
```typescript
// lib/services/FavoriteSubjectService.ts
export interface IFavoriteSubjectService {
  addFavorite(studentId: string, subjectId: string, schoolId: string): Promise<FavoriteSubject>;
  removeFavorite(studentId: string, subjectId: string, schoolId: string): Promise<void>;
  getFavorites(studentId: string, schoolId: string): Promise<FavoriteSubject[]>;
  isFavorite(studentId: string, subjectId: string, schoolId: string): Promise<boolean>;
}

export class FavoriteSubjectService implements IFavoriteSubjectService {
  constructor(
    private repo: IFavoriteSubjectRepository,
    private engagementService: IEngagementService
  ) {}

  async addFavorite(studentId: string, subjectId: string, schoolId: string): Promise<FavoriteSubject> {
    // Check not already favorited
    const exists = await this.repo.isFavorited(studentId, subjectId, schoolId);
    if (exists) {
      throw new ValidationError('Already a favorite');
    }

    // Add
    const favorite: FavoriteSubject = {
      id: generateId(),
      school_id: schoolId,
      student_id: studentId,
      subject_id: subjectId,
      created_at: new Date(),
    };

    const created = await this.repo.create(favorite);

    // Log
    await this.engagementService.logEvent({
      school_id: schoolId,
      student_id: studentId,
      event_type: 'SUBJECT_FAVORITED',
      metadata: { subject_id: subjectId },
      timestamp: new Date(),
    });

    return created;
  }

  async removeFavorite(studentId: string, subjectId: string, schoolId: string): Promise<void> {
    // Find and delete
    const favorites = await this.repo.findByStudent(studentId, schoolId);
    const favorite = favorites.find(f => f.subject_id === subjectId);
    
    if (!favorite) {
      throw new NotFoundError('Favorite not found');
    }

    await this.repo.delete(favorite.id, schoolId);

    // Log
    await this.engagementService.logEvent({
      school_id: schoolId,
      student_id: studentId,
      event_type: 'SUBJECT_UNFAVORITED',
      metadata: { subject_id: subjectId },
      timestamp: new Date(),
    });
  }

  async getFavorites(studentId: string, schoolId: string): Promise<FavoriteSubject[]> {
    return this.repo.findByStudent(studentId, schoolId);
  }

  async isFavorite(studentId: string, subjectId: string, schoolId: string): Promise<boolean> {
    return this.repo.isFavorited(studentId, subjectId, schoolId);
  }
}
```

### API
```typescript
// app/api/favorites/subjects/route.ts

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);
    const body = await request.json();

    const factory = new ServiceFactory(db);
    const service = factory.createFavoriteSubjectService();

    const favorite = await service.addFavorite(user.id, body.subject_id, schoolId);

    return response.created(favorite);
  } catch (error) {
    return response.handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);

    const factory = new ServiceFactory(db);
    const service = factory.createFavoriteSubjectService();

    const favorites = await service.getFavorites(user.id, schoolId);

    return response.success({ favorites });
  } catch (error) {
    return response.handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return response.unauthorized();

    const schoolId = validateTenant(user, request);
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');

    if (!subjectId) {
      return response.badRequest('Missing subject_id');
    }

    const factory = new ServiceFactory(db);
    const service = factory.createFavoriteSubjectService();

    await service.removeFavorite(user.id, subjectId, schoolId);

    return response.success({ message: 'Removed from favorites' });
  } catch (error) {
    return response.handleError(error);
  }
}
```

**That's it!** You just built a complete feature following the model-based architecture.

---

## Common Pitfalls & How to Avoid Them

### ❌ Pitfall 1: Multiple Service Calls in Controller

```typescript
// WRONG
export async function POST(req) {
  const user = await userService.get(userId);
  const profile = await profileService.update(userId, data);
  const notification = await notificationService.send(userId, 'Updated');
  return response.success({ user, profile, notification });
}

// RIGHT: Orchestrate in service, NOT controller
export async function POST(req) {
  const result = await userService.updateProfile(userId, data);
  return response.success(result);
}

// Service handles multiple operations
async updateProfile(userId, data) {
  const user = await userRepo.update(userId, data);
  const profile = await profileRepo.update(userId, data);
  await this.notificationService.send(userId, 'Updated');
  return { user, profile };
}
```

### ❌ Pitfall 2: Tight Coupling

```typescript
// WRONG: Service imports service directly
import { NotificationService } from './NotificationService';

export class UserService {
  constructor(private repo: UserRepository) {
    this.notifications = new NotificationService(); // ← Tight coupling!
  }
}

// RIGHT: Inject dependencies
export class UserService {
  constructor(
    private repo: UserRepository,
    private notifications: INotificationService  // ← Abstraction!
  ) {}
}
```

### ❌ Pitfall 3: Skipping Validation

```typescript
// WRONG: No validation in service
async create(input: any) {
  return this.repo.create(input);
}

// RIGHT: Always validate in service
async create(input: CreateUserInput) {
  try {
    UserValidation.parse(input);
  } catch (error) {
    throw new ValidationError(`Invalid input: ${error.message}`);
  }
  return this.repo.create(input);
}
```

### ❌ Pitfall 4: Missing Tenant Isolation

```typescript
// WRONG: No school_id check
async getStudent(studentId) {
  return this.repo.findById(studentId);
}

// RIGHT: Always enforce school_id
async getStudent(studentId, schoolId) {
  const student = await this.repo.findById(studentId, schoolId);
  if (!student) throw new NotFoundError();
  return student;
}
```

### ❌ Pitfall 5: Database Logic in Service

```typescript
// WRONG: SQL in service
async getHighPerformers(schoolId) {
  const results = await this.db.query(
    `SELECT * FROM students 
     WHERE school_id = $1 AND mastery > 80`
  );
  return results.rows;
}

// RIGHT: Database query in repository
async getHighPerformers(schoolId) {
  return this.repo.findByMastery(80, schoolId);
}
```

---

## Key Files to Understand

1. **ARCHITECTURE_REFERENCE.md** - Full blueprint of the architecture
2. **REFACTORING_PLAYBOOK.md** - How to refactor existing code
3. **COMPLETE_FEATURE_EXAMPLE.md** - Working example (Quiz feature)
4. **This file** - Quick reference for building new features

---

## Next Steps

1. **Start Small** - Pick one simple feature (e.g., "Favorite Subject")
2. **Follow the Checklist** - Models → Repo → Service → API
3. **Reference the Example** - Look at COMPLETE_FEATURE_EXAMPLE.md when stuck
4. **Read Architecture** - Understand WHY each layer exists
5. **Test Your Code** - Write tests for services (repositories are testable by design)
6. **Iterate** - Once one feature is solid, the next is easier

---

## Questions?

- **"Where should X go?"** - If it's data, it's a model. If it's a query, it's in the repo. If it's logic, it's in the service.
- **"Am I coupling too tightly?"** - If service A imports service B directly, use injection instead.
- **"Should I add this to the model?"** - If it's a field in the table, add it to the model.
- **"Can I skip a layer?"** - No. The layers exist for testability and maintainability.

**Start building!** Pick any feature and follow the 5-step checklist. You've got this. 🚀
