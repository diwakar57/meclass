# OpenMAIC/LearnAI - ACTIONABLE GAP FIXES REFERENCE

**Quick Links for Developers**

---

## I. CRITICAL MISSING UI PAGES (Must Implement First)

### A. STUDENT MODULE - Missing Pages (Severity: CRITICAL)

#### 1. `/dashboard/student/profile`
**Connects to:** `/api/students/profile` (GET/PUT)
**Should Display:**
- Avatar upload
- First/Last name editing
- Email (read-only)
- Learning preferences/style
- Grade level
- Interests/subjects

**Estimated Effort:** 4-6 hours
**Dependencies:** None

---

#### 2. `/dashboard/student/progress`
**Connects to:** `/api/learning-plan/[curriculumId]` and `/api/students/progress`
**Should Display:**
- Overall progress percentage
- Progress by curriculum
- Topic completion rates
- Learning path timeline
- Estimated completion dates
- Recent activity

**Estimated Effort:** 8-12 hours
**Dependencies:** Student progress calculations

---

#### 3. `/dashboard/student/learning-dna`
**Connects to:** `/api/students/learning-dna`
**Should Display:**
- Pace type (fast/slow learner)
- Mistake patterns (identifies common errors)
- Preferred learning style (visual/auditory/kinesthetic)
- Confidence score
- Learning recommendations based on DNA

**Estimated Effort:** 6-8 hours
**Dependencies:** Diagnostic assessment system

---

#### 4. `/dashboard/student/schools`
**Connects to:** `/api/student/schools` and `/api/student/schools/discover`
**Two Sub-sections:**

**a) Enrolled Schools**
- List of schools student has joined
- Role in each school
- Status (active/pending)
- Action: View school

**b) Discover Schools**
- Search/filter schools
- Browse approved schools
- Action: Request to join → POST `/api/student/schools/[schoolId]/join`
- Show pending requests

**Estimated Effort:** 10-14 hours
**Dependencies:** School discovery API

---

#### 5. `/dashboard/student/tests`
**Connects to:** `/api/test-attempts` and `/api/diagnostic-test/[id]`
**Should Display:**
- List of all tests taken
- Test name, date, score, time
- Status (completed/in-progress)
- Mastery level by topic
- Actions: Retake, Review transcript
- Filter by status/topic

**Estimated Effort:** 8-10 hours
**Dependencies:** Test attempt storage

---

#### 6. `/dashboard/student/topics`
**Connects to:** `/api/learning-plan/[curriculumId]` (topic breakdowns)
**Should Display:**
- Topic mastery visualization
- Resources for each topic
- Quiz scores per topic
- Progress timeline
- Recommended next topics
- Actions: Take quiz, View resources

**Estimated Effort:** 8-10 hours
**Dependencies:** Topic progress tracking

---

### B. PRINCIPAL/SCHOOL MANAGEMENT - Missing Pages (Severity: CRITICAL)

#### 1. `/dashboard/principal/billing`
**Connects to:** `/api/billing/*`, `/api/billing/lifecycle`
**Should Display:**
- Current subscription tier
- Monthly cost
- Student limit/usage
- Next billing date
- Billing history
- Actions: Upgrade/downgrade plan, View invoices
- Payment method management

**Estimated Effort:** 12-16 hours
**Dependencies:** Stripe integration

---

#### 2. `/dashboard/principal/fees`
**Connects to:** `/api/school/fee-structures`, `/api/school/student-payments`
**Should Display:**
- Define fee types (tuition, activity, etc.)
- Fee amounts and frequency
- Applicable grades
- Edit/delete fees
- View student payment status

**Estimated Effort:** 8-10 hours
**Dependencies:** Fee structure schema

---

#### 3. `/dashboard/principal/payments`
**Connects to:** `/api/school/student-payments`
**Should Display:**
- Student fee status
- Payment history
- Outstanding fees
- Overdue invoices
- Receipts/documentation
- Bulk payment operations

**Estimated Effort:** 10-12 hours
**Dependencies:** Payment tracking system

---

#### 4. `/dashboard/principal/staff`
**Connects to:** `/api/principal/staff`, `/api/schools/[schoolId]/staff`
**Should Display:**
- List of school staff
- Name, email, role, department
- Date joined
- Qualifications
- Actions: Add staff, Edit, Deactivate, Remove

**Estimated Effort:** 6-8 hours
**Dependencies:** Staff creation API

---

#### 5. `/dashboard/principal/schools`
**Connects to:** `/api/principal/schools`
**Should Display:**
- List of schools managed by principal
- Student/teacher counts
- Status (active/pending)
- Quick actions
- Navigate to each school's dashboard

**Estimated Effort:** 4-6 hours
**Dependencies:** Multi-school management

---

#### 6. `/dashboard/principal/settings`
**Connects to:** School settings API (TBD)
**Should Display:**
- School name & logo
- Domain/branding
- Notification preferences
- Feature toggles
- Integration settings

**Estimated Effort:** 6-8 hours
**Dependencies:** Settings storage schema

---

