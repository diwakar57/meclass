# LearnAI SaaS Platform - Complete Architectural Specification

**Status:** Strategic Architecture Document  
**Version:** 1.0 - Foundation Phase  
**Date:** March 2026  
**Scope:** Transform LearnAI prototype into enterprise-grade SaaS  

---

## EXECUTIVE SUMMARY

LearnAI will evolve from an AI-powered LMS prototype into a **multi-tenant, scalable, monetizable SaaS platform** serving hundreds of schools globally.

**Key Transformation:**
- **From:** Single-instance AI LMS
- **To:** Multi-tenant enterprise platform with advanced monetization, governance, and intelligence

**Revenue Model:** Per-school + per-student + usage-based (hybrid SaaS)

---

## PLATFORM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    SAAS CONTROL PLANE                        │
│  (Platform Admin, Billing, Analytics, Monitoring)            │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│              TENANT MANAGEMENT LAYER                         │
│  (Tenant Provisioning, Configuration, Data Isolation)        │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│              TENANT APPLICATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ School A Instance   │ School B Instance          │   │   │
│  │ ┌────────────────┐   │ ┌────────────────┐       │   │   │
│  │ │ LMS Core       │   │ │ LMS Core       │       │   │   │
│  │ │ AI Teaching    │   │ │ AI Teaching    │       │   │   │
│  │ │ Dashboards     │   │ │ Dashboards     │       │   │   │
│  │ └────────────────┘   │ └────────────────┘       │   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│              SHARED INFRASTRUCTURE                           │
│  (Database, Storage, AI APIs, Job Queue, Cache)             │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASED IMPLEMENTATION ROADMAP

### PHASE 1: FOUNDATION (Weeks 1-4)
**Objective:** Build core SaaS infrastructure - make platform multi-tenant and monetizable

**Deliverables:**
- ✅ Tenant management system (provisioning, config, isolation)
- ✅ Billing engine (plans, subscriptions, tracking)
- ✅ Enhanced RBAC (SaaS admin, school admin separation)
- ✅ Audit logging system
- ✅ Admin dashboard (metrics, tenant management)
- ✅ Usage tracking (AI sessions, storage, API calls)

**Models to Add:** 20+  
**APIs to Add:** 35+  
**Database Migration:** Yes  

**Business Impact:**
- Enable multiple schools on one instance
- Begin monetization through subscription tracking
- Establish security foundation
- $0 → First subscription pathway

---

### PHASE 2: MONETIZATION & SCALING (Weeks 5-8)
**Objective:** Full billing, revenue optimization, subscription lifecycle

**Deliverables:**
- ✅ Stripe integration (complete payment flow)
- ✅ Invoice generation (PDF, email)
- ✅ Usage-based pricing (AI sessions tracked → billed)
- ✅ Coupon/discount system
- ✅ Tenant limits enforcement (students, storage)
- ✅ Financial reporting & analytics
- ✅ Trial management system

**Business Impact:**
- Generate actual revenue
- MRR tracking capability
- ARR forecasting
- Churn detection & prevention
- Upsell/cross-sell opportunities

---

### PHASE 3: INTELLIGENCE & GOVERNANCE (Weeks 9-12)
**Objective:** Advanced analytics, AI governance, configuration flexibility

**Deliverables:**
- ✅ Configuration engine (grading systems, policies)
- ✅ AI governance layer (explainable AI, moderation)
- ✅ Advanced learning analytics (cohort, skill graphs)
- ✅ Predictive intelligence (at-risk students, optimized pathways)
- ✅ Content configuration system

**Business Impact:**
- Sell premium analytics
- Build moat through AI intelligence
- Enable enterprise customization
- Support FERPA/GDPR compliance

---

### PHASE 4: ENTERPRISE FEATURES (Weeks 13-16)
**Objective:** Full enterprise feature set, content ecosystem, scalability

