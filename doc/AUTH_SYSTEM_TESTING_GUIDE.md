# Authentication System Testing Guide

## Quick Start: Testing the Auth System

This guide provides step-by-step instructions to validate the complete authentication system across all 8 user roles.

---

## Environment Setup

### Prerequisites
Before testing, ensure these environment variables are configured in `.env.local`:

```env
# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/openmaix_db

# API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Node
NODE_ENV=development
```

### Test Database Setup
```bash
# Connect to PostgreSQL
psql -U postgres -d openmaix_db

# Verify users table has role column
\d users;

# Seed test data (optional - use seed.ts or manual insert)
INSERT INTO users (school_id, email, password_hash, role, first_name, last_name)
VALUES 
  (1, 'principal@school.com', 'hashed_password', 'principal', 'John', 'Principal'),
  (1, 'teacher@school.com', 'hashed_password', 'teacher', 'Jane', 'Teacher'),
  (1, 'student@school.com', 'hashed_password', 'student', 'Bob', 'Student'),
  (1, 'accountant@school.com', 'hashed_password', 'accountant', 'Alice', 'Accountant'),
  (1, 'supervisor@school.com', 'hashed_password', 'supervisor', 'Charlie', 'Supervisor'),
  (1, 'parent@school.com', 'hashed_password', 'parent', 'David', 'Parent'),
  (1, 'admin@school.com', 'hashed_password', 'saas_admin', 'Admin', 'Admin');
```

### Start Development Server
```bash
npm run dev
# or
pnpm dev

# Server should run on http://localhost:3000
```

---

## Test Matrix: Role Mappings

| Role | Expected Dashboard | Test User | Notes |
|------|-------------------|-----------|-------|
| `saas_admin` | `/admin/dashboard` | admin@school.com | Platform admins |
| `principal` | `/principal/dashboard` | principal@school.com | School leaders |
| `school_admin` | `/principal/dashboard` | (same as principal) | Alias for principal |
| `teacher` | `/teacher/dashboard` | teacher@school.com | Classroom instructors |
| `student` | `/student/dashboard` | student@school.com | Learners |
| `accountant` | `/accountant/dashboard` | accountant@school.com | Financial ops (NEW) |
| `supervisor` | `/supervisor/dashboard` | supervisor@school.com | Teacher oversight (NEW) |
| `parent` | `/parent/dashboard` | parent@school.com | Student guardians (NEW) |

---

## Test Scenario 1: Login Flow - Correct Role Routing

### Scenario 1.1: Student Login
**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter: `student@school.com` / `password123`
3. Click "Sign In"

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirects to `/student/dashboard`
- ✅ Dashboard displays student name
- ✅ URL shows `/student/dashboard` (not `/dashboard`)
- ✅ No 404 errors

**Verify in DevTools:**
```javascript
// Console
console.log(localStorage.getItem('user')); 
// Should show: { "role": "student", ... }

// Check cookies
// Should have: learhai_auth=<jwt>, httpOnly=true
```

### Scenario 1.2: Teacher Login
**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter: `teacher@school.com` / `password123`
3. Click "Sign In"

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirects to `/teacher/dashboard`
- ✅ Dashboard displays teacher name
- ✅ URL shows `/teacher/dashboard` (not `/dashboard`)
- ✅ No 404 errors

**Verify in DevTools:**
```javascript
console.log(localStorage.getItem('user')); 
// Should show: { "role": "teacher", ... }
```

### Scenario 1.3: Principal Login
**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter: `principal@school.com` / `password123`
3. Click "Sign In"

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirects to `/principal/dashboard`
- ✅ Dashboard displays principal name
- ✅ URL shows `/principal/dashboard`

### Scenario 1.4: Admin Login
**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter: `admin@school.com` / `password123`
3. Click "Sign In"

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirects to `/admin/dashboard`
- ✅ Dashboard displays admin name
- ✅ URL shows `/admin/dashboard`

