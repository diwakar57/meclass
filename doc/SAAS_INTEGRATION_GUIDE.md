# LearnAI SaaS - Integration Guide

**Purpose:** Show how the SaaS platform components work together  
**Audience:** Backend + Full-stack engineers  
**Difficulty:** Intermediate

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────┐
│         SAAS CONTROL PLANE (Admin)                  │
│  [Admin Dashboard] ← API → [Admin Services]          │
└─────────────────────────────────────────────────────┘
           ↓ (via middleware)
┌─────────────────────────────────────────────────────┐
│    ENFORCEMENT LAYER (Isolation + RBAC)             │
│   enforceSchoolIsolation() + enforceRole()           │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│    TENANT APPLICATION LAYER (Schools)               │
│  ┌─────────────────────────────────────────────┐   │
│  │  School A: Teachers, Students, Classes      │   │
│  │  School B: Teachers, Students, Classes      │   │
│  │  School C: Teachers, Students, Classes      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│    SHARED SERVICES                                  │
│  [TenantService] [BillingService] [AuditService]    │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│    DATABASE (PostgreSQL)                            │
│  Schools | Users | Classes | Subscriptions | etc    │
└─────────────────────────────────────────────────────┘
```

---

## CODE FLOW EXAMPLES

### Example 1: Creating a New School (Tenant)

**Step 1: API Request (Admin creates school)**
```bash
POST /api/admin/tenants
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Jefferson High School",
  "email": "admin@jefferson.edu",
  "countryCode": "US"
}
```

**Step 2: API Handler**
```typescript
// app/api/admin/tenants/route.ts
export async function POST(req: NextRequest) {
  // 1. Verify admin role
  const user = await getAuthUser(req);
  if (user.role !== 'SAAS_ADMIN') {
    return error(403, 'Unauthorized');
  }

  // 2. Extract data
  const { name, email, countryCode } = await req.json();

  // 3. Audit-wrapped service call
  const school = await auditService.auditableAction(
    {
      schoolId: 'pending',
      action: 'create_school',
      actionCategory: 'TENANT_MANAGEMENT',
      targetType: 'School',
      actorId: user.id,
      ipAddress: req.ip,
    },
    () => tenantService.createTenant({ name, email, countryCode })
  );

  // 4. Return response
  return NextResponse.json({ success: true, data: school });
}
```

**Step 3: TenantService.createTenant()**
```typescript
// lib/services/saas-core-service.ts
async createTenant(data) {
  // 1. Generate slug for URL
  const slug = this.generateSlug(data.name);

  // 2. Create school with defaults
  const school = await prisma.school.create({
    data: {
      name: data.name,
      email: data.email,
      slug,
      status: 'TRIAL',
      tier: 'FREEMIUM',
      trialEndsAt: 14 days from now,
      
      // Create default configuration
      config: {
        create: { language: 'en', timezone: 'UTC' }
      },
      
      // Create trial subscription
      subscription: {
        create: {
          tier: 'FREEMIUM',
          status: 'TRIAL',
          startDate: now,
          currentPeriodEnd: 14 days
        }
      }
    }
  });

  // 3. Log creation
  logger.info(`School created: ${school.id}`);

  return school;
}
```

**Step 4: Database State**
```
Schools table:
  id: "ckxt1u8b9000001jq8b8b8c8b"
  name: "Jefferson High School"
  email: "admin@jefferson.edu"
  slug: "jefferson-high-school"
  status: "TRIAL"
  tier: "FREEMIUM"
  trialEndsAt: 2026-04-08T12:00:00Z
  
SchoolConfig table:
  schoolId: "ckxt1u8b9000001jq8b8b8c8b"
  language: "en"
  timezone: "UTC"
  
Subscription table:
  schoolId: "ckxt1u8b9000001jq8b8b8c8b"
  tier: "FREEMIUM"
  status: "TRIAL"
  
AuditLog table:
  schoolId: "ckxt1u8b9000001jq8b8b8c8b"
  action: "create_school"
  actorId: "admin123"
  success: true