**Deliverables:**
- ✅ Communication system (messaging, announcements)
- ✅ Academic operations (calendar, schedule, exams)
- ✅ Content marketplace (prebuilt content, teacher marketplace)
- ✅ SSO integration (Google, Microsoft, school systems)
- ✅ Multi-region deployment
- ✅ Advanced security (session tracking, IP whitelisting)

**Business Impact:**
- Lock-in enterprise customers
- Generate content revenue
- Support global expansion
- Enterprise pricing ($50K+/year)

---

## PHASE 1 DETAILED SPECIFICATION

### 1. MULTI-TENANT MANAGEMENT SYSTEM

**Core Concept:**
Each school is an isolated tenant with:
- Separate database schema (logical isolation via schoolId)
- Separate configuration
- Separate branding
- Strict data isolation at API level

#### Prisma Models Required:

```prisma
model School {
  id                    String    @id @default(cuid())
  name                  String
  email                 String    @unique
  slug                  String    @unique  // for URL: learnai.com/school/{slug}
  
  // Tenant metadata
  description           String?
  website               String?
  phone                 String?
  address               String?
  city                  String?
  state                 String?
  country               String?
  postalCode            String?
  
  // Branding
  logoUrl               String?
  primaryColor          String?   @default("#1a73e8")
  secondaryColor        String?   @default("#fbbc04")
  
  // Configuration
  config                SchoolConfig?
  
  // Subscription
  subscriptionId        String?
  subscription          Subscription?
  
  // Status
  status                SchoolStatus  @default(ACTIVE)  // ACTIVE, SUSPENDED, PAUSED, CANCELED, TRIAL
  tier                  SubscriptionTier  @default(BASIC)
  
  // Limits
  studentLimit          Int       @default(500)
  storageGB             Int       @default(100)
  aiSessionsPerMonth    Int       @default(1000)
  staffLimit            Int       @default(50)
  
  // Tracking
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  suspendedAt           DateTime?
  trialEndsAt           DateTime?
  
  // Relations
  users                 User[]
  classes               Class[]
  courses               Course[]
  subscriptions         Subscription[]
  auditLogs             AuditLog[]
  usageMetrics          UsageMetric[]
  
  @@index([status])
  @@index([tier])
}

model SchoolConfig {
  id                      String    @id @default(cuid())
  schoolId                String    @unique
  school                  School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  // Academic settings
  gradingScale            GradingScale  @default(PERCENTAGE)  // PERCENTAGE, LETTER, CUSTOM
  customGradingScaleJson  String?   // JSON for custom scales
  
  attendanceThreshold     Int       @default(80)  // Minimum attendance %
  passingGrade            Float     @default(60)  // Minimum grade to pass
  
  // AI behavior
  aiMode                  AIMode    @default(ADAPTIVE)  // STRICT, ADAPTIVE, EXPLORATION
  explainableAI           Boolean   @default(true)
  contentSafetyLevel      Int       @default(8)  // 1-10 strictness
  
  // Localization
  language                String    @default("en")
  timezone                String    @default("UTC")
  dateFormat              String    @default("MM/DD/YYYY")
  currencyCode            String    @default("USD")
  
  // Academic calendar
  academicYearStart       DateTime?
  academicYearEnd         DateTime?
  
  // Features enabled/disabled
  enableAI                Boolean   @default(true)
  enableContentMarket      Boolean   @default(true)
  enableSSO               Boolean   @default(false)
  enableAdvancedReports   Boolean   @default(false)
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

enum SchoolStatus {
  ACTIVE
  SUSPENDED
  PAUSED
  CANCELED
  TRIAL
}

enum SubscriptionTier {
  BASIC
  PRO
  ENTERPRISE
}

enum AIMode {
  STRICT        // Immediate feedback, no exploration
  ADAPTIVE      // Adapts to student pace
  EXPLORATION   // Student-driven exploration
}

enum GradingScale {
  PERCENTAGE
  LETTER
  CUSTOM
}

model Subscription {
  id                      String    @id @default(cuid())
  schoolId                String    @unique
  school                  School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  // Plan details
  tier                    SubscriptionTier
  monthlyPrice            Float
  annualPrice             Float?
  billingCycle            BillingCycle  @default(MONTHLY)  // MONTHLY, ANNUAL
  
  // Status tracking
  status                  SubscriptionStatus  @default(ACTIVE)
  startDate               DateTime
  currentPeriodStart      DateTime
  currentPeriodEnd        DateTime
  renewalDate             DateTime
  
  // Cancellation/Pause
  pausedAt                DateTime?
  canceledAt              DateTime?
  cancellationReason      String?
  
  // Payment
  stripeSubscriptionId    String?
  paymentMethodId         String?
  
  // Trial
  trialEndsAt             DateTime?
  isTrialActive           Boolean   @default(false)
  
  // Usage tracking
  currentMonthUsage       Int       @default(0)
  overage                 Float     @default(0)  // Additional charges
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  invoices                Invoice[]
  usageMetrics            UsageMetric[]
  
  @@index([status])
}

enum SubscriptionStatus {
  ACTIVE
  PAUSED
  PAST_DUE
  CANCELED
  EXPIRED
}

enum BillingCycle {
  MONTHLY
  ANNUAL
}

model Invoice {
  id                      String    @id @default(cuid())
  subscriptionId          String
  subscription            Subscription  @relation(fields: [subscriptionId], references: [id])
  
  // Invoice details
  invoiceNumber           String    @unique
  status                  InvoiceStatus  @default(DRAFT)
  
  // Amounts
  subtotal                Float
  tax                     Float
  total                   Float
  
  // Line items
  items                   InvoiceItem[]
  
  // Dates
  createdAt               DateTime  @default(now())
  dueDateAt               DateTime
  paidAt                  DateTime?
  
  // PDF
  pdfUrl                  String?
  
  // Payment
  stripeInvoiceId         String?
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  OVERDUE
}

model InvoiceItem {
  id                      String    @id @default(cuid())
  invoiceId               String
  invoice                 Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  description             String
  quantity                Int
  unitPrice               Float
  total                   Float
  
  createdAt               DateTime  @default(now())
}

model UsageMetric {
  id                      String    @id @default(cuid())
  schoolId                String
  school                  School    @relation(fields: [schoolId], references: [id])
  
  subscriptionId          String?
  subscription            Subscription?  @relation(fields: [subscriptionId], references: [id])
  
  // Usage tracking
  metricType              UsageType  // AI_SESSIONS, STORAGE_GB, API_CALLS, STUDENTS
  metricValue             Float
  
  // Billing period
  billingMonth            String    // YYYY-MM
  
  createdAt               DateTime  @default(now())
  
  @@index([schoolId])
  @@index([billingMonth])
}

enum UsageType {
  AI_SESSIONS
  STORAGE_GB
  API_CALLS
  ACTIVE_STUDENTS
}

model AuditLog {
  id                      String    @id @default(cuid())
  schoolId                String
  school                  School    @relation(fields: [schoolId], references: [id])
  
  // Action details
  action                  String    // create_school, update_user, delete_class, etc
  targetType              String    // School, User, Class, etc
  targetId                String?
  
  // Who did it
  actor                   User?     @relation(fields: [actorId], references: [id])
  actorId                 String?
  
  // What changed
  changes                 String?   // JSON diff
  
  // Context
  ipAddress               String?
  userAgent               String?
  
  createdAt               DateTime  @default(now())
  
  @@index([schoolId])
  @@index([action])
}
```