### Scenario 1.5: Accountant Login (NEW)
**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter: `accountant@school.com` / `password123`
3. Click "Sign In"

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirects to `/accountant/dashboard`
- ✅ Dashboard shows invoice management section
- ✅ URL shows `/accountant/dashboard`

### Scenario 1.6: Supervisor Login (NEW)
**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter: `supervisor@school.com` / `password123`
3. Click "Sign In"

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirects to `/supervisor/dashboard`
- ✅ Dashboard shows teacher monitoring section
- ✅ URL shows `/supervisor/dashboard`

### Scenario 1.7: Parent Login (NEW)
**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter: `parent@school.com` / `password123`
3. Click "Sign In"

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirects to `/parent/dashboard`
- ✅ Dashboard shows child progress section
- ✅ URL shows `/parent/dashboard`

---

## Test Scenario 2: Signup Flow - Correct Role Routing

### Scenario 2.1: Student Signup
**Steps:**
1. Navigate to `http://localhost:3000/auth/signup/student`
2. Fill form (name, email, password)
3. Click "Create Account"

**Expected Results:**
- ✅ Account created
- ✅ Redirects to `/student/dashboard` (not `/dashboard`)
- ✅ User logged in immediately
- ✅ No 404 errors

**File Location:** `app/auth/signup/student/page.tsx`

### Scenario 2.2: Teacher Signup
**Steps:**
1. Navigate to `http://localhost:3000/auth/signup/teacher`
2. Fill form (school code, name, email, password)
3. Click "Register as Teacher"

**Expected Results:**
- ✅ Account created
- ✅ Redirects to `/teacher/dashboard` (not `/dashboard`)
- ✅ User logged in immediately
- ✅ No 404 errors

**File Location:** `app/auth/signup/teacher/page.tsx`

### Scenario 2.3: Principal Signup
**Steps:**
1. Navigate to `http://localhost:3000/auth/signup/principal`
2. Fill form (school name, email, password)
3. Click "Register School"

**Expected Results:**
- ✅ School created
- ✅ Account created as principal
- ✅ Redirects to `/principal/dashboard` (not `/dashboard`)
- ✅ No 404 errors

**File Location:** `app/auth/signup/principal/page.tsx`

---

## Test Scenario 3: Role-Based Access Control (RBAC)

### Scenario 3.1: Student Accessing Teacher Dashboard
**Steps:**
1. Login as student: `student@school.com`
2. Manually navigate to `/teacher/dashboard`

**Expected Results:**
- ✅ Component detects wrong role
- ✅ Redirects to `/student/dashboard`
- ✅ No error displayed
- ✅ Stays authenticated

**Code Location:** `app/teacher/dashboard/page.tsx` (line: role validation check)

### Scenario 3.2: Teacher Accessing Admin Dashboard
**Steps:**
1. Login as teacher: `teacher@school.com`
2. Manually navigate to `/admin/dashboard`

**Expected Results:**
- ✅ Component detects wrong role
- ✅ Redirects to `/teacher/dashboard`
- ✅ No error displayed
- ✅ Stays authenticated

**Code Location:** `app/admin/dashboard/page.tsx`

### Scenario 3.3: Principal Accessing Accountant Dashboard
**Steps:**
1. Login as principal: `principal@school.com`
2. Manually navigate to `/accountant/dashboard`

**Expected Results:**
- ✅ Component detects wrong role
- ✅ Redirects to `/principal/dashboard`
- ✅ No error displayed
- ✅ Stays authenticated

**Code Location:** `app/accountant/dashboard/page.tsx`

### Scenario 3.4: Supervisor Accessing Parent Dashboard
**Steps:**
1. Login as supervisor: `supervisor@school.com`
2. Manually navigate to `/parent/dashboard`

**Expected Results:**
- ✅ Component detects wrong role
- ✅ Redirects to `/supervisor/dashboard`
- ✅ No error displayed
- ✅ Stays authenticated

