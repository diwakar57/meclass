# LearnAI SaaS Education Platform - Complete Architecture

**Branding**: Designed and operated by **LearnAI.study**

## 1. SYSTEM OVERVIEW

LearnAI is a multi-tenant AI-powered education platform with 4 distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│  1. PUBLIC WEBSITE LAYER (Public, No Auth Required)          │
│     Landing Page → About → Contact → Login/Signup           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. AUTHENTICATION LAYER (JWT + Sessions)                    │
│     Email/Password → JWT Token → Role-Based Routing         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. ROLE-BASED DASHBOARDS (Protected Routes)                 │
│     Student → Teacher → Principal → Accountant → SaaS Admin  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4. BUSINESS WORKFLOWS (SaaS → School → Student)             │
│     Create Schools → Manage Staff → Students Join           │
└─────────────────────────────────────────────────────────────┘
```

## 2. USER FLOWS

### A. PUBLIC USER (No Login)
```
Visit / (Landing) 
  → Browse /about
  → Browse /features
  → Browse /pricing
  → Click "Sign Up" / "Login"
  → Authenticate
```

### B. SAAS ADMIN FLOW
```
Login as saas_admin
  → /admin/dashboard
  → Create School
  → Manage Schools
  → View Revenue
  → Manage Subscriptions
```

### C. SCHOOL PRINCIPAL FLOW  
```
1. Register School via /register-school
   → Pending SaaS admin approval
   
2. Login after approval
   → /dashboard/principal
   → Manage Staff
   → Manage Students
   → View Analytics
   → Invite Teachers/Staff
```

### D. TEACHER FLOW
```
1. Receive Invitation or Signup with School Code
   → Sign up as teacher
   
2. Login
   → /dashboard/teacher
   → Create Lessons
   → Manage Classes
   → View Student Progress
   → Generate Reports
```

### E. STUDENT INDEPENDENT FLOW
```
1. Signup independently (no school required)
   → /dashboard/student
   
2. Explore Schools
   → /student/explore-schools
   → Send Join Request
   
3. After School Approval
   → Join Class
   → Start Learning
   → View Progress
   → Complete Assignments
```

### F. ACCOUNTANT FLOW
```
Login as accountant
  → /dashboard/accountant
  → View Payments
  → Generate Invoices
  → Payment Reports
  → Fee Management
```

## 3. DATA MODELS & RELATIONSHIPS

### Core Models

```
┌─────────────────────────────────────────────────────────────┐
│ SCHOOLS (Tenants)                                           │
│ - id, name, country, city, branding                         │
│ - subscription_tier, api_key, created_at                    │
└─────────────────────────────────────────────────────────────┘
       ↓
       ├─→ ┌─────────────────────────────────────────────────┐
           │ USERS (All roles unified)                        │
           │ - id, email, password_hash, role                │
           │ - first_name, last_name, avatar_url             │
           │ - school_id (nullable), email_verified          │
           └─────────────────────────────────────────────────┘
       │
       ├─→ ┌─────────────────────────────────────────────────┐
           │ STUDENT_PROFILES (Independent)                   │
           │ - id, user_id, language_preference              │
           │ - bio, avatar, created_at                        │
           └─────────────────────────────────────────────────┘
       │
       ├─→ ┌─────────────────────────────────────────────────┐
           │ TEACHER_PROFILES                                 │
           │ - id, user_id, school_id, qualifications        │
           │ - subject_expertise, bio                         │
           └─────────────────────────────────────────────────┘
       │
       ├─→ ┌─────────────────────────────────────────────────┐
           │ PRINCIPAL_PROFILES                               │
           │ - id, user_id, school_id, phone                 │
           │ - office_location                                │
           └─────────────────────────────────────────────────┘
       │
       └─→ ┌─────────────────────────────────────────────────┐
           │ SCHOOL_MEMBERSHIPS (Student-School Relation)    │
           │ - id, student_id, school_id                      │
           │ - status: 'pending'|'approved'|'rejected'        │
           │ - requested_at, approved_at, approved_by         │
           └─────────────────────────────────────────────────┘
