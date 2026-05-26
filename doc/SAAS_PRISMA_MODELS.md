// ============================================================================
// SAAS PLATFORM MODELS - ADD TO prisma/schema.prisma
// ============================================================================
// These models extend the existing schema with multi-tenant, billing, and 
// governance capabilities. Integrate into your existing schema.
// ============================================================================

// ============================================================================
// 1. TENANT & MULTI-TENANCY MODELS
// ============================================================================

model School {
  id                    String    @id @default(cuid())
  name                  String
  email                 String    @unique
  slug                  String    @unique
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
  brandJsonConfig       String?   @default("{}")  // JSON: primaryColor, secondaryColor, etc
  
  // Configuration  
  configId              String?   @unique
  config                SchoolConfig?
  
  // Subscription
  subscriptionId        String?   @unique
  subscription          Subscription?
  
  // Status & Tier
  status                SchoolStatus  @default(ACTIVE)
  tier                  SubscriptionTier  @default(BASIC)
  
  // Usage Limits
  studentLimit          Int       @default(500)
  storageGB             Int       @default(100)
  aiSessionsPerMonth    Int       @default(1000)
  staffLimit            Int       @default(50)
  apiCallsPerMonth      Int       @default(10000)
  
  // Dates
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  suspendedAt           DateTime?
  trialEndsAt           DateTime?
  lastActivityAt        DateTime  @default(now())
  
  // Relations
  users                 User[]
  classes               Class[]
  courses               Course[]
  subjects              Subject[]
  gradeLevels           GradeLevel[]
  
  subscriptions         Subscription[]
  auditLogs             AuditLog[]
  usageMetrics          UsageMetric[]
  invoices              Invoice[]
  
  schoolConfigs         SchoolConfig[]
  
  @@index([status])
  @@index([tier])
  @@index([slug])
  @@index([createdAt])
}

enum SchoolStatus {
  ACTIVE        // Fully operational
  SUSPENDED     // Admin suspended (can restore)
  PAUSED        // School paused subscription
  TRIAL         // In trial period
  CANCELED      // Subscription canceled
  DELINQUENT    // Payment overdue
}

enum SubscriptionTier {
  BASIC         // Small schools: 500 students
  PRO           // Medium schools: 2000 students
  ENTERPRISE    // Large/custom: unlimited
  FREEMIUM      // Limited trial
}

model SchoolConfig {
  id                      String    @id @default(cuid())
  schoolId                String    @unique
  school                  School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  // Academic Settings
  defaultGradingScale     GradingScale  @default(PERCENTAGE)
  customGradingScaleJson  String?
  attendanceThreshold     Int       @default(80)
  passingGrade            Float     @default(60)
  
  // AI Configuration
  aiMode                  AIMode    @default(ADAPTIVE)
  explainableAI           Boolean   @default(true)
  contentSafetyLevel      Int       @default(8)
  aiResponseLanguage      String    @default("en")
  
  // Localization
  language                String    @default("en")
  timezone                String    @default("UTC")
  dateFormat              String    @default("MM/DD/YYYY")
  currencyCode            String    @default("USD")
  
  // Academic Calendar
  academicYearStart       String?   // ISO date YYYY-MM-DD
  academicYearEnd         String?
  
  // Feature Flags
  enableAI                Boolean   @default(true)
  enableContentMarket      Boolean   @default(false)
  enableSSO               Boolean   @default(false)
  enableAdvancedReports   Boolean   @default(false)
  enableApiAccess         Boolean   @default(false)
  enableCustomDomain      Boolean   @default(false)
  
  // Compliance
  dataResidency           String    @default("US")  // US, EU, etc
  retentionDaysStudentData Int      @default(2555)  // 7 years
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  @@index([schoolId])
}

enum AIMode {
  STRICT        // Immediate feedback, no exploration
  ADAPTIVE      // Adapts to pace
  EXPLORATION   // Student-driven
}

enum GradingScale {
  PERCENTAGE
  LETTER
  CUSTOM
  GPA
}

// ============================================================================
// 2. SUBSCRIPTION & BILLING MODELS
// ============================================================================