**Code Location:** `app/parent/dashboard/page.tsx`

---

## Test Scenario 4: Session Persistence

### Scenario 4.1: Page Refresh During Session
**Steps:**
1. Login as teacher: `teacher@school.com`
2. Verify on `/teacher/dashboard`
3. Press F5 to refresh page

**Expected Results:**
- ✅ Page reloads
- ✅ Still on `/teacher/dashboard`
- ✅ No redirect to login
- ✅ User data is loaded (name, email visible)
- ✅ Still authenticated

**Check in DevTools Console:**
```javascript
// After refresh, should still exist:
localStorage.getItem('user')

// Should have valid auth cookie:
document.cookie
```

### Scenario 4.2: Multiple Tab Synchronization
**Steps:**
1. Login in Tab 1 as student
2. Open Tab 2 with same localhost
3. Navigate to URL in Tab 2

**Expected Results:**
- ✅ Tab 2 recognizes session from Tab 1
- ✅ Tab 2 loads student dashboard
- ✅ No re-login required

### Scenario 4.3: Token Refresh (Near Expiration)
**Steps:**
1. Login as student
2. Wait or manually test token near expiration
3. Make an API call (e.g. load dashboard data)

**Expected Results:**
- ✅ Token silently refreshed
- ✅ No user interruption
- ✅ API call succeeds
- ✅ New token stored

**Check in DevTools - Application → Cookies:**
```
learhai_auth_refresh should exist with 7-day expiration
```

---

## Test Scenario 5: Logout & Session Cleanup

### Scenario 5.1: Logout Clears Session
**Steps:**
1. Login as any user
2. Click logout button
3. Open DevTools → Application → Storage

**Expected Results:**
- ✅ Redirects to login page
- ✅ localStorage cleared (user data gone)
- ✅ Cookies cleared (auth tokens gone)
- ✅ Browser back button doesn't restore session
- ✅ Cannot access dashboards

**Verify Logout Handler (in component or header):**
```javascript
// Should clear:
localStorage.removeItem('user');
document.cookie = 'learhai_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
document.cookie = 'learhai_auth_refresh=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
```

### Scenario 5.2: Accessing Dashboard After Logout
**Steps:**
1. Login as teacher
2. Logout
3. Manually navigate to `/teacher/dashboard`

**Expected Results:**
- ✅ Middleware intercepts request
- ✅ Redirects to `/auth/login`
- ✅ Dashboard not accessible
- ✅ No sensitive data exposed

---

## Test Scenario 6: API Authentication Headers

### Scenario 6.1: Token Sent in API Calls
**Steps:**
1. Login as student
2. Open DevTools → Network tab
3. Perform action that calls API (e.g., load classroom data)

**Expected Results:**
- ✅ API requests include Authorization header
- ✅ Header format: `Authorization: Bearer <jwt_token>`
- ✅ API returns 200 OK (not 401 Unauthorized)
- ✅ User data scoped to correct school_id

**Check Request Header:**
```
GET /api/student/courses HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Scenario 6.2: Missing Token Rejected
**Steps:**
1. Open DevTools → Console
2. Manually make API call without token:

```javascript
fetch('/api/student/courses')
  .then(r => r.json())
  .then(console.log)
```

**Expected Results:**
- ✅ API returns 401 Unauthorized
- ✅ Error message: "No token provided" or "Invalid token"
- ✅ Dashboard not accessible

### Scenario 6.3: Expired Token Handling
**Steps:**
1. Modify token in localStorage to expired date
2. Try to access API endpoint
3. Check if system attempts refresh

**Expected Results:**
- ✅ Detects expired token
- ✅ Attempts refresh token
- ✅ If refresh fails → redirects to login
- ✅ If refresh succeeds → continues silently

---

## Test Scenario 7: Multi-Tenancy Isolation

### Scenario 7.1: Student A Cannot See School B Data
**Prerequisites:**
- School A with Student A (school_id=1)
- School B with Student B (school_id=2)

**Steps:**
1. Login as Student A (school_id=1)
2. Load dashboard with courses
3. Logout
4. Login as Student B (school_id=2)
5. Verify different courses displayed

**Expected Results:**
- ✅ Student A sees only School A courses
- ✅ Student B sees only School B courses
- ✅ Data is completely isolated by school_id
- ✅ No cross-school data leakage

**API Validation:**
```javascript
// After login as Student A
GET /api/student/courses
// Returns courses where courses.school_id==1

