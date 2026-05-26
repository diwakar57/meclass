/**
 * Entity Workflow Implementation
 * Comprehensive Guide for Multi-Tenant Student Enrollment System
 */

# Multi-Tenant Entity Workflow Implementation

## Overview

This document describes the complete implementation of the multi-tenant entity workflow for the LearnAI platform. The system supports:

- **SaaS Admin**: Platform-level school management
- **Schools**: Independent tenants with their own staff and students
- **Staff**: Principal, Teacher, Accountant, Supervisor roles
- **Students**: Independent users who can sign up and join schools

## Architecture

### Core Principles

1. **Tenant Isolation**: All school-level data includes school_id for multi-tenant safety
2. **Independent Students**: Students exist independently and join schools through explicit requests
3. **Approval-Based Membership**: Students request to join → School approves/rejects
4. **Role-Based Access Control**: Different roles have different permissions

### Database Schema

Three new tables added to `db/schema.sql`:

```sql
-- Student's membership status in a school
school_memberships (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  school_id UUID REFERENCES schools(id),
  status VARCHAR(50),           -- pending, approved, rejected, inactive
  joined_at TIMESTAMP,
  approved_by_user_id UUID,
  approved_at TIMESTAMP,
  rejection_reason TEXT
)

-- Explicit join request workflow
student_join_requests (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  school_id UUID REFERENCES schools(id),
  message TEXT,
  status VARCHAR(50),           -- pending, approved, rejected
  membership_id UUID,
  approved_by_user_id UUID,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP
)

-- Staff profile with role-specific information
staff_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  school_id UUID REFERENCES schools(id),
  staff_role VARCHAR(50),       -- principal, teacher, accountant, supervisor
  department TEXT,
  position_title TEXT,
  phone VARCHAR(20),
  office_location TEXT,
  qualifications TEXT[],
  subject_expertise TEXT[],
  bio TEXT,
  verified BOOLEAN DEFAULT FALSE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Staff reporting relationships (supervision chains)
staff_reporting_relationships (
  id UUID PRIMARY KEY,
  supervisor_user_id UUID REFERENCES users(id),
  subordinate_user_id UUID REFERENCES users(id),
  school_id UUID REFERENCES schools(id),
  relationship_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Implementation Components

### 1. Models & Types (`lib/models/entity-models.ts`)

**Enums**:
- `UserRole`: SAAS_ADMIN, PRINCIPAL, TEACHER, ACCOUNTANT, SUPERVISOR, STUDENT
- `StaffRole`: PRINCIPAL, TEACHER, ACCOUNTANT, SUPERVISOR
- `MembershipStatus`: PENDING, APPROVED, REJECTED, INACTIVE
- `JoinRequestStatus`: PENDING, APPROVED, REJECTED
- `SubscriptionTier`: BASIC, PROFESSIONAL, ENTERPRISE

**Interfaces**:
- `School`: School entity with subscription and limits
- `User`: User with role and school association
- `StaffProfile`: Detailed staff information with role and expertise
- `StudentProfile`: Student learning information
- `SchoolMembership`: Student's membership in a school
- `StudentJoinRequest`: Join request with approval tracking
- `StaffReportingRelationship`: Supervision relationships

**Request/Response DTOs**:
- Create/Update requests for all entities
- Dashboard data aggregations
- API response wrappers

### 2. Repository Layer (`lib/repositories/entity-repository.ts`)

Implements database access pattern with:

**schoolRepository**:
```typescript
create(data)                 // Create school
getById(id)                  // Get school by ID
list(limit, offset)          // List all schools
update(id, data)             // Update school
```

**userRepository**:
```typescript
create(data)                 // Create user
getById(id)                  // Get by ID
getByEmail(email)            // Get by email
listBySchool(schoolId)       // List school users
update(id, data)             // Update user
```

**staffProfileRepository**:
```typescript
create(data)                 // Create staff profile
getByUserId(userId)          // Get staff by user ID
listBySchool(schoolId)       // List all school staff
listByRole(schoolId, role)   // List staff by role
update(id, data)             // Update profile
```

**studentProfileRepository**:
```typescript
create(data)                 // Create student profile
getByUserId(userId)          // Get profile by user ID
```

**schoolMembershipRepository**:
```typescript
create(studentId, schoolId)  // Create membership
getById(id)                  // Get membership
listByStudent(studentId)     // Get student's memberships
listBySchool(schoolId, status) // Get school's members
updateStatus(id, status)     // Update membership status
```

**studentJoinRequestRepository**:
```typescript
create(studentId, schoolId, message)        // Create request
getById(id)                                 // Get request
listBySchoolPending(schoolId)               // Get pending requests
listByStudent(studentId)                    // Get student's requests
updateStatus(id, status, approverId, reason, membershipId) // Update
```

All repositories include:
- Proper type mapping from database rows
- Null safety checks
- Tenant isolation (school_id filtering)
- Consistent error handling

### 3. Service Layer (`lib/services/entity-service.ts`)

**schoolService**:
- `createSchool(data)`: Create new school (SaaS admin only)
- `getSchool(schoolId, userId, role)`: Get school with access control
- `listSchools(userRole)`: List schools (SaaS admin only)
- `updateSchool(schoolId, data)`: Update school details

**staffService**:
- `createStaff(schoolId, data, principalId)`: Create staff member (principal only)
- `listStaff(schoolId, userId)`: List school staff with isolation
- `getStaffByRole(schoolId, role)`: Get staff by role
- `promoteTeacher(schoolId, userId)`: Promote teacher to supervisor

**studentService**:
- `registerStudent(data)`: Register independent student (no school_id)
- `getStudentWithMemberships(studentId, userId)`: Get student profile with memberships
- `updateProfile(studentId, data, userId)`: Update student profile

**membershipService** (Core workflow):
- `requestToJoinSchool(studentId, schoolId, message)`: Student submits join request
- `approveJoinRequest(schoolId, requestId, approverId)`: School approves with membership
- `rejectJoinRequest(schoolId, requestId, rejecterId, reason)`: School rejects request
- `getPendingRequests(schoolId, userId)`: List pending requests (principal)
- `getStudentMemberships(studentId, userId)`: Get student's memberships
- `getSchoolMembers(schoolId, userId)`: Get school's approved members

**schoolDashboardService**:
- `getSchoolDashboard(schoolId, userId)`: Complete dashboard data with students, staff, requests

All services include:
- Tenant isolation validation
- Authorization checks
- Business logic enforcement
- Proper error handling

### 4. API Endpoints

#### School Management
- `POST /api/saas/schools` - Create school (SaaS admin)
- `GET /api/saas/schools` - List schools (SaaS admin)

#### Staff Management
- `POST /api/schools/[schoolId]/staff` - Create staff member (principal)
- `GET /api/schools/[schoolId]/staff` - List school staff

#### Student Registration
- `POST /api/students/register` - Register independent student

#### Student Membership
- `POST /api/schools/[schoolId]/students/join` - Request to join school
- `GET /api/schools/[schoolId]/students` - Get school members

#### Join Requests (School Admin)
- `GET /api/schools/[schoolId]/join-requests` - View pending requests
- `POST /api/schools/[schoolId]/join-requests/[requestId]/approve` - Approve request
- `POST /api/schools/[schoolId]/join-requests/[requestId]/reject` - Reject request

**All endpoints include**:
- Authentication verification
- Authorization checks
- Input validation
- Proper HTTP status codes
- Structured error responses

### 5. Dashboard Pages

#### Admin Dashboard (`app/dashboard/admin/page.tsx`)
- View all schools
- Create new schools
- School management

#### School Dashboard (`app/dashboard/school/page.tsx`)
- Overview, Staff, Students, Join Requests tabs
- Add staff members
- Approve/reject student join requests
- View school statistics

#### Student Dashboard (`app/dashboard/student/page.tsx`)
- View school memberships
- Discover schools to join
- Submit join requests
- Track request status

## Complete Workflow Examples

### 1. School Creation (SaaS Admin)

```
1. SaaS Admin calls: POST /api/saas/schools
   - Provide: name, domain, subscriptionTier
   - Returns: School object with ID

