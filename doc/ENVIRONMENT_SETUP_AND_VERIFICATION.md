# LearnAI Environment Setup & Verification Guide

**Purpose**: Complete setup instructions to make all 18 flows verifiable end-to-end  
**Target Time**: 2-4 hours depending on database choice  
**Status**: Ready for implementation

---

## 📋 Quick Overview

This guide provides **3 paths** to set up the LearnAI system:

| Path | Setup Time | Best For | Database |
|------|-----------|----------|----------|
| **Path A: Local Docker** | 30 min | Development, testing | PostgreSQL in Docker |
| **Path B: Cloud Database** | 20 min | Quick demo, production-like | Neon/Supabase/Railway |
| **Path C: Managed Service** | 1 hour | Production deployment | RDS/Cloud SQL |

**Recommendation**: Use **Path B** for fastest setup without local infrastructure.

---

## 🚀 Path A: Local Docker Setup (30 minutes)

### Prerequisites
- Docker and Docker Compose installed
- 2GB RAM available
- Port 5432 not in use

### Steps

#### 1. Start PostgreSQL with Docker
```bash
cd /mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC

# Option 1: Using docker-compose.yml
docker-compose up -d postgres

# Option 2: Direct docker run
docker run \
  --name learnai_db \
  -e POSTGRES_USER=learnai_user \
  -e POSTGRES_PASSWORD=SecurePass123 \
  -e POSTGRES_DB=learnai \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:15-alpine

# Verify it's running
docker ps | grep postgres
```

#### 2. Initialize Database Schema
```bash
# Wait for postgres to be ready (10-15 seconds)
sleep 15

# Run migrations
psql -h localhost -U learnai_user -d learnai -f db/schema.sql
psql -h localhost -U learnai_user -d learnai -f db/schema-payments.sql

# Verify tables created
psql -h localhost -U learnai_user -d learnai -c "\dt"
```

#### 3. Seed Demo Data
```bash
# Create .env.local with database credentials
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://learnai_user:SecurePass123@localhost:5432/learnai
JWT_SECRET=your-demo-secret-key-12345
OPENAI_API_KEY=sk-demo-key-placeholder
STRIPE_PUBLIC_KEY=pk_test_demo
STRIPE_SECRET_KEY=sk_test_demo
STRIPE_WEBHOOK_SECRET=whsec_test_demo
EOF

# Run seed script
npx ts-node db/seed.ts
# Expected output: "✅ Seeding complete! Demo school created..." 
```

#### 4. Start Development Server
```bash
npm run dev

# Access http://localhost:3000
# Expected: LearnAI landing page loads
```

---

## ☁️ Path B: Cloud Database Setup (20 minutes) - **RECOMMENDED**

### Option B1: Neon (Fastest)

**Advantages**: Free tier, instant setup, connection pooling  
**Time**: 5 minutes

```bash
# 1. Create free account at https://neon.tech
# 2. Create new project (copy connection string)
# 3. Update .env.local
DATABASE_URL=postgresql://[user]:[password]@[host]/learnai?sslmode=require

# 4. Create database schema
psql $DATABASE_URL < db/schema.sql
psql $DATABASE_URL < db/schema-payments.sql

# 5. Seed demo data
npx ts-node db/seed.ts

# 6. Start server
npm run dev
```

### Option B2: Supabase

**Advantages**: PostgreSQL + auth + realtime ready  
**Time**: 10 minutes

```bash
# 1. Go to https://supabase.com
# 2. Create new project (wait 2-3 min for provisioning)
# 3. Get connection string from project settings
# 4. Set DATABASE_URL in .env.local
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/postgres

# 5. Run schema setup
psql $DATABASE_URL < db/schema.sql
psql $DATABASE_URL < db/schema-payments.sql

# 6. Import seed data
npx ts-node db/seed.ts

# 7. Start
npm run dev
```

### Option B3: Railway

**Advantages**: Simple deployment, free trial  
**Time**: 10 minutes

```bash
# 1. Create account at https://railway.app
# 2. Deploy PostgreSQL from marketplace
# 3. Copy connection string
# 4. Update .env.local
# 5. Same setup as above (schema + seed)
```

---

## 🏢 Path C: AWS/Google Cloud Production Setup (1 hour)