### C. TEACHER MANAGEMENT - Missing Pages (Severity: CRITICAL)

#### 1. `/dashboard/teacher/classes`
**Connects to:** `/api/teacher/classes`
**Should Display:**
- List of classes taught
- Student count per class
- Grade level, subject
- Creation date
- Actions: View class, Edit, Delete, Manage students

**Estimated Effort:** 6-8 hours
**Dependencies:** Class creation/listing working

---

#### 2. `/dashboard/teacher/classes/[classId]`
**Connects to:** `/api/teacher/classes/[classId]`
**Should Display:**
- Class details (name, description, grade, subject)
- Student roster
- Upcoming assignments
- Class announcements
- Class documents
- Actions: Edit details, Archive, Export roster

**Estimated Effort:** 8-10 hours
**Dependencies:** Class detail API

---

#### 3. `/dashboard/teacher/classes/[classId]/students`
**Connects to:** `/api/teacher/classes/[classId]/students`
**Should Display:**
- Enrolled students list
- Performance summary per student
- Actions: Remove student, View detail, Send message
- Bulk operations

**Estimated Effort:** 6-8 hours
**Dependencies:** Student enrollment API

---

#### 4. `/dashboard/teacher/assignments`
**Connects to:** Assignment API (TBD)
**Should Display:**
- Create new assignment
- List of assignments
- Due dates
- Submission status
- Grading status
- Actions: Edit, Grade, Download submissions

**Note:** Assignment creation may need backend API development

**Estimated Effort:** 16-20 hours (includes API)
**Dependencies:** Assignment schema & API

---

#### 5. `/dashboard/teacher/grades`
**Connects to:** Grade tracking API
**Should Display:**
- Grade book by assignment
- Student grades
- Class statistics (mean, median)
- Grade distribution
- Export grades
- Adjust grades if needed

**Estimated Effort:** 10-12 hours
**Dependencies:** Grade tracking system

---

### D. BILLING & ACCOUNTING - Missing Pages (Severity: CRITICAL)

#### 1. `/dashboard/accountant/billing`
**Connects to:** `/api/accountant/billing`
**Should Display:**
- Detailed billing records by school
- Outstanding fees
- Collection status
- Payment history per school
- Overdue tracking
- Actions: Send invoice reminder, Mark as paid

**Estimated Effort:** 10-12 hours
**Dependencies:** Billing data schema

---

#### 2. `/admin/dashboard` (SaaS Admin Panel)
**Multi-page section with tabs/sidebar:**

**a) Schools Management**
**Connects to:** `/api/admin/schools`, `/api/admin/schools/[schoolId]`
**Features:**
- Pending schools (with approve/reject buttons)
- Active schools list
- Suspended/rejected schools
- Actions: Approve, Reject, Suspend, Activate, View details
- School billing status

**b) Analytics**
**Connects to:** `/api/admin/analytics`
**Features:**
- Platform usage metrics
- Revenue overview
- User growth trends
- System health

**c) User Management**
**Connects to:** User management API (TBD)
**Features:**
- List users by role
- User accounts
- Filter/search
- Actions: Activate, Deactivate, Reset password

**d) Settings**
**Connects to:** Platform settings API
**Features:**
- Feature flags
- API configuration
- Email settings
- System settings

**Estimated Effort:** 20-24 hours (comprehensive admin panel)
**Dependencies:** Admin APIs

---

## II. BROKEN NAVIGATION TO FIX

### A. Fix Navbar Links
**File:** [components/navbar.tsx](components/navbar.tsx)

**Current Broken Links:**
```typescript
featureLinks = [
  { label: 'Messages', href: '/#messages' },        // ❌ No page
  { label: 'Announcements', href: '/#announcements' }, // ❌ No page
  { label: 'Homework', href: '/#homework' },        // ❌ No page
  { label: 'Assignments', href: '/#assignments' },  // ❌ No page
  { label: 'Dropbox', href: '/#dropbox' },          // ❌ No page
  { label: 'Grading', href: '/#grading' },          // ❌ No page
]
```

**Fix Options:**
1. Remove all non-existent links
2. Replace with actual dashboard features:
   - Student: `/dashboard/student/progress` `/dashboard/student/tests`
   - Teacher: `/dashboard/teacher/classes` `/dashboard/teacher/assignments`
   - Principal: `/dashboard/principal/analytics` `/dashboard/principal/members`

**Estimated Effort:** 2-3 hours

---

### B. Add Dashboard Sidebars
**Create Sidebar Components:**

**`StudentDashboardSidebar`:**
```
- Dashboard (home)
- Progress
- Topics
- Tests/Quizzes
- Schools
- Profile
- Settings
```

**`TeacherDashboardSidebar`:**
```
- Dashboard (home)
- Classes
- Assignments
- Grades
- Student alerts
- Syllabus
- Settings
```

**`PrincipalDashboardSidebar`:**
```
- Dashboard (home)
- Members
- Staff
- Billing
- Fees & Payments
- Schools (if multi)
- Reports
- Settings
```

**Estimated Effort:** 12-16 hours (all sidebars)

---