// After login as Student B
GET /api/student/courses
// Returns courses where courses.school_id==2 (different)
```

### Scenario 7.2: Teacher Cannot Modify Other School Data
**Steps:**
1. Login as Teacher in School A
2. Attempt to call: `POST /api/teacher/class/X/update` (where X is Class in School B)

**Expected Results:**
- ✅ API checks school_id match
- ✅ Returns 403 Forbidden
- ✅ No modification occurs
- ✅ Audit log records attempt

**File Location:** Check all API routes for `school_id` validation

---

## Test Scenario 8: Error Handling

### Scenario 8.1: Invalid Credentials
**Steps:**
1. Navigate to login
2. Enter: `student@school.com` / `wrongpassword`
3. Click Sign In

**Expected Results:**
- ✅ Login fails
- ✅ Error message: "Invalid email or password"
- ✅ Stays on login page (no redirect)
- ✅ No auth token created
- ✅ No audit log entry

### Scenario 8.2: Non-Existent User
**Steps:**
1. Navigate to login
2. Enter: `nonexistent@school.com` / `password123`
3. Click Sign In

**Expected Results:**
- ✅ Login fails
- ✅ Error message: "Invalid email or password" (don't reveal user doesn't exist)
- ✅ Stays on login page
- ✅ No auth token created

### Scenario 8.3: Database Connection Error
**Steps:**
1. Stop PostgreSQL service
2. Attempt login
3. Check error message

**Expected Results:**
- ✅ Graceful error message (not stack trace)
- ✅ Message: "Service temporarily unavailable"
- ✅ User not locked out
- ✅ System ready when DB restarts

---

## Test Scenario 9: Middleware Route Protection

### Scenario 9.1: Unauthenticated Access to Protected Route
**Steps:**
1. Clear all cookies/localStorage
2. Directly navigate to `/student/dashboard`

**Expected Results:**
- ✅ Middleware intercepts
- ✅ Redirects to `/auth/login?from=/student/dashboard`
- ✅ Cannot access dashboard
- ✅ "from" parameter preserved for post-login redirect

**File Location:** `middleware.ts` (DASHBOARD_ROUTES check)

### Scenario 9.2: API Route Protection
**Steps:**
1. Clear auth token
2. Call: `fetch('/api/student/courses')`

**Expected Results:**
- ✅ Returns 401 Unauthorized
- ✅ Response: `{ error: "Unauthorized" }`
- ✅ No data returned
- ✅ Audit log records attempt

---

## Test Scenario 10: Loading States & Spinners

### Scenario 10.1: Dashboard Loading During Auth Check
**Steps:**
1. Login with slow network (throttle in DevTools)
2. Watch dashboard load

**Expected Results:**
- ✅ Shows loading spinner while checking role
- ✅ No content flashes before redirect
- ✅ Once auth confirmed, displays dashboard
- ✅ Smooth user experience

**Code Pattern (all dashboards):**
```typescript
const [loading, setLoading] = useState(true);
useEffect(() => {
  if (user && user.role === 'student') {
    setLoading(false);
  } else if (user) {
    router.push('/student/dashboard'); // wrong role
  }
}, [user]);

