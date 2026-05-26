# Authentication System Fix - Comprehensive Analysis & Implementation Plan

## 1. CURRENT AUTH PROBLEMS

### 🔴 CRITICAL ISSUES (Block User Access)

#### Problem 1: Login Redirects to Non-Existent `/dashboard`
**Severity**: CRITICAL  
**Location**: 
- `app/auth/login/page.tsx` - Lines 46-62
- `lib/contexts/AuthContext.tsx` - Lines 54-56 (login function)

**Issue**: After successful login, both files redirect to `/dashboard` which:
- Does NOT exist in the codebase
- Is NOT a valid route
- Causes 404 error and user gets stuck

**Current Code**:
```typescript
// app/auth/login/page.tsx
router.push('/dashboard');  // ❌ Wrong - doesn't exist

// lib/contexts/AuthContext.tsx
router.push('/dashboard');  // ❌ Wrong - doesn't exist
```

**Should Be**:
```typescript
// Use role-based redirect from login response
const redirectMap = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  principal: '/principal/dashboard',
  school_admin: '/principal/dashboard',  // or /admin/dashboard
  accountant: '/accountant/dashboard',
  supervisor: '/supervisor/dashboard',
  parent: '/parent/dashboard',
  saas_admin: '/admin/dashboard',
};
const dashboardUrl = redirectMap[userRole];
router.push(dashboardUrl);
```

---

#### Problem 2: Signup Redirects to Non-Existent `/dashboard`
**Severity**: CRITICAL  
**Location**: `lib/contexts/AuthContext.tsx` - Lines 94-96 (signup function)

**Issue**: Same as Problem 1 - redirects to non-existent `/dashboard`

**Solution**: Use role-based redirect after signup

---

#### Problem 3: No Role Validation in Dashboard Components
**Severity**: HIGH  
**Location**: `app/{student,teacher,principal,accountant}/dashboard/page.tsx`

**Issue**: 
- Dashboard pages only check `if (!user)` 
- Do NOT verify `user.role === expectedRole`
- Student could manually access `/teacher/dashboard` (URL manipulation)
- Creates security risk and confusing UX

**Current Code**:
```typescript
useEffect(() => {
  if (!isLoading && !user) {
    router.push('/auth/login');  // ✓ Checks if logged in
  }
  // ❌ Missing: Check if user.role === 'student'
}, [isLoading, user, router]);
```

**Should Be**:
```typescript
useEffect(() => {
  if (!isLoading) {
    if (!user) {
      router.push('/auth/login');
    } else if (user.role !== 'student') {
      // Redirect to correct dashboard
      const dashboardMap = { /* ... */ };
      router.push(dashboardMap[user.role] || '/auth/login');
    }
  }
}, [isLoading, user, router]);
```

---

#### Problem 4: Inconsistent Auth Context Usage
**Severity**: MEDIUM  
**Issue**: 
- Two auth context files exist (possible conflict/confusion):
  - `lib/contexts/AuthContext.tsx` (✓ Active - used in app/layout.tsx)
  - `lib/providers/auth-provider.tsx` (❌ Unused or old)
- Creates confusion about which one is authoritative
- Both have issues with hardcoded `/dashboard`

**Solution**: Keep only `lib/contexts/AuthContext.tsx`, remove/deprecate `lib/providers/auth-provider.tsx`

---

#### Problem 5: Missing Type Safety in Role Redirects
**Severity**: MEDIUM  
**Issue**: 
- Role-to-dashboard mapping is repeated in multiple places:
  - middleware.ts
  - app/auth/login/page.tsx
  - app/auth/login/page.tsx (again in setTimeout)
- Changes to one place don't sync with others
- No single source of truth

**Solution**: Create shared utility file `lib/auth/role-redirects.ts` with dashboard mapping

---

### 🟡 IMPLEMENTATION ISSUES

#### Problem 6: Token Set in Cookies But Not Retrieved Consistently
**Severity**: MEDIUM  
**Location**: Response headers in login route

**Issue**: 
- Login route sets `accessToken` in httpOnly cookies
- Different parts of code look for different cookie names:
  - middleware.ts: `accessToken` OR `token`
  - lib/middleware/auth.ts: `accessToken` OR `token`
  - Inconsistent fallback names

**Solution**: Standardize on single cookie name: `accessToken`

---

#### Problem 7: /api/auth/me Endpoint
**Severity**: LOW-MEDIUM  
**Issue**: May not exist or may be incomplete
- Used by AuthContext.tsx to verify session
- Critical for session persistence