```

### Key Relationships

- **Student**: Independent entity, can join multiple schools
- **School**: Tenant, isolates all data with `school_id`
- **SchoolMembership**: Maps students to schools with approval workflow
- **Teacher/Principal/Accountant**: Associated with school via `school_id`

## 4. DATABASE SCHEMA (PostgreSQL)

```sql
-- Core Tables
CREATE TABLE schools (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  city VARCHAR(100),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  api_key VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL, -- saas_admin, principal, teacher, accountant, supervisor, student
  school_id UUID REFERENCES schools(id),
  avatar_url VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_school_id (school_id)
);

CREATE TABLE student_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  language_preference VARCHAR(10) DEFAULT 'en-US',
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE school_memberships (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  UNIQUE(student_id, school_id)
);

CREATE TABLE classes (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id),
  name VARCHAR(255) NOT NULL,
  teacher_id UUID REFERENCES users(id),
  grade_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_school_id (school_id)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  school_id UUID UNIQUE NOT NULL REFERENCES schools(id),
  plan_type VARCHAR(50) NOT NULL, -- free, professional, enterprise
  monthly_cost DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_school_id (school_id),
  INDEX idx_created_at (created_at)
);
```

## 5. AUTHENTICATION SYSTEM

### Token Structure
```
Access Token (24h):
{
  sub: user_id,
  email: user_email,
  role: user_role,
  school_id: school_id (if applicable),
  exp: expiration_time,
  iat: issued_time
}

Refresh Token (7d):
{
  sub: user_id,
  type: 'refresh',
  exp: expiration_time,
  iat: issued_time
}
```

### Auth Flow
```
1. POST /api/auth/login (email, password)
   → Validate credentials
   → Generate access + refresh tokens
   → Set httpOnly cookies
   → Return user profile
   
2. Token in httpOnly cookie (secure by default)
   
3. Middleware validates token on every request
   
4. On token expiry → POST /api/auth/refresh
   → Use refresh token
   → Issue new access token
   
5. POST /api/auth/logout
   → Clear cookies
   → Invalidate session