2. schoolService.createSchool validates and creates
   - Checks domain uniqueness
   - Creates school record in database
```

### 2. Staff Creation (Principal)

```
1. Principal calls: POST /api/schools/{schoolId}/staff
   - Provide: email, password, firstName, lastName, staffRole
   - Returns: User + StaffProfile objects

2. staffService.createStaff verifies principal authority
   - Checks requester is principal of school
   - Creates user account with school_id
   - Creates staff profile with role details
```

### 3. Student Registration & Join Workflow

```
1. Student calls: POST /api/students/register
   - Provide: email, password, firstName, lastName
   - Returns: User (NO school_id) + StudentProfile

2. Student calls: POST /api/schools/{schoolId}/students/join
   - Provide: message (optional)
   - Returns: StudentJoinRequest (status: PENDING)

3. Principal views: GET /api/schools/{schoolId}/join-requests
   - Sees all pending requests with student info

4. Principal calls: POST /api/schools/{schoolId}/join-requests/{requestId}/approve
   - Creates SchoolMembership (status: APPROVED)
   - Updates StudentJoinRequest (status: APPROVED)
   - Sets student's primary school_id

5. Alternative: POST /api/schools/{schoolId}/join-requests/{requestId}/reject
   - Updates StudentJoinRequest (status: REJECTED)
   - Records rejection reason
   - No membership created