if (loading) return <LoadingSpinner />;
return <Dashboard />;
```

### Scenario 10.2: No Content Flashing on Wrong Role
**Steps:**
1. Login as student
2. Manually navigate to `/teacher/dashboard`
3. Watch carefully during redirect

**Expected Results:**
- ✅ No teacher dashboard content visible
- ✅ Redirect happens immediately
- ✅ Smooth transition to correct dashboard
- ✅ No flash of unauthorized content

---

## Test Scenario 11: Audit Logging

### Scenario 11.1: Login Audit Entry Created
**Steps:**
1. Login as student
2. Query audit_logs table:

```sql
SELECT * FROM audit_logs 
WHERE user_id = (SELECT id FROM users WHERE email='student@school.com')
ORDER BY created_at DESC LIMIT 5;
```

**Expected Results:**
- ✅ Most recent entry has action='login'
- ✅ resource_type='user'
- ✅ school_id matches user's school
- ✅ ip_address captured
- ✅ user_agent captured
- ✅ timestamp is current

### Scenario 11.2: Failed Login Audit Entry
**Steps:**
1. Attempt login with wrong password
2. Query failed_logins table (if exists)

**Expected Results:**
- ✅ Entry created for failed attempt
- ✅ email, ip_address, timestamp logged
- ✅ Can detect brute force attempts (multiple failures in short time)

---

## Test Scenario 12: ALL DASHBOARDS ACCESSIBLE

### Scenario 12.1: All 8 Dashboards Load Without Error
**Steps:**
1. Login as saas_admin
2. Manually navigate to `/admin/dashboard`
3. Repeat for each dashboard:

| Role | Navigate To | Expected Status |
|------|-----------|-----------------|
| student | `/student/dashboard` | ✅ Loads |
| teacher | `/teacher/dashboard` | ✅ Loads |
| principal | `/principal/dashboard` | ✅ Loads |
| accountant | `/accountant/dashboard` | ✅ Loads |
| supervisor | `/supervisor/dashboard` | ✅ Loads |
| parent | `/parent/dashboard` | ✅ Loads |
| school_admin | `/principal/dashboard` | ✅ Loads |
| saas_admin | `/admin/dashboard` | ✅ Loads |

**Check DevTools Console:**
- ✅ No JavaScript errors
- ✅ No TypeScript errors
- ✅ All components render
- ✅ useAuth() hook returns correct user

---

## Verification Checklist

### Before Testing
- [ ] `.env.local` configured with JWT_SECRET
- [ ] DATABASE_URL points to correct PostgreSQL
- [ ] Test data inserted in users table
- [ ] Development server running on port 3000
- [ ] No compilation errors in VSCode

### Login & Redirect Tests
- [ ] ✅ Student login → `/student/dashboard`
- [ ] ✅ Teacher login → `/teacher/dashboard`
- [ ] ✅ Principal login → `/principal/dashboard`
- [ ] ✅ Admin login → `/admin/dashboard`
- [ ] ✅ Accountant login → `/accountant/dashboard`
- [ ] ✅ Supervisor login → `/supervisor/dashboard`
- [ ] ✅ Parent login → `/parent/dashboard`
- [ ] ✅ No `/dashboard` 404 errors

### Signup Tests
- [ ] ✅ Student signup → `/student/dashboard`
- [ ] ✅ Teacher signup → `/teacher/dashboard`
- [ ] ✅ Principal signup → `/principal/dashboard`

### RBAC Tests
- [ ] ✅ Wrong role dashboard access blocked
- [ ] ✅ User redirected to correct role dashboard
- [ ] ✅ All 5 RBAC scenarios pass

### Session Tests
- [ ] ✅ Page refresh maintains session
- [ ] ✅ Multiple tabs sync authentication
- [ ] ✅ Token refresh works silently
- [ ] ✅ Logout clears all data
- [ ] ✅ Post-logout dashboard access blocked

### API Tests
- [ ] ✅ API calls include auth token
- [ ] ✅ Missing token returns 401
- [ ] ✅ Expired token triggers refresh
- [ ] ✅ school_id isolation enforced

### Multi-Tenancy Tests
- [ ] ✅ School A data not visible to School B
- [ ] ✅ Teacher cannot modify other school's data
- [ ] ✅ API enforces school_id boundary

### Dashboard Tests
- [ ] ✅ All 8 dashboards render without errors
- [ ] ✅ All dashboards show role-specific content
- [ ] ✅ All dashboards have proper role guards
- [ ] ✅ All dashboards handle loading state

### Error Handling Tests
- [ ] ✅ Invalid credentials show error
- [ ] ✅ Non-existent user doesn't reveal (same error message)
- [ ] ✅ Database errors handled gracefully
- [ ] ✅ Middleware redirects on auth failure

### Audit Logging Tests
- [ ] ✅ Login creates audit_logs entry
- [ ] ✅ Failed login recorded
- [ ] ✅ school_id captured in audit log
- [ ] ✅ ip_address tracked

---

## Debugging Tips

### Authentication Not Working
**File Location:** `app/api/auth/login/route.ts`

Check:
1. Email/password validation logic
2. Password hashing comparison (bcrypt)
3. JWT generation
4. Cookie setting

**Test with curl:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@school.com","password":"password123"}' \
  -v
```