### AWS RDS Setup
```bash
# 1. Create RDS PostgreSQL instance
#    - Engine: PostgreSQL 15
#    - db.t3.micro (free tier eligible)
#    - Storage: 20GB gp2
#    - Multi-AZ: No (for dev)
#    - Public accessibility: Yes

# 2. Get endpoint: your-db-instance.xxxxxxxxxx.region.rds.amazonaws.com

# 3. Install AWS CLI + configure credentials
aws rds describe-db-instances

# 4. Update .env.local with endpoint
DATABASE_URL=postgresql://admin:[password]@[rds-endpoint]:5432/learnai

# 5. Run schema
psql $DATABASE_URL < db/schema.sql
psql $DATABASE_URL < db/schema-payments.sql

# 6. Seed data
npx ts-node db/seed.ts
```

### Google Cloud SQL Setup
```bash
# 1. Create Cloud SQL instance (PostgreSQL 15)
# 2. Create database "learnai"
# 3. Create user with password
# 4. Whitelist Cloud Run/App Engine IPs if needed
# 5. Get connection string from Cloud SQL proxy
# 6. Run schema + seed same as above
```

---

## 🔐 Environment Configuration Template

Complete `.env.local` file with all required variables:

```env
# =============================================================================
# LEARNAI ENVIRONMENT CONFIGURATION
# =============================================================================

# --- DATABASE CONNECTION (REQUIRED) ------------------------------------------
# Choose based on setup path:
# Local Docker:    postgresql://learnai_user:SecurePass123@localhost:5432/learnai
# Neon:            postgresql://[user]:[pass]@[host].neon.tech/neon?sslmode=require
# Supabase:        postgresql://[postgres]:[pass]@[host].supabase.co:5432/postgres
# Railway:         postgresql://[user]:[pass]@[host]/railway
# AWS RDS:         postgresql://[user]:[pass]@[rds-endpoint]:5432/learnai
DATABASE_URL=

# --- JWT AUTHENTICATION (REQUIRED) -------------------------------------------
# Use a strong random string (min 32 characters)
# Generate: openssl rand -base64 32
JWT_SECRET=your-strong-random-secret-key-here-minimum-32-chars

# --- LLM PROVIDER CONFIGURATION (PICK ONE) ----------------------------------
# For diagnostic test generation and AI features

# OpenAI (Recommended for testing)
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODELS=gpt-4-turbo,gpt-3.5-turbo

# Anthropic (Alternative)
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODELS=claude-3-opus-20240229

# Google Gemini (Alternative)
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_MODELS=gemini-pro

# --- STRIPE CONFIGURATION (FOR PAYMENTS) ------------------------------------
# Get from https://dashboard.stripe.com/apikeys

# Test keys (for development)
STRIPE_PUBLIC_KEY=pk_test_your_test_public_key
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret

# OR Production keys (after verification)
# STRIPE_PUBLIC_KEY=pk_live_your_live_public_key
# STRIPE_SECRET_KEY=sk_live_your_live_secret_key
# STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# --- OPTIONAL: EMAIL (for notifications) ------------------------------------
# SENDGRID_API_KEY=SG.your-sendgrid-key

# --- OPTIONAL: FILE STORAGE (for uploads) -----------------------------------
# AWS_S3_BUCKET=learnai-uploads
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret

# --- OPTIONAL: MONITORING ---------------------------------------------------
# SENTRY_DSN=your-sentry-dsn
# DATADOG_API_KEY=your-datadog-key
```

---

## ✅ Demo Credentials

After seeding, use these to test all flows:

### Admin User (SaaS Platform)
```
Email:    saasadmin@learnai.study
Password: Admin@12345
Role:     saas_admin
Access:   /admin/dashboard → School management
```

### School Principal
```
Email:    principal@demo.learnai.study
Password: Demo@12345
Role:     principal
School:   LearnAI Demo Academy
Access:   /principal/dashboard → School stats, teacher management
```

### Teacher
```
Email:    teacher@demo.learnai.study
Password: Demo@12345
Role:     teacher
School:   LearnAI Demo Academy
Access:   /teacher/dashboard → Student progress, test review
```

### Student
```
Email:    student@demo.learnai.study
Password: Demo@12345
Role:     student
School:   LearnAI Demo Academy (joined)
Access:   /student/dashboard → Learning plan, AI sessions
```

---

## 🧪 Flow Verification Checklist

After setup, verify each of the 18 flows:

### ✅ Flow 1: Landing Page
- [ ] Navigate to `http://localhost:3000`
- [ ] See LearnAI branding and hero section
- [ ] Click "Sign Up" → goes to sign up page
- [ ] Click "Get Started" → goes to login page

### ✅ Flow 2: Login & Signup
- [ ] Login with `student@demo.learnai.study` / `Demo@12345`
- [ ] Redirects to student dashboard
- [ ] Click logout
- [ ] Sign up with new email
- [ ] Receive confirmation
- [ ] Can log in as new user

### ✅ Flow 3: Role-Based Redirect
- [ ] Login as student → redirects to `/student/dashboard`
- [ ] Login as teacher → redirects to `/teacher/dashboard`
- [ ] Login as principal → redirects to `/principal/dashboard`
- [ ] Login as admin → redirects to `/admin/dashboard`

### ✅ Flow 4: SaaS Admin Creates School
- [ ] Login as `saasadmin@learnai.study`
- [ ] Go to `/admin/dashboard`
- [ ] Click "Create School"
- [ ] Fill form (name, domain, tier)
- [ ] Click submit
- [ ] New school appears in list
- [ ] Status shows "pending_approval"

### ✅ Flow 5: Teacher/Staff Signup
- [ ] Go to `/auth/signup/teacher`
- [ ] Enter email, password, name
- [ ] Enter school code: `SCH-DEMO` or school domain
- [ ] Click signup
- [ ] Gets teacher role + school assignment
- [ ] Can access `/teacher/dashboard`

### ✅ Flow 6: Student Signup
- [ ] Go to `/auth/signup/student`
- [ ] Enter email, password, name
- [ ] School code optional - skip it
- [ ] Click signup
- [ ] Gets student role
- [ ] Can access `/student/dashboard`

### ✅ Flow 7: Teacher Creates Syllabus
- [ ] Login as teacher
- [ ] Go to `/teacher/syllabus` or similar
- [ ] Click "Create Syllabus"
- [ ] Select grade and subject
- [ ] Add topics (should see form with objectives, difficulty)
- [ ] Click "Publish"
- [ ] Syllabus appears in curriculum list

### ✅ Flow 8: Student Self-Assessment
- [ ] Login as student
- [ ] Look for "Self Assessment" section
- [ ] Rate confidence (1-10) on topics
- [ ] List strengths and weaknesses
- [ ] Click submit
- [ ] Confirmation appears

### ✅ Flow 9: Diagnostic Test Generation
- [ ] As student, go to "Tests" section
- [ ] Click "Start Diagnostic"
- [ ] System generates questions
- [ ] See 5+ questions with:
  - [ ] Question text
  - [ ] Multiple choice or short answer options
  - [ ] Difficulty level shown

### ✅ Flow 10: Teacher Reviews Test  
- [ ] Login as teacher
- [ ] Go to "Student Progress"
- [ ] See list of students and their test status
- [ ] Click on student name
- [ ] See their test answers and scores
- [ ] Can leave feedback

### ✅ Flow 11: Student Takes Test
- [ ] Login as student
- [ ] Start diagnostic test
- [ ] Answer each question (select option or type answer)
- [ ] Rate confidence for each: 1-5 scale
- [ ] See time spent per question
- [ ] Click "Submit"
- [ ] Get immediate score

### ✅ Flow 12: Confidence Analysis
- [ ] After test submission
- [ ] See "Your Readiness" section showing:
  - [ ] Readiness level (READY, UNDERCONFIDENT, OVERCONFIDENT, SUPPORT_REQUIRED)
  - [ ] Topic breakdown (strengths vs weaknesses)
  - [ ] Confidence vs performance comparison
  - [ ] Recommendations for next steps

### ✅ Flow 13: Learning Plan Generation
- [ ] On dashboard
- [ ] See "Your Learning Plan" section
- [ ] Shows:
  - [ ] Topics to learn next (ordered by priority)
  - [ ] Your learning pace (fast/medium/slow)
  - [ ] Your learning style (visual/text/interactive)
  - [ ] Estimated time to complete

### ✅ Flow 14: AI Session Creation
- [ ] In learning plan
- [ ] Click "Start AI Session" on a topic
- [ ] System shows:
  - [ ] Interactive lesson content
  - [ ] Questions from AI tutor
  - [ ] Media (if available): video/transcript
  - [ ] In-session quiz