**Solution**: Verify exists and returns full user object including role

---

## 2. DATABASE TABLES INVOLVED

```
users
├── id (UUID)
├── email (VARCHAR)
├── password_hash (VARCHAR)
├── role (VARCHAR) ← CRITICAL FOR ROUTING
├── first_name (VARCHAR)
├── last_name (VARCHAR)
├── school_id (UUID) ← MULTI-TENANT ISOLATION
├── is_active (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

schools
├── id (UUID)
├── name (VARCHAR)
├── domain (VARCHAR)
└── ...

audit_logs (for tracking logins)
├── school_id (UUID)
├── user_id (UUID)
├── action (VARCHAR) - 'login', 'logout', etc.
└── created_at (TIMESTAMP)
```

**Key Points**:
- ALL school-owned data is **tenant-aware** (includes `school_id`)
- `users.role` must ALWAYS be returned in auth response
- Role values: `saas_admin`, `school_admin`, `principal`, `teacher`, `accountant`, `supervisor`, `student`, `parent`

---

## 3. AUTH ARCHITECTURE - CORRECT FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ LOGIN FLOW (Secure, Role-Based)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User enters email + password                            │
│     ↓                                                        │
│  2. POST /api/auth/login                                    │
│     ├─ Verify email exists + password hash matches          │
│     ├─ Check school subscription (if needed)                │
│     ├─ Generate JWT accessToken (24h)                       │
│     ├─ Generate JWT refreshToken (7d)                       │
│     └─ Return: { token, refreshToken, user: {...} }        │
│     ↓                                                        │
│  3. Browser stores tokens in httpOnly cookies               │
│     ├─ accessToken (httpOnly, secure) ← JWT                 │
│     ├─ refreshToken (httpOnly, secure) ← JWT                │
│     └─ User object → localStorage (for instant UX)          │
│     ↓                                                        │
│  4. LOGIN COMPONENT REDIRECTS ✅                            │
│     ├─ Extract user.role from login response                │
│     ├─ Map role → dashboard URL                             │
│     └─ router.push(dashboardUrl)                            │
│     ↓                                                        │
│  5. Navigate to role-based dashboard                        │
│     ├─ Middleware verifies token exists                     │
│     ├─ Validates token JWT signature                        │
│     ├─ Checks user role ≥ required role                     │
│     └─ If valid: render dashboard                           │
│     ↓                                                        │
│  6. Dashboard component:                                    │
│     ├─ Loads user from AuthContext                          │
│     ├─ Verifies user.role matches dashboard type            │
│     └─ If mismatch: redirect to correct dashboard           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MIDDLEWARE FLOW (Route Protection)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PUBLIC_PATHS: [/, /landing, /about, /auth/login, ...]     │
│               → NextResponse.next()  (no auth needed)       │
│                                                              │
│  PRIVATE_PATHS: [/student/*, /teacher/*, ...]              │
│               → Check token exists                          │
│               → Verify JWT signature                        │
│               → Check role in ROLE_BASED_ROUTES             │
│               → If invalid: redirect to correct dashboard   │
│               → If valid: NextResponse.next()               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. MIDDLEWARE & GUARD CHANGES NEEDED

### middleware.ts Updates

**Current Issue**: 
- Token verification happens but redirect mapping is incomplete
- Does NOT redirect after login

**Required Changes**:
1. Standardize token cookie names
2. Complete dashboard redirect mapping
3. Add validation for non-existent routes

### lib/middleware/auth.ts Updates

**Current Issue**: 
- Handles API-level auth
- Uses correct role checking

**No Changes Needed** - This file is fine

### lib/middleware/role-guard.ts Updates

**Current Issue**:
- Good structure with `getRequestAuthContext()`
- `resolveTenantSchoolId()` handles multi-tenancy correctly

**Minor Changes**:
- Normalize `school_admin` → `principal`
- Ensure consistency with user types

---

## 5. DASHBOARD ROUTING LOGIC

### Required Dashboard Mapping

```typescript
// lib/auth/role-redirects.ts (NEW FILE)

export const DASHBOARD_ROUTES: Record<string, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  principal: '/principal/dashboard',
  school_admin: '/principal/dashboard',  // school_admin = principal
  accountant: '/accountant/dashboard',
  supervisor: '/supervisor/dashboard',
  parent: '/parent/dashboard',
  saas_admin: '/admin/dashboard',
};

export function getCorrectDashboard(role: string): string {
  return DASHBOARD_ROUTES[role] || '/auth/login';
}
```

### Dashboard Component Pattern

```typescript
// app/student/dashboard/page.tsx (PATTERN)

'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getCorrectDashboard } from '@/lib/auth/role-redirects';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.role !== 'student') {
        // User has wrong role - redirect to correct dashboard
        const correctDashboard = getCorrectDashboard(user.role);
        router.push(correctDashboard);
      }
    }
  }, [isLoading, user, router]);

  // Don't render dashboard until auth is verified
  if (isLoading || !user || user.role !== 'student') {
    return <div>Loading...</div>;
  }

  return (
    // ... Dashboard content
  );
}
```

---

## 6. CODE CHANGES REQUIRED

### Files to Create
1. `lib/auth/role-redirects.ts` - NEW (dashboard mapping)

### Files to Modify
1. `middleware.ts` - Fix redirect after login
2. `app/auth/login/page.tsx` - Use role-based redirect
3. `app/auth/signup/page.tsx` - Use role-based redirect (if exists)
4. `lib/contexts/AuthContext.tsx` - Fix login/signup redirect
5. `app/student/dashboard/page.tsx` - Add role validation
6. `app/teacher/dashboard/page.tsx` - Add role validation
7. `app/principal/dashboard/page.tsx` - Add role validation
8. `app/accountant/dashboard/page.tsx` - Add role validation
9. `app/admin/dashboard/page.tsx` - Add role validation (if exists)
10. `app/parent/dashboard/page.tsx` - Add role validation (if exists)

### Files to Delete/Deprecate
1. `lib/providers/auth-provider.tsx` - (unused, if confirmed)

---

## 7. VALIDATION CHECKLIST

### Authentication Verification
- [ ] POST `/api/auth/login` returns correct user role
- [ ] Tokens stored in httpOnly cookies
- [ ] Refresh token handling works correctly
- [ ] `/api/auth/me` returns user with role

### Login Flow
- [ ] Login page shows correct error messages
- [ ] After successful login → redirect to correct dashboard
- [ ] User role "student" → `/student/dashboard`
- [ ] User role "teacher" → `/teacher/dashboard`
- [ ] User role "principal" → `/principal/dashboard`
- [ ] User role "school_admin" → `/principal/dashboard`
- [ ] User role "accountant" → `/accountant/dashboard`
- [ ] User role "supervisor" → `/supervisor/dashboard`
- [ ] User role "parent" → `/parent/dashboard`
- [ ] User role "saas_admin" → `/admin/dashboard`

### Route Protection
- [ ] Cannot access `/student/dashboard` without login
- [ ] Cannot access `/teacher/dashboard` without login
- [ ] Cannot request `/student/dashboard` with wrong role
- [ ] Middleware redirects to correct dashboard when accessing wrong role
- [ ] API routes block requests with wrong role

### Dashboard Validation
- [ ] Student sees only `/student/dashboard` content
- [ ] Student cannot access `/teacher/dashboard` (redirects)
- [ ] Teacher cannot access `/admin/dashboard` (redirects)
- [ ] Role mismatch triggers immediate redirect
- [ ] No loading state leaks dashboard content

### Session Persistence
- [ ] Page reload maintains authentication
- [ ] AuthContext syncs with cookies on load
- [ ] Tokens refresh automatically before expiry
- [ ] Invalid session redirects to login

### Logout
- [ ] Logout clears cookies
- [ ] Logout clears localStorage
- [ ] Logout redirects to landing page
- [ ] Subsequent requests require new login

### Multi-Tenant (Tenant Awareness)
- [ ] User can only see their school's data
- [ ] API routes validate school_id matches user
- [ ] Audit logs recorded for all logins
- [ ] Cross-school access blocked

---

## 8. IMPLEMENTATION ORDER

1. Create `lib/auth/role-redirects.ts`
2. Update `middleware.ts` 
3. Update `lib/contexts/AuthContext.tsx`
4. Update `app/auth/login/page.tsx`
5. Update dashboard pages (add role validation)
6. Test all flows
7. Verify audit logs
8. Clean up old files

---

## SUMMARY

**Root Cause**: Hardcoded `/dashboard` redirect that doesn't exist

**Impact**: Users get 404 after login, cannot use platform

**Solution**: 
- Role-based dashboard redirect with shared mapping
- Role validation in dashboard components
- Consistent auth context and middleware

**Security Model**:
- JWT tokens in httpOnly cookies
- Role-based route protection in middleware
- Tenant isolation with school_id checks
- Session validation on dashboard load

**Testing**: Validate all user roles can login and reach correct dashboard
