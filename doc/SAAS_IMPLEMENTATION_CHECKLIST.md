# LearnAI SaaS Platform - Implementation Checklist

**Target:** Transform prototype into production-grade SaaS platform  
**Timeline:** 16 weeks (4 phases)  
**Team Size:** 3-4 engineers + 1 PM + 1 Designer

---

## PHASE 1: FOUNDATION (Weeks 1-4) ← START HERE

### Week 1: Database & Core Infrastructure

- [ ] **Add Prisma Models**
  - [ ] Add all models from `SAAS_PRISMA_MODELS.md` to `prisma/schema.prisma`
  - [ ] Run: `npx prisma migrate dev --name add_saas_foundation`
  - [ ] Verify all models created: `npx prisma db push`
  - [ ] Generate Prisma Client: `npx prisma generate`

- [ ] **Update Existing Models**
  - [ ] Add `schoolId` foreign key to `User` model
  - [ ] Add `schoolId` foreign key to `Class`, `Course`, `Subject`, `GradeLevel`
  - [ ] Add index on all schoolId fields: `@@index([schoolId])`
  - [ ] Run migration: `npx prisma migrate dev --name add_school_isolation`

- [ ] **Database Validation**
  - [ ] Test data isolation: write test querying across tenants
  - [ ] Verify indexes created correctly
  - [ ] Check query performance on schoolId

### Week 1-2: Core Services

- [ ] **Create TenantService** (`lib/services/saas-core-service.ts`)
  - [ ] Implement `createTenant()`
  - [ ] Implement `getTenant()`
  - [ ] Implement `listTenants()`
  - [ ] Implement `updateTenantConfig()`
  - [ ] Implement `getTenantMetrics()`
  - [ ] Implement `suspendTenant()` / `resumeTenant()`
  - [ ] Implement `checkTenantLimits()`
  - [ ] Unit tests (happy path + edge cases)

- [ ] **Create BillingService**
  - [ ] Implement `createSubscription()`
  - [ ] Implement `updateSubscription()`
  - [ ] Implement `trackUsage()`
  - [ ] Implement `checkAndApplyOverages()`
  - [ ] Implement `generateInvoice()`
  - [ ] Implement `getBillingSummary()`
  - [ ] Unit tests

- [ ] **Create AuditService**
  - [ ] Implement `logAction()`
  - [ ] Implement `getAuditLogs()`
  - [ ] Implement `auditableAction()` wrapper
  - [ ] Implement `logSystemEvent()`
  - [ ] Unit tests

### Week 2: API Routes (Admin)

- [ ] **Tenant Management APIs**
  - [ ] POST `/api/admin/tenants` - Create school
  - [ ] GET `/api/admin/tenants` - List schools
  - [ ] GET `/api/admin/tenants/[id]` - Get details
  - [ ] PUT `/api/admin/tenants/[id]` - Update config
  - [ ] DELETE `/api/admin/tenants/[id]` - Delete tenant

- [ ] **Subscription APIs**
  - [ ] POST `/api/admin/subscriptions` - Create subscription
  - [ ] GET `/api/school/subscriptions/current` - Get current subscription
  - [ ] PUT `/api/admin/subscriptions/[id]` - Update plan

- [ ] **Audit APIs**
  - [ ] GET `/api/admin/audit-logs` - Platform audit logs
  - [ ] GET `/api/school/audit-logs` - School audit logs

- [ ] **Metrics APIs**
  - [ ] GET `/api/admin/tenants/[id]/metrics` - Tenant metrics
  - [ ] GET `/api/school/metrics` - School's own metrics

- [ ] **API Testing**
  - [ ] Integration tests for all endpoints
  - [ ] Test role-based access control
  - [ ] Test data isolation (no cross-tenant data)

### Week 2-3: RBAC Enhancement

- [ ] **Update User Model**
  - [ ] Add roles: `SAAS_ADMIN`, `SCHOOL_ADMIN`, `SUPPORT_AGENT`
  - [ ] Create `Role` enum with all roles

- [ ] **Create RBAC Middleware**
  - [ ] `enforceRole(requiredRole)` middleware
  - [ ] `enforceSchoolIsolation()` middleware
  - [ ] Permission checking service
  - [ ] Role hierarchy validation