### ✅ Flow 15: Session Storage
- [ ] Complete an AI session
- [ ] Close browser and reopen
- [ ] Session appears in "Recent Sessions"
- [ ] Can view transcript
- [ ] Time spent recorded

### ✅ Flow 16: Dashboard Updates
- [ ] Login as different roles
- [ ] **Student Dashboard**: Shows progress by topic, quiz history, confidence graph
- [ ] **Teacher Dashboard**: Shows class-wide stats, weak topics heatmap
- [ ] **Principal Dashboard**: Shows school stats, fee collection, subject performance
- [ ] **Admin Dashboard**: Shows platform-wide metrics, revenue, school growth
- [ ] All dashboards load in <2 seconds

### ✅ Flow 17: Payments & API Keys
- [ ] Go to school settings → billing
- [ ] See current subscription plan
- [ ] Click "Manage Payment Method"
- [ ] Can view past invoices
- [ ] Go to API Keys section
- [ ] Can generate new key
- [ ] Can revoke/rotate keys
- [ ] See usage logs

### ✅ Flow 18: Demo Data Fully Connected
- [ ] After all above tests pass
- [ ] Complete flow works without errors:
  - [ ] Seed data created successfully
  - [ ] Demo users can login
  - [ ] Demo school visible
  - [ ] Demo curriculum exists
  - [ ] Demo test can be taken
  - [ ] Demo analytics show data
- [ ] No console errors: `npm run dev 2>&1 | grep -i error`

---

## 🔧 Troubleshooting

### Database Connection Failed
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT version();"

# If psql not found, install:
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client
# Windows: Install PostgreSQL with psql
```

### Schema Import Error
```bash
# Check what tables exist
psql $DATABASE_URL -c "\dt"

# Re-import from scratch (careful - deletes data)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL < db/schema.sql
psql $DATABASE_URL < db/schema-payments.sql
```

### Seed Script Fails
```bash
# Check database is connected
psql $DATABASE_URL -c "SELECT 1"

# Run with verbose output
NODE_DEBUG=* npx ts-node db/seed.ts

# Check .env.local exists
cat .env.local | grep DATABASE_URL
```

### Dev Server Won't Start
```bash
# Clear caches
rm -rf .next node_modules
npm install

# Check Node version
node --version  # Should be 20.9.0+

# Try building
npm run build  # Catch compile errors

# Then try dev
npm run dev
```

### LLM Tests Fail (Diagnostic Test Generation)
```bash
# Verify API key
echo $OPENAI_API_KEY

# Test API directly
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq .

# If fails: Wrong API key or quota exceeded
# Generate new key: https://platform.openai.com/api-keys
```

---

## 📊 Expected Results After Setup

| Component | Status | Checks |
|-----------|--------|--------|
| **Landing Page** | ✅ Working | Loads in <1s |
| **Auth System** | ✅ Working | Login/signup pass |
| **Database** | ✅ Working | All tables present |
| **Demo Data** | ✅ Loaded | 4 users + school created |
| **Dashboards** | ✅ Working | All pages load with data |
| **Analytics** | ✅ Working | Charts display correctly |
| **LLM Tests** | ✅ Working | Diagnostic generated |
| **Payments** | ✅ Working | Stripe webhook ready |
| **API Keys** | ✅ Working | Keys generate/validate |

---

## 📝 Next Steps After Verification

Once all 18 flows are verified:

### For Development
- [ ] Create test data for load testing
- [ ] Set up monitoring
- [ ] Configure email notifications
- [ ] Build mobile app

### For Production
- [ ] Use production database (RDS/Cloud SQL)
- [ ] Configure HTTPS/SSL
- [ ] Set up CDN for assets
- [ ] Configure backups
- [ ] Set up monitoring (Sentry/DataDog)
- [ ] Deploy to production hosting

### For Team Collaboration
- [ ] Set up staging environment
- [ ] Configure CI/CD pipeline
- [ ] Document API endpoints
- [ ] Create runbooks for operations

---

## 📞 Support

If setup fails:

1. **Check error message** in console - usually very specific
2. **Verify database connection**: `psql $DATABASE_URL -c "SELECT 1"`
3. **Check .env.local exists** with all required keys
4. **Review logs**: `npm run dev` will show exact error
5. **Try Path B** (Cloud database) if local setup fails

---

**Status**: Ready for implementation across all 3 setup paths  
**Last Updated**: March 24, 2026