### Token Not In Cookies
**File Location:** `app/api/auth/login/route.ts`

Check:
1. `httpOnly: true` is set
2. `Path: '/'` is set
3. `Secure: process.env.NODE_ENV === 'production'` (not needed in dev)

**Test with DevTools:**
- Application → Cookies → localhost:3000
- Should see: `learhai_auth` and `learhai_auth_refresh`

### Wrong Dashboard After Login
**File Location:** `lib/auth/role-redirects.ts`

Check:
1. Role→dashboard mapping is correct
2. User.role from API matches expected role
3. useEffect in login page triggers properly

**Test with console.log:**
```typescript
// In app/auth/login/page.tsx
useEffect(() => {
  if (user) {
    const dashboard = getCorrectDashboard(user.role);
    console.log(`User role: ${user.role}, Dashboard: ${dashboard}`);
    router.push(dashboard);
  }
}, [user]);
```

### RBAC Bypass (Wrong Role Accessing Dashboard)
**File Location:** `app/{role}/dashboard/page.tsx`

Check:
1. Role validation at component top
2. Redirect happens before rendering
3. Loading state prevents flash

**Test with:**
```typescript
// In dashboard component
useEffect(() => {
  if (!loading && (!user || user.role !== expectedRole)) {
    console.log(`Redirecting: user.role=${user?.role}, expected=${expectedRole}`);
    router.push(getCorrectDashboard(user?.role || 'student'));
  }
}, [user, loading]);
```

### Session Not Persisting
**File Location:** `lib/auth/AuthContext.tsx` or `useAuth()` hook

Check:
1. `localStorage.setItem('user', ...)` after login
2. `useEffect` in AuthContext checks localStorage on mount
3. `refreshToken()` called to validate token

**Test with:**
```javascript
// Verify localStorage has user
JSON.parse(localStorage.getItem('user'))

// Verify cookies exist
document.cookie

// Manually refresh page and check:
console.log(localStorage.getItem('user'))
```

---

## Performance Baseline

Expected metrics for successful auth system:
- Login page load: < 2 seconds
- Login submit → dashboard: < 3 seconds
- Dashboard role check + load: < 1 second
- Page refresh: < 2 seconds
- Token refresh (silent): < 500ms

If slower, check:
1. Database query performance
2. API response times
3. Network throttling in DevTools
4. Unnecessary re-renders

---

## Sign-Off

When all tests in the checklist pass, the authentication system is ready for:
1. ✅ Integration testing with other features
2. ✅ Load testing with multiple concurrent users
3. ✅ Security audit by external reviewer
4. ✅ Production deployment

**Contact:** [auth-maintainer-email] for questions or issues during testing.

---

**Last Updated:** 2025  
**Status:** Ready for Testing  
**Affected Files:** 12 (1 new utility + 3 new dashboards + 8 modified files)
