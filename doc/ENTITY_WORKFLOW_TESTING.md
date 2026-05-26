/**
 * Entity Workflow Testing & Verification Guide
 */

# Entity Workflow Testing & Verification

## Test Environment Setup

### Prerequisites
- PostgreSQL database running with schema migrations applied
- Next.js development server running
- Authentication middleware configured
- Dev user fixtures for testing

## Test Scenarios

### Scenario 1: Complete School-Student Join Workflow

#### Step 1: Create a School (SaaS Admin)
```bash
curl -X POST http://localhost:3000/api/saas/schools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {saas_admin_token}" \
  -d '{
    "name": "Test High School",
    "domain": "test-hs.learnai.local",
    "subscriptionTier": "PROFESSIONAL",
    "maxStudents": 500,
    "maxTeachers": 50,
    "features": ["classroom", "assignments", "messaging"]
  }'
```

**Expected Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test High School",
    "domain": "test-hs.learnai.local",
    "subscriptionTier": "PROFESSIONAL",
    "maxStudents": 500,
    "maxTeachers": 50,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Step 2: Register Student (Independent)
```bash
curl -X POST http://localhost:3000/api/students/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePassword123!",
    "firstName": "Alice",
    "lastName": "Student",
    "gradeLevel": "10th",
    "interests": ["mathematics", "physics"]
  }'
```

**Expected Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "alice@example.com",
      "firstName": "Alice",
      "lastName": "Student",
      "role": "STUDENT",
      "schoolId": null
    },
    "profile": {
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "gradeLevel": "10th",
      "interests": ["mathematics", "physics"]
    }
  }
}
```

**Verification**:
- [ ] User created without school_id
- [ ] Student profile also created
- [ ] Email validation works

#### Step 3: Create School Principal (SaaS Admin Creates)
```bash
# First, need to create principal user at school
curl -X POST http://localhost:3000/api/schools/{schoolId}/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {principal_token}" \
  -d '{
    "email": "principal@test-hs.learnai.local",
    "password": "PrincipalPass123!",
    "firstName": "Bob",
    "lastName": "Principal",
    "staffRole": "PRINCIPAL",
    "department": "Administration",
    "positionTitle": "Principal"
  }'
```

**Expected Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "email": "principal@test-hs.learnai.local",
      "firstName": "Bob",
      "lastName": "Principal",
      "role": "PRINCIPAL",
      "schoolId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "staff": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "userId": "770e8400-e29b-41d4-a716-446655440002",
      "schoolId": "550e8400-e29b-41d4-a716-446655440000",
      "staffRole": "PRINCIPAL"
    }
  }
}
```

**Verification**:
- [ ] Principal user created with school_id
- [ ] Staff profile created with PRINCIPAL role
- [ ] User can now approve join requests

#### Step 4: Student Requests to Join School
```bash
curl -X POST http://localhost:3000/api/schools/550e8400-e29b-41d4-a716-446655440000/students/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {student_alice_token}" \
  -d '{
    "message": "I would like to join this school."
  }'
```

**Expected Response (201)**:
```json
{
  "success": true,
  "message": "Join request submitted. Awaiting school approval.",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "studentId": "660e8400-e29b-41d4-a716-446655440001",
    "schoolId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "I would like to join this school.",
    "status": "PENDING",
    "createdAt": "2024-01-15T10:35:00Z"
  }
}
```

**Verification**:
- [ ] StudentJoinRequest created with PENDING status
- [ ] Student receives confirmation
- [ ] Request appears in principal's pending list