```

**Step 5: Admin Dashboard Shows**
```
Jefferson High School
├─ Status: TRIAL (ends Mar 8, 2026)
├─ Students: 0
├─ Classes: 0
├─ MRR: $0
└─ Action: [Upgrade to Pro]
```

---

### Example 2: Tracking AI Session Usage

**Context:** After student completes an AI learning session

**Step 1: Session Completion (in AI teaching system)**
```typescript
// app/api/learnai/classroom/session/[id]/complete/route.ts
export async function POST(req) {
  const { sessionId } = req.body;
  
  // Complete the session
  const session = await prisma.aISession.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED', completedAt: now }
  });
  
  // TRACK USAGE - call internal API
  await fetch('/api/internal/usage/track', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      schoolId: session.schoolId,
      metricType: 'AI_SESSIONS',
      value: 1
    })
  });
  
  return success();
}
```

**Step 2: Usage Tracking (Internal API)**
```typescript
// app/api/internal/usage/track/route.ts
export async function POST(req) {
  const { schoolId, metricType, value } = await req.json();
  
  // Track the usage
  await billingService.trackUsage(schoolId, metricType, value);
  
  return success();
}
```

**Step 3: BillingService.trackUsage()**
```typescript
async trackUsage(schoolId: string, metricType: string, value: number) {
  // 1. Get current month
  const thisMonth = '2026-03';
  
  // 2. Find or create usage record
  let usage = await prisma.usageMetric.findFirst({
    where: { schoolId, metricType, billingMonth: thisMonth }
  });
  
  if (usage) {
    // Increment existing
    await prisma.usageMetric.update({
      where: { id: usage.id },
      data: { metricValue: usage.metricValue + value }
    });
  } else {
    // Create new
    await prisma.usageMetric.create({
      data: { schoolId, metricType, metricValue: value, billingMonth: thisMonth }
    });
  }
  
  // 3. Check for overages
  await this.checkAndApplyOverages(schoolId);
}
```

**Step 4: Check Overages**
```typescript
private async checkAndApplyOverages(schoolId: string) {
  // 1. Get school subscription
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { subscription: true }
  });
  
  // 2. Get current month AI sessions
  const usage = await prisma.usageMetric.aggregate({
    where: {
      schoolId,
      metricType: 'AI_SESSIONS',
      billingMonth: '2026-03'
    },
    _sum: { metricValue: true }
  });
  
  const sessionsUsed = usage._sum.metricValue || 0;
  const sessionsLimit = school.aiSessionsPerMonth; // e.g., 1000
  
  // 3. Calculate overage
  let overageCharge = 0;
  if (sessionsUsed > sessionsLimit) {
    const excess = sessionsUsed - sessionsLimit;
    overageCharge = excess * 0.10; // $0.10 per excess session
  }
  
  // 4. Update subscription with overage amount
  await prisma.subscription.update({
    where: { id: school.subscription.id },
    data: {
      currentMonthUsage: sessionsUsed,
      overage: overageCharge
    }
  });
  
  // 5. If over 80% of limit, send warning email to SCHOOL_ADMIN
  if (sessionsUsed > sessionsLimit * 0.8) {
    // TODO: Send warning email
  }
}
```

**Step 5: Database State After 50 AI Sessions**
```
UsageMetric table:
  metricType: 'AI_SESSIONS'
  billingMonth: '2026-03'
  metricValue: 50  (incremented for each session)
  
Subscription table:
  currentMonthUsage: 50
  overage: 0  (50 ≤ 1000, no overage)