model Subscription {
  id                      String    @id @default(cuid())
  schoolId                String    @unique
  school                  School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  // Plan
  tier                    SubscriptionTier
  monthlyPrice            Float
  annualPrice             Float?
  billingCycle            BillingCycle  @default(MONTHLY)
  
  // Status
  status                  SubscriptionStatus  @default(ACTIVE)
  startDate               DateTime
  currentPeriodStart      DateTime
  currentPeriodEnd        DateTime
  renewalDate             DateTime
  
  // Pause/Cancel
  pausedAt                DateTime?
  pauseReason             String?
  canceledAt              DateTime?
  cancellationReason      String?
  
  // Payment
  stripeSubscriptionId    String?
  paymentMethodId         String?
  stripeCustomerId        String?
  
  // Trial
  trialEndsAt             DateTime?
  isTrialActive           Boolean   @default(false)
  trialDaysRemaining      Int       @default(14)
  
  // Usage Tracking
  currentMonthUsage       Int       @default(0)
  previousMonthUsage      Int       @default(0)
  overage                 Float     @default(0)
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  // Relations
  invoices                Invoice[]
  usageMetrics            UsageMetric[]
  
  @@index([status])
  @@index([stripeSubscriptionId])
}

enum SubscriptionStatus {
  ACTIVE
  PAUSED
  PAST_DUE
  CANCELED
  EXPIRED
  TRIAL
}

enum BillingCycle {
  MONTHLY
  ANNUAL
}

model Invoice {
  id                      String    @id @default(cuid())
  subscriptionId          String
  subscription            Subscription  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  schoolId                String
  school                  School    @relation(fields: [schoolId], references: [id])
  
  // Invoice Details
  invoiceNumber           String    @unique
  status                  InvoiceStatus  @default(DRAFT)
  
  // Amounts
  subtotal                Float
  tax                     Float
  taxRate                 Float     @default(0)
  total                   Float
  amountPaid              Float     @default(0)
  
  // Line Items
  items                   InvoiceItem[]
  
  // Dates
  issuedAt                DateTime  @default(now())
  dueDateAt               DateTime
  paidAt                  DateTime?
  
  // PDF
  pdfUrl                  String?
  
  // Payment Integration
  stripeInvoiceId         String?
  paymentAttempts         Int       @default(0)
  nextRetryAt             DateTime?
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  @@index([subscriptionId])
  @@index([schoolId])
  @@index([status])
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  PARTIALLY_PAID
  OVERDUE
  CANCELED
}

model InvoiceItem {
  id                      String    @id @default(cuid())
  invoiceId               String
  invoice                 Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  description             String
  type                    LineItemType  @default(BASE_PLAN)
  quantity                Int       @default(1)
  unitPrice               Float
  total                   Float
  
  metadataJson            String?   // Additional info (e.g., {year: 2026})
  
  createdAt               DateTime  @default(now())
  
  @@index([invoiceId])
}

enum LineItemType {
  BASE_PLAN
  OVERAGE
  DISCOUNT
  COUPON
  ADDITIONAL_STUDENT
  STORAGE
  API_CALLS
}

model UsageMetric {
  id                      String    @id @default(cuid())
  schoolId                String
  school                  School    @relation(fields: [schoolId], references: [id])
  
  subscriptionId          String?
  subscription            Subscription?  @relation(fields: [subscriptionId], references: [id])
  
  // Usage Type
  metricType              UsageType
  metricValue             Float
  
  // Billing Period
  billingMonth            String    // YYYY-MM
  
  createdAt               DateTime  @default(now())
  
  @@index([schoolId])
  @@index([billingMonth])
  @@index([metricType])
  @@composite([schoolId, billingMonth, metricType])
}

enum UsageType {
  AI_SESSIONS             // Count of AI teaching sessions
  STORAGE_GB              // Gigabytes used
  API_CALLS               // API calls made
  ACTIVE_STUDENTS         // Count of active students
  VIDEO_MINUTES           // Minutes of video watched
  EXPORTS                 // Number of exports
}

model Coupon {
  id                      String    @id @default(cuid())
  code                    String    @unique
  type                    CouponType
  value                   Float     // Amount or percentage
  
  // Validity
  validFrom               DateTime
  validUntil              DateTime
  maxUses                 Int?
  currentUses             Int       @default(0)
  
  // Applicability
  applicableTiers         String    // JSON: ["BASIC", "PRO"]
  minMonths               Int       @default(1)
  
  // Status
  isActive                Boolean   @default(true)
  createdBy               String    // Admin ID
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  @@index([code])
}

enum CouponType {
  PERCENTAGE
  FIXED_AMOUNT
  MONTHLY_DISCOUNT
  ANNUAL_DISCOUNT
}

// ============================================================================
// 3. AUDIT & GOVERNANCE MODELS
// ============================================================================