- [ ] **Apply RBAC to APIs**
  - [ ] Wrap all admin endpoints with role checks
  - [ ] Verify only SAAS_ADMIN can create tenants
  - [ ] Verify only SCHOOL_ADMIN can edit school config

### Week 3: Admin Dashboard (React)

- [ ] **Create Admin Pages**
  - [ ] `/admin` - Home dashboard
  - [ ] `/admin/tenants` - List all schools
  - [ ] `/admin/tenants/[id]` - School detail view
  - [ ] `/admin/subscriptions` - Subscription management
  - [ ] `/admin/audit-logs` - Audit log viewer

- [ ] **Dashboard Components**
  - [ ] TenantList component (table + filters)
  - [ ] TenantDetail component (form for config)
  - [ ] SubscriptionForm component
  - [ ] MetricsCard component (KPI display)
  - [ ] AuditLogTable component

- [ ] **Dashboard Features**
  - [ ] View summary metrics (# schools, MRR, active users)
  - [ ] Create new school (with form validation)
  - [ ] Update school configuration
  - [ ] View school metrics and usage
  - [ ] Search/filter tenants
  - [ ] Export data (CSV)

### Week 3-4: Usage Tracking

- [ ] **Track AI Sessions**
  - [ ] After AI session completes, call `trackUsage(schoolId, 'AI_SESSIONS', 1)`
  - [ ] Implement in `app/api/learnai/classroom/session/route.ts`

- [ ] **Track Storage**
  - [ ] Calculate storage used by school
  - [ ] Implement `calculateStorageUsed(schoolId)` func
  - [ ] Call trackUsage monthly (cron job)

- [ ] **Track API Calls**
  - [ ] Implement API call counter middleware
  - [ ] Track per school
  - [ ] Batch write to usage table

- [ ] **Monitor Overages**
  - [ ] Cron job daily: check if schools exceeding limits
  - [ ] Set status to `DELINQUENT` if past due
  - [ ] Log warning if approaching limit

### Week 4: Invoice Generation & Trial System

- [ ] **Invoice System**
  - [ ] Implement `generateInvoice()` for monthly subscriptions  
  - [ ] Create invoice PDF template
  - [ ] Email invoice to school admin
  - [ ] Cron job to generate invoices monthly

- [ ] **Trial System**
  - [ ] Trial auto-expires at 14 days
  - [ ] Email reminder at day 10
  - [ ] Require payment method before expiration
  - [ ] Show "trial ends in X days" on dashboard

- [ ] **Testing**
  - [ ] Create 5 test tenants in staging
  - [ ] Run full billing cycle simulation
  - [ ] Verify invoices generate correctly
  - [ ] Test overage calculations

### Week 4: Documentation & Knowledge Transfer

- [ ] **API Documentation**
  - [ ] Create API docs (Postman/Swagger)
  - [ ] Document all endpoints (request/response)
  - [ ] Example curl commands
  - [ ] Error codes reference

- [ ] **Admin Guide**
  - [ ] How to create school
  - [ ] How to manage subscriptions
  - [ ] How to interpret metrics
  - [ ] Troubleshooting guide

- [ ] **Architecture Docs**
  - [ ] Data isolation explanation
  - [ ] Billing model documentation
  - [ ] Security model overview
  - [ ] Deployment guide

---

## PHASE 2: MONETIZATION & SCALING (Weeks 5-8)

### Objectives
- Full Stripe integration
- Complete billing cycle
- Financial reporting
- Tenant limits enforcement
- Usage-based pricing

### Key Deliverables

- [ ] **Stripe Integration**
  - [ ] Create Stripe account
  - [ ] Implement `createStripeCustomer(schoolId)`
  - [ ] Implement `createPaymentIntent()`
  - [ ] Webhook handlers (payment.success, payment.failed)
  - [ ] Test with Stripe test cards

- [ ] **Subscription Lifecycle**
  - [ ] Create subscription in Stripe
  - [ ] Auto-renew subscriptions monthly/yearly
  - [ ] Handle failed payments (retry logic)
  - [ ] Pause/resume subscriptions
  - [ ] Cancel with refund logic

- [ ] **Financial Dashboard**
  - [ ] MRR calculation
  - [ ] ARR forecast
  - [ ] Churn tracking
  - [ ] Revenue report by tier
  - [ ] Top customers by revenue

- [ ] **Tenant Limits Enforcement**
  - [ ] Check student limit on user creation
  - [ ] Check AI session limit before session
  - [ ] Check storage limit on file upload
  - [ ] Return 429 if limit exceeded
  - [ ] Show limit warnings on dashboard

- [ ] **Usage-Based Pricing**
  - [ ] Define overage rates
  - [ ] Calculate overages at month end
  - [ ] Apply discounts/coupons
  - [ ] Include overages in invoice

---

## PHASE 3: INTELLIGENCE & GOVERNANCE (Weeks 9-12)

### Objectives
- Advanced analytics
- AI governance
- Configuration flexibility
- Compliance support

### Key Deliverables

- [ ] **AI Governance System**
  - [ ] Log all AI recommendations
  - [ ] Store explainability data
  - [ ] Teacher override capability
  - [ ] Content moderation system
  - [ ] Fairness monitoring

- [ ] **Configuration Engine**
  - [ ] Grading system customization
  - [ ] Academic policy templates
  - [ ] AI behavior settings (STRICT/ADAPTIVE/EXPLORATION)
  - [ ] Localization (timezone, language, date format)
  - [ ] Feature flag system

- [ ] **Advanced Analytics**
  - [ ] Cohort analysis
  - [ ] Skill progression tracking
  - [ ] Predictive at-risk detection
  - [ ] Learning pattern analysis
  - [ ] Export reports (PDF, Excel)

- [ ] **Compliance Features**
  - [ ] FERPA readiness (data residency)
  - [ ] GDPR readiness (data retention, erasure)
  - [ ] Audit trail for compliance
  - [ ] Data export for schools
  - [ ] Backup & recovery testing

---

## PHASE 4: ENTERPRISE FEATURES (Weeks 13-16)

### Objectives
- Enterprise feature set
- Global scalability
- Enterprise support model
- Content ecosystem

### Key Deliverables

- [ ] **Communication System**
  - [ ] Teacher ↔ Student messaging
  - [ ] Announcements system
  - [ ] Email notifications
  - [ ] Push notifications
  - [ ] In-app messaging

- [ ] **Academic Operations**
  - [ ] Academic calendar system
  - [ ] Class schedule/timetable
  - [ ] Exam scheduling
  - [ ] Report card generation
  - [ ] Student promotion system

- [ ] **Content Marketplace**
  - [ ] Prebuilt course library
  - [ ] Teacher content sharing
  - [ ] Ratings & reviews
  - [ ] Paid content (revenue share)
  - [ ] Content versioning

- [ ] **Enterprise SSO**
  - [ ] Google Workspace integration
  - [ ] Microsoft Teams integration
  - [ ] Custom SAML SSO
  - [ ] Directory sync (Clever, Skyward)
  - [ ] Auto user provisioning

- [ ] **Multi-Region Deployment**
  - [ ] Database replication (EU, APAC)
  - [ ] CDN for static assets
  - [ ] Regional API endpoints
  - [ ] Data residency compliance

- [ ] **Advanced Security**
  - [ ] Session tracking per device
  - [ ] IP whitelisting
  - [ ] Login attempt monitoring
  - [ ] Suspicious activity alerts
  - [ ] Penetration testing

---

## CROSS-PHASE TASKS

### Continuous Throughout All Phases

- [ ] **Testing**
  - [ ] Unit tests (TDD: write tests first)
  - [ ] Integration tests
  - [ ] E2E tests (Selenium/Cypress)
  - [ ] Load testing
  - [ ] Security testing

- [ ] **Monitoring & Observability**
  - [ ] Error tracking (Sentry)
  - [ ] Performance monitoring (New Relic/DataDog)
  - [ ] Log aggregation (ELK/Splunk)
  - [ ] Alerts for critical errors
  - [ ] Monthly performance reports

- [ ] **Security**
  - [ ] Code review mandatory before merge
  - [ ] OWASP compliance check
  - [ ] Secrets management (no hardcoding)
  - [ ] SQL injection prevention
  - [ ] XSS/CSRF protection

- [ ] **DevOps**
  - [ ] Staging environment matching production
  - [ ] Automated deployments (CI/CD)
  - [ ] Database backups (daily)
  - [ ] Disaster recovery plan
  - [ ] Runbook for common issues

---

## SUCCESS CRITERIA

### Phase 1 (Foundation)
- ✅ Multi-tenant system working (5+ test schools)
- ✅ Data isolation verified (no cross-tenant leaks)
- ✅ All CRUD APIs functional
- ✅ Admin dashboard usable
- ✅ Audit logs complete
- ✅ Zero bugs in critical paths
- ✅ 95%+ unit test coverage

### Phase 2 (Monetization)
- ✅ Stripe integration live (test mode)
- ✅ Billing cycle automated
- ✅ 5 schools paying (even $1/month test)
- ✅ Financial dashboard accurate
- ✅ MRR tracking implemented
- ✅ No revenue leaks or bugs

### Phase 3 (Intelligence)
- ✅ Configuration system live
- ✅ Schools customizing settings
- ✅ AI governance logged
- ✅ Compliance checklist completed
- ✅ Advanced reports working

### Phase 4 (Enterprise)
- ✅ Enterprise school onboarded
- ✅ SSO working with customer's system
- ✅ Multi-region deployment tested
- ✅ 50+ schools on platform
- ✅ $20K+ MRR achieved

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data isolation breach | Low | Critical | Code review, automated tests, audit |
| Stripe integration fails | Low | High | Fallback payment processing, manual invoicing |
| Performance degradation | Medium | High | Connection pooling, query optimization, caching |
| Churn rate too high | Medium | High | Better onboarding, support, features |
| Regulatory compliance issues | Low | Critical | External compliance audit, legal review |
| Tenant data loss | Very Low | Critical | Daily backups, point-in-time recovery testing |

---

## RESOURCE ALLOCATION

### Team Composition
- **Backend Engineer (1):** Services, APIs, database
- **Full-Stack Engineer (1):** Backend + Admin UI
- **Frontend Engineer (1):** Admin dashboard, school dashboards
- **QA Engineer (0.5):** Testing, bug detection
- **Product Manager (1):** Prioritization, stakeholder management
- **Designer (0.5):** Admin UI/UX, brand guidelines

### Weekly Time Investment
- **Phase 1:** 40 hours/engineer/week
- **Phase 2:** 35 hours/engineer/week (some automation)
- **Phase 3-4:** 30 hours/engineer/week (parallel streams)

---

## BUDGET ESTIMATION

| Category | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|----------|---------|---------|---------|---------|-------|
| **Engineering** (4 people, 16 weeks) | $48K | $42K | $40K | $40K | **$170K** |
| **Infrastructure** (AWS, DB, etc) | $2K | $3K | $4K | $6K | **$15K** |
| **Stripe fees** (transaction) | $100 | $500 | $1000 | $2K | **$3.6K** |
| **Third-party services** (monitoring, etc) | $1K | $1.5K | $2K | $3K | **$7.5K** |
| **Contingency (10%)** | $5K | $4.7K | $4.7K | $5.1K | **$19.5K** |
| | | | | | |
| **TOTAL** | **$56K** | **$51.7K** | **$51.7K** | **$56.1K** | **$216K** |

**Expected ROI:**
- Month 6: $10K MRR (assuming 100 schools × $100 avg)
- Month 12: $40K MRR
- Annual revenue (Year 2): $480K
- Payback period: ~5 months

---

## GOING LIVE CHECKLIST

Before launching Phase 1 to production:

- [ ] All critical tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met (< 200ms API response)
- [ ] Backups automated & tested
- [ ] Monitoring & alerts live
- [ ] Support team trained
- [ ] Documentation complete
- [ ] Legal/compliance review done
- [ ] Pricing page live
- [ ] Signup flow working end-to-end

---

## MAINTENANCE TASKS

### Weekly
- [ ] Monitor error logs
- [ ] Check system health
- [ ] Review pending bug reports

### Monthly
- [ ] Generate financial reports
- [ ] Review churn + retention metrics
- [ ] Plan next sprint

### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Compliance review
- [ ] Strategic planning

---

**Document Status:** Living checklist - update as work progresses  
**Last Updated:** March 2026  
**Next Review:** End of Phase 1