### C. Fix Role Redirect Routes
**File:** [app/dashboard/page.tsx](app/dashboard/page.tsx)

**Current Issue:** Middleware has `/dashboard/admin` but actual page location unclear

**Fix:**
```typescript
// Consistent mapping throughout:
const dashboardMap = {
  student: '/dashboard/student',
  teacher: '/dashboard/teacher',
  principal: '/dashboard/principal',
  accountant: '/dashboard/accountant',
  supervisor: '/dashboard/supervisor',
  parent: '/dashboard/parent',
  saas_admin: '/admin/dashboard',  // Create this path
}
```

**File to create:** `/app/admin/dashboard/page.tsx`

**Estimated Effort:** 4-6 hours

---

## III. BACKEND APIS THAT NEED FRONTEND (No Backend Work)

| API Endpoint | Frontend Needed | Priority | Effort |
|---|---|---|---|
| `/api/students/profile` | Profile page | HIGH | 4h |
| `/api/students/learning-dna` | Learning DNA page | HIGH | 6h |
| `/api/student/schools` | Schools list page | HIGH | 6h |
| `/api/teacher/classes` | Classes management | CRITICAL | 8h |
| `/api/teacher/students/[id]/performance` | Student detail page | HIGH | 6h |
| `/api/principal/staff` | Staff management | HIGH | 6h |
| `/api/billing/lifecycle` | Subscription mgmt | CRITICAL | 8h |
| `/api/school/student-payments` | Payment tracking | CRITICAL | 8h |
| `/api/school/fee-structures` | Fee management | CRITICAL | 8h |
| `/api/school/api-keys` | API key mgmt | MEDIUM | 6h |
| `/api/admin/*` | Admin dashboard | HIGH | 20h |
| `/api/certificates/*` | Certificate pages | MEDIUM | 8h |

---

## IV. APIS THAT NEED BACKEND + FRONTEND

| Feature | Backend Status | Frontend Status | Total Effort |
|---|---|---|---|
| Assignments | ❌ Missing | ❌ Missing | 30-40h |
| Attendance | ❌ Missing | ❌ Missing | 20-30h |
| Messaging System | ❌ Missing | ❌ Missing | 25-35h |
| 2FA Setup UI | ✅ API exists | ❌ Missing UI | 6-8h |
| Notifications | ✅ Basic API | ❌ Missing UI | 12-16h |
| Settings Pages | ❌ Partial | ❌ Missing | 15-20h |

---

## V. QUICK FIXES (< 4 hours each)

- [ ] Create `/dashboard/principal/schools` stub page
- [ ] Create `/dashboard/student/profile` basic form
- [ ] Fix navbar links to not point to `/#`
- [ ] Create `/admin/dashboard` redirect
- [ ] Add logout button to all dashboards
- [ ] Fix role redirects in middleware
- [ ] Create parent dashboard stub with placeholder
- [ ] Add "back to dashboard" links on all pages

---

## VI. PRIORITY ORDER FOR IMPLEMENTATION

### Week 1-2:
1. Student profile & progress pages
2. Fix navigation (sidebar, navbar)
3. Teacher classes management

### Week 3-4:
1. Principal billing & fees
2. Admin dashboard (basic)
3. Accountant billing

### Week 5-6:
1. Teacher assignments
2. Assessment/test pages
3. Certificate system

### Ongoing:
- Parent dashboard
- Settings pages
- Notifications
- Mobile optimization

---

## VII. FILE CHECKLIST FOR MISSING PAGES

Each new page should include:
- [ ] Page component (`*.tsx`)
- [ ] API integration/fetching
- [ ] Loading states
- [ ] Error handling
- [ ] Role/permission checks
- [ ] Mobile responsive design
- [ ] Accessibility (ARIA labels)
- [ ] Unit tests
- [ ] E2E tests
- [ ] Update middleware if needed
- [ ] Add to navigation
- [ ] Add breadcrumbs

---

## VIII. KEY FILES TO UPDATE

After creating pages, update:
1. **Middleware:** [middleware.ts](middleware.ts) - role-based access
2. **Navigation:** [components/navbar.tsx](components/navbar.tsx) - menu links
3. **Dashboard router:** [app/dashboard/page.tsx](app/dashboard/page.tsx) - role routing
4. **Types:** [lib/types/auth.ts](lib/types/auth.ts) - user roles
5. **Role redirects:** [lib/auth/role-redirects.ts](lib/auth/role-redirects.ts) - dashboard mapping

---

## IX. RECOMMENDED TEAM ALLOCATION

**For 2-4 week sprint to implement critical pages:**

**Developer 1 (Full-stack):**
- Student module (all 6 pages)
- Update navigation

**Developer 2 (Frontend):**
- Principal pages (5 pages)
- Accountant billing page
- Dashboard sidebars

**Developer 3 (Frontend + Backend):**
- Teacher pages (5 pages)
- Admin dashboard
- Fix any missing APIs

**Developer 4 (QA + Polish):**
- Testing all new pages
- Mobile optimization
- Accessibility fixes

---

## END OF REFERENCE DOCUMENT