#### Services Required:

**TenantService:**
- `createTenant(name, email)` → new school instance
- `updateTenantConfig(schoolId, config)` → update settings
- `getTenantMetrics(schoolId)` → school stats
- `validateTenantDataIsolation()` → ensure isolation
- `suspendTenant(schoolId)` → disable access
- `deleteTenant(schoolId)` → full cleanup

**BillingService:**
- `createSubscription(schoolId, tier)` → new subscription
- `updateSubscription(subscriptionId, updates)` → change plan
- `cancelSubscription(subscriptionId)` → cancel with reason
- `pauseSubscription(subscriptionId)` → temporary pause
- `trackUsage(schoolId, metricType, value)` → usage tracking
- `generateInvoice(subscriptionId, period)` → invoice creation
- `calculateOverages(subscriptionId)` → usage-based pricing

**AuditService:**
- `logAction(schoolId, action, targetType, targetId, actorId, changes)` → audit trail
- `getAuditLogs(schoolId, filters)` → retrieve logs
- `auditableAction(action, fn)` → wrapper for tracked operations

#### APIs Required:

**Tenant Management:**
- POST `/api/admin/tenants` - Create new school
- GET `/api/admin/tenants` - List all schools
- GET `/api/admin/tenants/[id]` - School details
- PUT `/api/admin/tenants/[id]` - Update school
- DELETE `/api/admin/tenants/[id]` - Delete school
- PUT `/api/admin/tenants/[id]/config` - Update config