#### Step 5: Principal Reviews Pending Requests
```bash
curl -X GET http://localhost:3000/api/schools/550e8400-e29b-41d4-a716-446655440000/join-requests \
  -H "Authorization: Bearer {principal_token}"
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "studentId": "660e8400-e29b-41d4-a716-446655440001",
      "schoolId": "550e8400-e29b-41d4-a716-446655440000",
      "message": "I would like to join this school.",
      "status": "PENDING",
      "createdAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

**Verification**:
- [ ] Principal sees pending request
- [ ] Student email visible (for review)
- [ ] Only principal of this school sees it (not other schools)

#### Step 6: Principal Approves Request
```bash
curl -X POST http://localhost:3000/api/schools/550e8400-e29b-41d4-a716-446655440000/join-requests/990e8400-e29b-41d4-a716-446655440004/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {principal_token}" \
  -d '{
    "message": "Welcome to our school!"
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "message": "Join request approved.",
  "data": {
    "joinRequest": {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "status": "APPROVED",
      "approvedByUserId": "770e8400-e29b-41d4-a716-446655440002",
      "approvedAt": "2024-01-15T10:40:00Z"
    },
    "membership": {
      "id": "aaa0e8400-e29b-41d4-a716-446655440005",
      "studentId": "660e8400-e29b-41d4-a716-446655440001",
      "schoolId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "APPROVED",
      "joinedAt": "2024-01-15T10:40:00Z"
    }
  }
}
```

**Verification**:
- [ ] StudentJoinRequest status changed to APPROVED
- [ ] SchoolMembership created with APPROVED status
- [ ] Student's school_id updated to this school
- [ ] Student now appears in school's member list

#### Step 7: Student Checks Memberships
```bash
curl -X GET http://localhost:3000/api/students/me \
  -H "Authorization: Bearer {student_alice_token}"
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "alice@example.com",
      "firstName": "Alice",
      "lastName": "Student",
      "schoolId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "memberships": [
      {
        "id": "aaa0e8400-e29b-41d4-a716-446655440005",
        "schoolId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "APPROVED",
        "joinedAt": "2024-01-15T10:40:00Z"
      }
    ],
    "joinRequests": []
  }
}
```

**Verification**:
- [ ] Student sees approved membership
- [ ] school_id now set on user
- [ ] Full membership details visible

### Scenario 2: Tenant Isolation Testing

#### Test Case: Student Cannot See Other School's Requests
```bash
# Student from School A tries to view School B's join requests
curl -X GET http://localhost:3000/api/schools/{schoolB_id}/join-requests \
  -H "Authorization: Bearer {student_from_school_a_token}"
```

**Expected Response (403)**:
```json
{
  "error": "Only school principals can view join requests"
}
```

#### Test Case: Principal Cannot Create Staff in Another School
```bash
# Principal from School A tries to create staff in School B
curl -X POST http://localhost:3000/api/schools/{schoolB_id}/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {principal_school_a_token}" \
  -d '{
    "email": "someone@school-b.local",
    "password": "Pass123!",
    "firstName": "Test",
    "lastName": "User",
    "staffRole": "TEACHER"
  }'
```

**Expected Response (403)**:
```json
{
  "error": "Only school principals can create staff"
}
```

### Scenario 3: Rejection Handling

#### Step 1: Student Requests, Principal Rejects
```bash
# ... student submits join request (same as Scenario 1, Step 4)

# Principal rejects
curl -X POST http://localhost:3000/api/schools/550e8400-e29b-41d4-a716-446655440000/join-requests/request-id/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {principal_token}" \
  -d '{
    "reason": "Grade level not currently supported"
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "message": "Join request rejected.",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "status": "REJECTED",
    "rejectionReason": "Grade level not currently supported",
    "rejectedAt": "2024-01-15T10:45:00Z"
  }
}
```

**Verification**:
- [ ] Request status changed to REJECTED
- [ ] Rejection reason recorded
- [ ] No SchoolMembership created
- [ ] Student is not added to school

#### Step 2: Student Can See Rejection
```bash
# Student checks their join requests
curl -X GET http://localhost:3000/api/students/me \
  -H "Authorization: Bearer {student_token}"
```

**Verification**:
- [ ] joinRequests array shows REJECTED request
- [ ] rejectionReason visible to student
- [ ] Student can request to join again later

## Load & Performance Tests

### Test: Maximum Students Per School
```javascript
// Run 505 student join requests against a school with max 500
for (let i = 0; i < 505; i++) {
  const response = await fetch(`/api/schools/{schoolId}/students/join`, {
    method: 'POST',
    body: JSON.stringify({message: `Join request ${i}`})
  });
  
  if (i < 500) {
    assert(response.status === 201, "Should accept first 500");
  } else {
    assert(response.status === 400, "Should reject after limit");
  }
}
```

### Test: Query Performance
```sql
-- Should use index and return in <100ms
EXPLAIN ANALYZE
SELECT * FROM school_memberships 
WHERE school_id = 'school-uuid' 
  AND status = 'APPROVED';