```

## Tenant Isolation & Security

### Key Principles

1. **All queries filtered by school_id**: Every school-scoped query includes `WHERE school_id = $1`
2. **User validation**: Requester must belong to school (except SaaS admins)
3. **Role-based authorization**: Each operation checks user role + school membership
4. **Data exposure limited**: APIs only return data relevant to authenticated user's school

### Implementation Details

All service methods include:
```typescript
// Verify requester belongs to school
const requester = await repo.userRepository.getById(requestingUserId);
if (!requester || requester.schoolId !== schoolId) {
  throw new Error('Unauthorized');
}
```

## File Changes Summary

### New Files Created
1. `lib/models/entity-models.ts` - ALL type definitions
2. `lib/repositories/entity-repository.ts` - Database access layer
3. `lib/services/entity-service.ts` - Business logic layer
4. `app/api/saas/schools/route.ts` - School management API
5. `app/api/schools/[schoolId]/staff/route.ts` - Staff management API
6. `app/api/students/register/route.ts` - Student registration API
7. `app/api/schools/[schoolId]/students/route.ts` - Student join API
8. `app/api/schools/[schoolId]/join-requests/route.ts` - View requests API
9. `app/api/schools/[schoolId]/join-requests/[requestId]/approve/route.ts` - Approve API
10. `app/api/schools/[schoolId]/join-requests/[requestId]/reject/route.ts` - Reject API
11. `app/dashboard/admin/page.tsx` - Admin dashboard
12. `app/dashboard/school/page.tsx` - School admin dashboard

### Modified Files
1. `db/schema.sql` - Added 4 new tables for memberships, join requests, staff profiles, and staff relationships

## Validation Flow

### Membership Approval Sequence

```
Student Request → Pending Join Request Created
         ↓
    Principal Reviews
         ↓
    ├─→ Approve: Creates SchoolMembership (APPROVED)
         ├─→ Sets student's school_id
         ├─→ Updates join request status
         └─→ Available in school immediately
         
    └─→ Reject: Updates join request status (REJECTED)
         ├─→ Student not added to school
         ├─→ Rejection reason recorded
         └─→ Student can request later
```

### Authorization Matrix

| Action | SaaS Admin | Principal | Teacher | Student |
|--------|-----------|-----------|---------|---------|
| Create School | ✓ | ✗ | ✗ | ✗ |
| Create Staff | ✗ | ✓ | ✗ | ✗ |
| View Join Requests | ✗ | ✓ | ✗ | ✗ |
| Approve Membership | ✗ | ✓ | ✗ | ✗ |
| Register as Student | ✓ | ✓ | ✓ | ✓ |
| Request School Join | ✓ | ✓ | ✓ | ✓ |

## Testing Considerations

### Unit Tests
- Repository CRUD operations with null checks
- Service authorization validations
- Tenant isolation in queries

### Integration Tests
- Complete join workflow from request to approval
- Staff creation and role assignment
- Cross-school isolation (user in school A cannot see school B data)

### Edge Cases
- Student joining same school twice (prevented)
- School reaching capacity limits (enforced via max_students)
- Email uniqueness within school (enforced via UNIQUE constraint)

## Deployment Checklist

- [ ] Run database migrations to create new tables
- [ ] Deploy new services and repositories
- [ ] Deploy API endpoints
- [ ] Update API documentation
- [ ] Deploy dashboard pages
- [ ] Test complete workflows in staging
- [ ] Configure monitoring for new endpoints
- [ ] Train staff on using join request approval process
- [ ] Monitor for any tenant isolation issues

## Future Enhancements

1. **Bulk import**: Import students from CSV
2. **Auto-approval policies**: Configure which schools auto-approve requests
3. **Email notifications**: Notify principals of pending requests
4. **Student tiers**: Different membership levels (full student, observer, etc.)
5. **Data export**: Export student lists, memberships, audit logs
6. **Activity logging**: Complete audit trail of membership changes
7. **Grade/class management**: Assign students to classes within school
8. **Progress tracking**: Monitor student progress across schools