**Subscription:**
- POST `/api/admin/subscriptions` - Create subscription
- GET `/api/subscriptions/current` - School's current subscription
- PUT `/api/subscriptions/upgrade` - Upgrade plan (stripe webhook)
- POST `/api/subscriptions/cancel-request` - Request cancellation

**Billing:**
- GET `/api/billing/invoices` - School invoices
- GET `/api/billing/usage` - Current usage metrics
- GET `/api/billing/forecast` - Projected overage

**Audit:**
- GET `/api/admin/audit-logs` - Platform audit logs
- GET `/api/school/audit-logs` - School-level audit logs

#### Data Isolation Strategy:

```typescript
// Middleware: Enforce schoolId in all queries
export async function enforceSchoolIsolation(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return null;
  
  // schoolId comes from user's context
  return auth.schoolId;  // ALL queries must filter by schoolId
}

// Example API pattern:
export async function GET(req: NextRequest) {
  const schoolId = await enforceSchoolIsolation(req);
  
  const data = await prisma.someModel.findMany({
    where: { 
      schoolId,  // ALWAYS REQUIRED
      ...otherFilters 
    }
  });
}
```

---

### 2. BILLING & MONETIZATION ENGINE

**Business Model:**

| Tier | Monthly | Per-Student | AI Sessions | Storage | Price/Month |
|------|---------|-------------|-------------|---------|------------|
| BASIC | $99 | - | 100 | 50GB | $99 |
| PRO | $299 | $0 | 1000 | 500GB | $299 |
| ENTERPRISE | Custom | $5/student | Unlimited | 1TB+ | $5000+ |

**Pricing Logic:**
```
Monthly Bill = Base Plan Price + Usage Overages

Overages:
- AI Sessions: $0.10/session beyond limit
- Storage: $2/GB beyond included
- Students: $5/student beyond included (Enterprise)
- API Calls: $0.001/call beyond limit
```

#### Sample Subscription Lifecycle:

```
Trial (14 days) 
  ↓
Free trial expires → Needs payment method
  ↓
Active (first payment collected)
  ↓
Auto-renew each month/year
  ├─ Payment success → Renew
  ├─ Payment fails → Past Due (7 days retry)
  └─ Manual cancel → Canceled (end at period end)
```

---

### 3. RBAC EXPANSION

**New SaaS Roles:**

```
┌─ PLATFORM LEVEL (Global)
│  ├─ SAAS_ADMIN (full platform access, all tenants)
│  └─ SAAS_ANALYST (metrics, no data access)
│
├─ SCHOOL LEVEL (Per Tenant)
│  ├─ SCHOOL_ADMIN (full school access, billing)
│  ├─ PRINCIPAL (academic management)
│  ├─ TEACHER
│  ├─ PARENT
│  └─ STUDENT
│
└─ Internal Tools (Support, Operations)
   ├─ SUPPORT_AGENT (impersonation, manual fixes)
   └─ OPS_ENGINEER (system monitoring, health)
```

**Permission Matrix:**