```

## 6. ROLE-BASED ACCESS CONTROL (RBAC)

### Routes & Permissions

```
/api/admin/*          → ONLY saas_admin
/api/schools/*        → saas_admin + principal
/api/teachers/*       → teacher + principal
/api/students/*       → student + teacher + principal
/api/classes/*        → teacher + principal + student
/api/billing/*        → accountant + principal + saas_admin
/dashboard/*          → Authenticated users (redirected by role)
/public/*             → NO auth required
```

### Role Hierarchy
```
saas_admin (System Owner)
  ├─ Can create/manage schools
  ├─ Can approve school registrations
  ├─ Can view all platform analytics
  └─ Can manage subscriptions

principal (School Admin)
  ├─ Can manage schoolstaff
  ├─ Can invite teachers/staff
  ├─ Can approve student join requests
  └─ Can view school analytics

teacher (Educator)
  ├─ Can create lessons
  ├─ Can manage classes
  ├─ Can view student progress
  └─ Can assign work

accountant (Finance)
  ├─ Can view payments
  ├─ Can generate invoices
  └─ Can manage fees

student (Learner)
  ├─ Can join schools
  ├─ Can submit work
  ├─ Can view progress
  └─ Can communicate with teacher
```

## 7. REQUIRED APIs

### Authentication
- POST /api/auth/login
- POST /api/auth/signup
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/verify-email
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

### Schools (SaaS Admin)
- POST /api/schools (create school)
- GET /api/schools (list all)
- GET /api/schools/:id (get details)
- PATCH /api/schools/:id (update)
- POST /api/schools/:id/approve (approve registration)
- POST /api/schools/:id/reject (reject registration)

### School Staff (Principal)
- POST /api/schools/:id/staff (invite staff)
- GET /api/schools/:id/staff (list staff)
- DELETE /api/schools/:id/staff/:userId (remove staff)
- PATCH /api/schools/:id/staff/:userId (update role)

### Students (Independent)
- POST /api/schools/:id/join-request (request to join)
- GET /api/students/my-schools (get enrolled schools)
- GET /api/students/discover-schools (find schools)
- POST /api/schools/:id/join-requests/:requestId/approve
- POST /api/schools/:id/join-requests/:requestId/reject

### Classes & Curriculum (Teacher)
- POST /api/classes (create class)
- GET /api/classes (list owned classes)
- POST /api/classes/:id/students (enroll student)
- GET /api/classes/:id/students (list students)
- POST /api/lessons (create lesson)
- POST /api/quizzes (create quiz)

### Billing (Accountant)
- GET /api/payments (list payments)
- POST /api/payments (process payment)
- GET /api/invoices (list invoices)
- GET /api/subscriptions (view subscription)

## 8. REQUIRED PAGES

### Public Pages (No Auth)
- `/` - Landing page
- `/about` - Company info  
- `/features` - Feature overview
- `/pricing` - Pricing tiers
- `/contact` - Contact form
- `/auth/login` - Login form
- `/auth/signup` - Signup selector
- `/auth/signup/student` - Student signup
- `/auth/signup/teacher` - Teacher signup (requires school code)
- `/auth/signup/principal` - Principal signup (requires school code)
- `/register-school` - School registration form
- `/auth/forgot-password` - Password recovery

### Protected Pages (Auth Required)
- `/dashboard` - Role-based router
- `/dashboard/student` - Student dashboard
- `/dashboard/teacher` - Teacher dashboard
- `/dashboard/principal` - Principal dashboard
- `/dashboard/accountant` - Accountant dashboard
- `/admin/dashboard` - SaaS admin dashboard
- `/student/explore-schools` - School discovery
- `/student/my-schools` - Enrolled schools
- `/account/profile` - User profile
- `/account/settings` - Settings

## 9. BRANDING REQUIREMENTS

### LearnAI.study Integration
- Footer: "Designed and operated by LearnAI.study"
- Landing page tagline
- About page attribution
- Documentation
- Support pages: support@learnaistudyplatform.com or similar

### Visual Guidelines
- Keep consistent across all pages
- Professional SaaS design
- No overuse - subtle integration
- Maintain product identity while acknowledging platform

## 10. TECHNICAL STACK

- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, PostgreSQL
- **Auth**: JWT (jose library), httpOnly cookies
- **Passwords**: PBKDF2 with crypto module (or bcryptjs for production)
- **Emails**: SendGrid / Mailgun (TBD)
- **Payment**: Stripe (TBD)
- **Logging**: Custom logger
- **Package Manager**: pnpm

## 11. DEPLOYMENT & INFRASTRUCTURE

- **Hosting**: Vercel (Next.js optimized)
- **Database**: PostgreSQL (managed service like AWS RDS)
- **Monitoring**: Built-in logging + monitoring service
- **CDN**: Vercel Edge Network
- **Email Delivery**: SendGrid APIs
- **Payment**: Stripe APIs

## 12. CRITICAL SUCCESS FACTORS

✅ **Security**
- HTTPS only
- CSRF tokens
- Rate limiting
- Input validation
- Secure password hashing
- httpOnly cookies

✅ **Multi-Tenancy**
- All queries filtered by school_id
- Data isolation guaranteed
- No cross-tenant data leaks

✅ **User Experience**
- Fast page loads
- Responsive design
- Clear navigation
- Error messages
- Success confirmations

✅ **Performance**
- Database indexing
- Caching strategies
- Optimized queries
- CDN for static assets

## 13. PHASED IMPLEMENTATION

### Phase 1: Foundation
- [x] Public landing page + pages
- [x] Authentication system
- [x] Database setup
- [ ] Middleware + RBAC

### Phase 2: Core Workflows
- [ ] SaaS admin dashboard
- [ ] School registration & approval
- [ ] School staff management
- [ ] School principal dashboard

### Phase 3: Student Features
- [ ] Student signup & profile
- [ ] School discovery
- [ ] Join requests workflow
- [ ] Student dashboard

### Phase 4: Learning Platform
- [ ] Teacher dashboard
- [ ] Class management
- [ ] Lesson creation
- [ ] Quiz system
- [ ] Progress tracking

### Phase 5: Financial
- [ ] Billing system
- [ ] Payment integration
- [ ] Invoice generation
- [ ] Accountant dashboard

### Phase 6: Polish & Deploy
- [ ] Full end-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Launch

---

**Next Steps**: Implement Phase 1 foundation fully before moving to Phase 2.