-- Should use index and return in <100ms
EXPLAIN ANALYZE
SELECT * FROM student_join_requests 
WHERE school_id = 'school-uuid' 
  AND status = 'PENDING'
  ORDER BY created_at DESC;
```

## Security Tests

### Test: SQL Injection Prevention
```bash
curl -X GET "http://localhost:3000/api/schools/' OR '1'='1/students" \
  -H "Authorization: Bearer {token}"
```

**Expected**: Parameterized query should prevent injection, return 404 or 400

### Test: Authorization Token Validation
```bash
curl -X GET http://localhost:3000/api/schools/{schoolId}/students \
  -H "Authorization: Bearer invalid_token"
```

**Expected Response (401)**:
```json
{
  "error": "Unauthorized"
}
```

### Test: Student Cannot Modify Join Request Status
```bash
# Student tries to approve their own request
curl -X POST http://localhost:3000/api/schools/{schoolId}/join-requests/{id}/approve \
  -H "Authorization: Bearer {student_token}"
```

**Expected Response (403)**:
```json
{
  "error": "Only school principals can approve join requests"
}
```

## Data Consistency Tests

### Test: Duplicate Join Request Prevention
```bash
# First request succeeds
POST /api/schools/{schoolId}/students/join

# Second request from same student should fail
POST /api/schools/{schoolId}/students/join
# Expected: 400 "Already a member or have pending request"
```

### Test: Membership Status Transitions
```
PENDING → APPROVED ✓ (valid)
PENDING → REJECTED ✓ (valid)
APPROVED → INACTIVE ✓ (valid)
REJECTED → PENDING ✓ (valid - can retry)
APPROVED → PENDING ✗ (invalid - prevent)
```

## Monitoring & Alerting

### Key Metrics to Monitor
- Join request approval time
- Education error rate (4xx/5xx responses)
- Database query performance
- Tenant isolation violations (log all unauthorized access attempts)

### Alert Conditions
- Join request approval SLA > 24 hours
- Error rate > 1%
- Query P99 latency > 500ms
- Any unauthorized tenant access attempts

## Deployment Verification

After deploying to production:

- [ ] Run full integration test suite
- [ ] Verify database backups before migration
- [ ] Monitor error logs for 24 hours
- [ ] Check join request approval flow works end-to-end
- [ ] Verify tenant data is properly isolated
- [ ] Validate API performance metrics
- [ ] Test student dashboard loads correctly
- [ ] Test principal dashboard shows all pending requests
- [ ] Verify emails sent (if configured)
- [ ] Check analytics/metrics collection

## Troubleshooting Guide

### Issue: Join Request Not Appearing for Principal

**Diagnosis**:
1. Check student user exists: `SELECT * FROM users WHERE email = 'student@email.com'`
2. Check join request created: `SELECT * FROM student_join_requests WHERE student_id = 'uuid'`
3. Check school_id matches: `SELECT school_id FROM student_join_requests WHERE id = 'uuid'`

**Solution**: Verify request was POSTed to correct schoolId

### Issue: Student Shows No Memberships After Approval

**Diagnosis**:
1. Check membership created: `SELECT * FROM school_memberships WHERE student_id = 'uuid'`
2. Check status: `SELECT status FROM school_memberships WHERE student_id = 'uuid'`
3. Check user school_id updated: `SELECT school_id FROM users WHERE id = 'uuid'`

**Solution**: Verify approval endpoint returned successfully with membership data

### Issue: Principal Cannot Create Staff

**Diagnosis**:
1. Check if user is principal: `SELECT role FROM users WHERE id = 'uuid'`
2. Check if principal's school_id matches: `WHERE school_id = ?`
3. Check error message for specific validation

**Solution**: Ensure user has PRINCIPAL role and belongs to correct school