```prisma
model Permission {
  id        String @id
  resource  String  // schools, subscriptions, users, content
  action    String  // create, read, update, delete, manage
  role      String  // SAAS_ADMIN, SCHOOL_ADMIN, etc
}

// Example: SAAS_ADMIN can view all schools + subscriptions
// Example: SCHOOL_ADMIN can view only their school
// Example: TEACHER can view only their classes
```

---

### 4. USAGE TRACKING SYSTEM

**What to Track:**
- AI session count (per school, per month)
- Storage used (total files, media)
- API calls (paid tier: unlimited, others: 10K/month limit)
- Active students (daily, monthly)
- Student engagement (login count, time spent)

**Implementation:**

```typescript
// Track usage on completion
async function trackAISessionUsage(schoolId: string) {
  await auditService.trackUsage(schoolId, 'AI_SESSIONS', 1);
  
  // Check if over limit
  const school = await getSchool(schoolId);
  const usage = await getMonthlyUsage(schoolId);
  
  if (usage.aiSessions > school.subscription.aiSessionsPerMonth) {
    // Apply overage: $0.10/session
    const overageCount = usage.aiSessions - school.subscription.aiSessionsPerMonth;
    const overageCharge = overageCount * 0.10;
    
    await auditService.recordOverage(schoolId, overageCharge);
  }
}
```

---

## IMPLEMENTATION TIMELINE

| Week | Deliverable | Priority |
|------|-------------|----------|
| W1 | Tenant models, TenantService, tenant CRUD APIs | P0 |
| W1-W2 | Subscription models, BillingService, basic subscription APIs | P0 |
| W2 | RBAC expansion, permission checking middleware | P0 |
| W2-W3 | Audit logging system, AuditService | P0 |
| W3 | Admin dashboard (React), metrics visualizations | P1 |
| W3-W4 | Usage tracking, invoice generation | P0 |
| W4 | Stripe integration (test mode), trial system | P1 |
| W5+ | PHASE 2 begins (full monetization) | P0 |

---

## SECURITY CONSIDERATIONS

1. **Data Isolation:**
   - Every query must filter by `schoolId`
   - No cross-tenant data leaks
   - Middleware enforces at API level

2. **Audit Trail:**
   - Every write operation logged
   - Actor tracking (who + when + what)
   - Analysis for compliance

3. **Encryption:**
   - Database encryption at rest (RDS encryption)
   - TLS in transit
   - Sensitive data (payment info) encrypted

4. **Access Control:**
   - JWT tokens include `schoolId`
   - RBAC enforced on every endpoint
   - Admin overrides logged separately

---

## BUSINESS METRICS

**Key KPIs to Track:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn Rate (% schools canceling/month)
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value per customer)
- Usage growth (AI sessions/month trending up?)
- System health (uptime, response times)

**Dashboard Should Show:**
```
Platform Metrics:
├─ Total Schools: 250
├─ MRR: $45,000
├─ ARR: $540,000
├─ Churn: 5%
├─ Active Students: 125,000
├─ AI Sessions Used: 2.5M/month
└─ Revenue per Student: $4.32

Top Schools:
├─ School A: 5,000 students
├─ School B: 3,200 students
└─ School C: 2,100 students
```

---

## RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data isolation breach | Critical | Code review, automated tests, quarterly audits |
| Billing system bugs | High | Extensive testing, manual payment verification |
| Stripe integration issues | High | Webhook monitoring, fallback payment processing |
| Performance degradation under load | High | Connection pooling, query optimization, caching |
| Tenant data loss | Critical | Daily backups, point-in-time recovery testing |

---

## NEXT STEPS

1. **Approve PHASE 1 scope** ✓
2. **Create Prisma migration** (add 20+ models)
3. **Implement TenantService** (core provisioning)
4. **Implement BillingService** (subscription tracking)
5. **Build Admin Dashboard** (metrics visualization)
6. **Deploy to staging** (full test with 5 test tenants)
7. **Go live with PHASE 1** (enable multi-tenant, subscription tracking)
8. **Begin PHASE 2** (Stripe integration, revenue collection)

---

**Document Status:** Ready for implementation  
**Next: SaaS architecture code (models, services, APIs)**