model AuditLog {
  id                      String    @id @default(cuid())
  schoolId                String
  school                  School    @relation(fields: [schoolId], references: [id])
  
  // Action
  action                  String    // create_school, update_user, delete_class, etc
  actionCategory          ActionCategory
  targetType              String    // School, User, Class, Subscription
  targetId                String?
  targetName              String?
  
  // Who Did It
  actorId                 String?
  actor                   User?     @relation(fields: [actorId], references: [id])
  actorEmail              String?
  
  // What Changed
  changesSummary          String?   // Human-readable summary
  changesJson             String?   // Full JSON diff
  
  // Context
  ipAddress               String?
  userAgent               String?
  origin                  String?   // admin_panel, api, webhook, system
  
  // Result
  success                 Boolean   @default(true)
  errorMessage            String?
  
  createdAt               DateTime  @default(now())
  
  @@index([schoolId])
  @@index([actionCategory])
  @@index([createdAt])
  @@index([actorId])
}

enum ActionCategory {
  TENANT_MANAGEMENT
  USER_MANAGEMENT
  SUBSCRIPTION
  BILLING
  CONTENT
  SECURITY
  SYSTEM
  COMPLIANCE
}

model SystemAuditLog {
  id                      String    @id @default(cuid())
  
  action                  String
  component               String    // BillingEngine, TenantService, etc
  severity                Severity
  
  message                 String
  metadata                String?   // JSON
  
  createdAt               DateTime  @default(now())
  
  @@index([action])
  @@index([severity])
  @@index([createdAt])
}

enum Severity {
  INFO
  WARNING
  ERROR
  CRITICAL
}

// ============================================================================
// 4. ADVANCED ANALYTICS MODELS (Future Phases)
// ============================================================================

model AnalyticsSnapshot {
  id                      String    @id @default(cuid())
  schoolId                String
  school                  School    @relation(fields: [schoolId], references: [id])
  
  // Daily snapshot of key metrics
  date                    DateTime
  
  totalStudents           Int
  activeStudents          Int
  totalTeachers           Int
  totalClasses            Int
  totalCourses            Int
  
  aiSessionsUsed          Int
  storageUsedGB           Float
  apiCallsUsed            Int
  
  averageStudentEngagement Float
  
  createdAt               DateTime  @default(now())
  
  @@index([schoolId, date])
}

// ============================================================================
// 5. SSO & IDENTITY MODELS (Future - Phase 4)
// ============================================================================

model SSOProvider {
  id                      String    @id @default(cuid())
  schoolId                String
  school                  School    @relation(fields: [schoolId], references: [id])
  
  type                    SSOType   // GOOGLE, MICROSOFT, CLEVER
  clientId                String
  clientSecret            String    // Encrypted
  
  enabled                 Boolean   @default(true)
  autoCreateUsers         Boolean   @default(true)  // Auto-create users from SSO
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  @@unique([schoolId, type])
  
  @@index([schoolId])
}

enum SSOType {
  GOOGLE
  MICROSOFT
  CLEVER
  OKTA
  CUSTOM_SAML
}

// ============================================================================
// 6. CONFIGURATION & POLICIES MODELS (Future - Phase 3)
// ============================================================================

model AcademicPolicy {
  id                      String    @id @default(cuid())
  schoolId                String
  school                  School    @relation(fields: [schoolId], references: [id])
  
  // Policy Details
  name                    String
  description             String?
  category                PolicyCategory
  
  // Configuration JSON
  settingsJson            String    // Policy-specific settings
  
  isActive                Boolean   @default(true)
  priority                Int       @default(1)
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  @@index([schoolId, category])
}

enum PolicyCategory {
  ATTENDANCE
  GRADING
  PROMOTION
  CERTIFICATION
  BEHAVIOR
  HOMEWORK
  ASSESSMENT
  CONTENT_SAFETY
}

// ============================================================================
// RELATION UPDATES TO EXISTING MODELS
// ============================================================================
// Update your existing User model to include schoolId:
//
// model User {
//   ...existing fields...
//   schoolId              String      // Add this - ties user to school
//   school                School?     @relation(fields: [schoolId], references: [id])
//   
//   auditActorLogs        AuditLog[]  @relation("actor")
//   
//   @@index([schoolId])
// }
//
// Ensure ALL existing models (Class, Course, Subject, GradeLevel, etc) 
// have schoolId foreign key for multi-tenant isolation.
//
// Example:
// model Class {
//   ...existing fields...
//   schoolId              String
//   school                School    @relation(fields: [schoolId], references: [id])
//   
//   @@index([schoolId])
// }

// ============================================================================
// END OF SAAS MODELS
// ============================================================================
// Next steps:
// 1. Add these models to prisma/schema.prisma
// 2. Create migration: npx prisma migrate dev --name add_saas_platform
// 3. Implement service layer (TenantService, BillingService, AuditService)
// 4. Create API routes for tenant management, billing, etc
// ============================================================================