```

**Step 6: Billing Dashboard Shows**
```
March 2026 Usage
├─ AI Sessions: 50 / 1000 (5%)
├─ Storage: 2.3 / 100 GB (2%)
├─ Status: Within quota
└─ Projected bill: $99 (no overages)
```

---

### Example 3: Monthly Billing Cycle

**Setup:** Cron job runs at end of month

**Step 1: Generate Invoices (Scheduled Job)**
```typescript
// lib/cron/monthly-billing.ts
export async function monthlyBillingCycle() {
  logger.info('Starting monthly billing cycle...');
  
  // 1. Find all active subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { school: true }
  });
  
  for (const subscription of subscriptions) {
    try {
      // 2. Generate invoice for this subscription
      const invoice = await billingService.generateInvoice(subscription.id);
      
      // 3. Log successful invoice generation
      await auditService.logSystemEvent({
        action: 'auto_generate_invoice',
        component: 'BillingEngine',
        severity: 'INFO',
        message: `Invoice generated for school: ${subscription.school.name}`,
        metadata: { invoiceId: invoice.id, schoolId: subscription.schoolId }
      });
    } catch (error) {
      // Handle error
      await auditService.logSystemEvent({
        action: 'invoice_generation_failed',
        component: 'BillingEngine',
        severity: 'ERROR',
        message: `Failed to generate invoice for ${subscription.school.name}`,
        metadata: { error: error.message }
      });
    }
  }
  
  logger.info('Monthly billing cycle completed');
}
```

**Step 2: GenerateInvoice() Details**
```typescript
async generateInvoice(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { school: true }
  });
  
  // 1. Calculate amounts
  const subtotal = subscription.monthlyPrice;  // e.g., $99
  const tax = subtotal * 0.08;  // $7.92
  const total = subtotal + tax + subscription.overage;
  
  // 2. Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      subscriptionId,
      schoolId: subscription.schoolId,
      invoiceNumber: `INV-${date}-${schoolId}`,
      status: 'SENT',
      subtotal,
      tax,
      total,
      dueDateAt: 30 days from now,
      items: {
        create: [
          {
            description: `${subscription.tier} Plan`,
            type: 'BASE_PLAN',
            quantity: 1,
            unitPrice: subtotal,
            total: subtotal
          },
          ...(subscription.overage > 0 ? [{
            description: 'AI Session Overages',
            type: 'OVERAGE',
            unitPrice: subscription.overage,
            total: subscription.overage
          }] : [])
        ]
      }
    }
  });
  
  // 3. Send invoice to SCHOOL_ADMIN
  // TODO: sendInvoiceEmail(invoice)
  
  // 4. Reset monthly counters for next month
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      previousMonthUsage: subscription.currentMonthUsage,
      currentMonthUsage: 0,
      overage: 0
    }
  });
  
  return invoice;
}
```

**Step 3: Database State After Invoice Generation**
```
Invoice table:
  id: "inv123"
  subscriptionId: "sub456"
  invoiceNumber: "INV-2026-03-jefferson"
  status: "SENT"
  subtotal: 99.00
  tax: 7.92
  total: 106.92
  dueDateAt: 2026-04-09
  
InvoiceItem table:
  description: "PRO Plan"
  type: "BASE_PLAN"
  unitPrice: 99.00
  total: 99.00
  
Subscription table:
  previousMonthUsage: 50
  currentMonthUsage: 0
  overage: 0
```

---

### Example 4: Enforcing Data Isolation

**Scenario:** Teacher from School A tries to view students from School B

**Step 1: Database Query Without Isolation**
```typescript
// ❌ WRONG - No schoolId filter
const students = await prisma.user.findMany({
  where: { role: 'STUDENT' }
});
// Returns students from ALL schools!
```

**Step 2: Correct Pattern with Isolation**
```typescript
// app/api/students/route.ts
export async function GET(req: NextRequest) {
  // 1. Get authenticated user + schoolId
  const user = await getAuthUser(req);
  const schoolId = user.schoolId;  // From JWT token
  
  if (!schoolId) {
    return error(403, 'No school context');
  }
  
  // 2. Query with schoolId filter
  const students = await prisma.user.findMany({
    where: {
      schoolId,  // ✅ REQUIRED
      role: 'STUDENT'
    }
  });
  
  return success(students);
}
```

**Step 3: Middleware Enforcement**
```typescript
// lib/middleware/enforce-isolation.ts
export async function enforceSchoolIsolation(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.schoolId) {
    throw new Error('No school context found');
  }
  return user.schoolId;
}

// Usage in API:
export async function GET(req: NextRequest) {
  const schoolId = await enforceSchoolIsolation(req);
  
  // Now schoolId is guaranteed
  const data = await prisma.anyModel.findMany({
    where: { schoolId }
  });
}
```

**Result:**
- School A teacher sees: their school's students only
- School B teacher sees: their school's students only
- No data leakage between schools

---

## DEPLOYMENT FLOW

### Step 1: Local Development
```bash
# 1. Add models to prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_saas_foundation

# 3. Start dev server
npm run dev

# 4. Test APIs with curl/Postman
curl -X POST http://localhost:3000/api/admin/tenants \
  -H "Authorization: Bearer {token}" \
  -d '{"name":"Test School"...}'
```

### Step 2: Staging Deployment
```bash
# 1. Deploy to staging environment
git push origin feature/saas-foundation

# 2. Run migrations on staging DB
npx prisma migrate deploy --schema=prisma/schema.prisma

# 3. Run full test suite
npm test

# 4. Test billing cycle with test tenants
curl -X POST https://staging.learnai.com/api/admin/tenants ...

# 5. Verify no errors in logs
# 6. Load test (with k6 or locust)
```

### Step 3: Production Deployment
```bash
# 1. Review all changes
git log origin/main..feature/saas-foundation

# 2. Create backup
aws rds create-db-snapshot --db-instance-identifier prod

# 3. Merge to main
git merge feature/saas-foundation --ff-only

# 4. Deploy to production
# (via CI/CD pipeline)

# 5. Run migrations against prod DB
npx prisma migrate deploy

# 6. Monitor logs and metrics
# 7. Set up automated alerts
```

---

## TESTING STRATEGY

### Unit Tests
```typescript
// lib/services/__tests__/saas-core-service.test.ts
describe('TenantService', () => {
  it('should create tenant with default config', async () => {
    const school = await tenantService.createTenant({
      name: 'Test School',
      email: 'test@school.edu',
      countryCode: 'US'
    });
    
    expect(school.id).toBeDefined();
    expect(school.status).toBe('TRIAL');
    expect(school.config?.language).toBe('en');
    expect(school.subscription?.status).toBe('TRIAL');
  });

  it('should not create duplicate email', async () => {
    await tenantService.createTenant({...});
    
    expect(
      tenantService.createTenant({...}) // Same email
    ).rejects.toThrow();
  });
});

describe('BillingService', () => {
  it('should calculate overages correctly', async () => {
    const school = await createTestTenant();
    
    // Track 1050 AI sessions (limit is 1000)
    for (let i = 0; i < 1050; i++) {
      await billingService.trackUsage(school.id, 'AI_SESSIONS', 1);
    }
    
    const subscription = await prisma.subscription.findUnique({
      where: { schoolId: school.id }
    });
    
    // Expect $5 overage (50 sessions × $0.10)
    expect(subscription.overage).toBe(5.00);
  });
});
```

### Integration Tests
```typescript
describe('Tenant Creation Flow', () => {
  it('should create school, subscription, and all configs', async () => {
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Test School',
        email: 'test@school.edu'
      })
    });
    
    expect(res.status).toBe(201);
    const school = await res.json();
    
    // Verify school created
    const foundSchool = await prisma.school.findUnique({
      where: { id: school.data.id },
      include: { config: true, subscription: true }
    });
    
    expect(foundSchool).toBeDefined();
    expect(foundSchool.config).toBeDefined();
    expect(foundSchool.subscription.status).toBe('TRIAL');
  });
});
```

---

## MONITORING & ALERTS

### Key Metrics to Monitor
```
1. API Response Time
   - Target: < 200ms
   - Alert: > 500ms

2. Error Rate
   - Target: < 0.1%
   - Alert: > 1%

3. Database Performance
   - Target: < 100ms query
   - Alert: > 500ms

4. Billing Accuracy
   - Manual audit monthly
   - Alert: Any calculation discrepancies

5. Audit Log Completeness
   - Target: 100% of writes logged
   - Alert: Any missing logs
```

### Alert Configuration
```yaml
alerts:
  - name: high_api_errors
    condition: error_rate > 0.01
    action: page_on_call
    
  - name: billing_sync_failed
    condition: monthly_billing_job_fails
    action: email_ops_team
    
  - name: data_isolation_breach
    condition: cross_tenant_data_access
    action: page_immediately
```

---

## TROUBLESHOOTING GUIDE

### Issue: Invoice not generating for school
```typescript
// Debug steps:
1. Check if subscription status is ACTIVE
   const sub = await prisma.subscription.findUnique({
     where: { schoolId: '...' }
   });
   console.log(sub.status);

2. Check if usage metrics exist
   const usage = await prisma.usageMetric.findMany({
     where: { schoolId: '...' }
   });
   console.log(usage);

3. Check audit logs
   const logs = await auditService.getAuditLogs(schoolId, {
     action: 'generate_invoice'
   });
   console.log(logs);
```

### Issue: Data leaking across schools
```typescript
// Debug steps:
1. Enable query logging in Prisma
   // prisma/schema.prisma
   datasource db {
     url = env("DATABASE_URL")
     log = ["query", "error"]
   }

2. Check all queries have schoolId filter
   grep -r "findMany\|findFirst" --include="*.ts" | grep -v "$schoolId"

3. Verify JWT token includes schoolId
   console.log(jwt.decode(token));
```

---

## NEXT STEPS

1. **Start Phase 1:** Follow `SAAS_IMPLEMENTATION_CHECKLIST.md`
2. **Add Models:** Copy models from `SAAS_PRISMA_MODELS.md`
3. **Implement Services:** Use `lib/services/saas-core-service.ts` as template
4. **Create APIs:** Reference `SAAS_API_ROUTES_REFERENCE.md`
5. **Test Everything:** Write unit + integration tests
6. **Deploy:** Follow deployment flow above

---

**Document Status:** Complete integration guide  
**Last Updated:** March 2026  
**Questions?** See `SAAS_PLATFORM_ARCHITECTURE.md` for detailed specifications
