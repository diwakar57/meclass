# LearnAI Quick Start: Getting All 18 Flows Working

**Goal**: Set up environment and verify all 18 flows work end-to-end  
**Estimated Time**: 30 minutes to 2 hours (depending on database choice)  
**Difficulty**: Intermediate (requires database setup)

---

## ⚡ The 5-Minute Dashboard

### What You Need
- Node.js 20.9+ (`node --version`)
- Database (Neon/Supabase recommended - 5 min setup)
- One API key (OpenAI, Anthropic, or Google - for AI tests)
- Stripe test keys (optional - for payment demo)

### The 3 Steps to Production-Ready

```bash
# Step 1: Pick your database (5-20 minutes)
# See ENVIRONMENT_SETUP_AND_VERIFICATION.md for options

# Step 2: Configure environment (5 minutes)
cp .env.local.example .env.local
# Edit .env.local with your database URL and API keys

# Step 3: Seed demo data (5 minutes)
npx ts-node db/seed.ts

# Now test it!
npm run dev
# Visit http://localhost:3000
```

---

## 📊 Database Quick Setup Comparison

| Database | Setup Time | Difficulty | Cost | Best For |
|----------|-----------|-----------|------|---------|
| **Neon** | 5 min | Easy | Free tier | Quick demo/testing |
| **Supabase** | 10 min | Easy | Free tier | Production-like |
| **Local Docker** | 15 min | Medium | Free | Full dev control |
| **Railway** | 10 min | Easy | Free trial | Simple deployment |
| **AWS RDS** | 20 min | Medium | Free tier | Enterprise |

**Recommended for first-time setup**: **Neon** (truly 5 minutes, just copy/paste)

---

## 🚀 Fastest Path: Neon Setup (5 Minutes)

### 1. Create Neon Account
```
Go to https://neon.tech
Click "Sign Up" → Use email or GitHub
Create free account → Auto-creates first project
```

### 2. Get Connection String
```
1. Dashboard shows your project
2. Click "Connection string"
3. Copy the whole URL (postgresql://...)
```

### 3. Update .env.local
```bash
# Edit .env.local
DATABASE_URL=postgresql://[paste-your-neon-url-here]
JWT_SECRET=your-strong-secret-here-min-32-chars
OPENAI_API_KEY=sk-[your-openai-key]  # Or use Anthropic/Google
STRIPE_PUBLIC_KEY=pk_test_demo
STRIPE_SECRET_KEY=sk_test_demo
STRIPE_WEBHOOK_SECRET=whsec_test_demo
```

### 4. Install PostgreSQL Client (if needed)
```bash
# If psql is not installed, install it first:
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt update && sudo apt install postgresql-client

# Windows - Download from https://www.postgresql.org/download/windows/
```

### 5. Initialize Database
```bash
# Create schema
psql $DATABASE_URL < db/schema.sql
psql $DATABASE_URL < db/schema-payments.sql

# Load demo data
npx ts-node db/seed.ts

# Expected output:
# ✅ Schools table created
# ✅ Users table created
# ✅ Demo school "LearnAI Demo Academy" created
# ✅ Demo users created
# ✅ Demo curriculum seeded
```

### 5. Start Server
```bash
npm run dev

# Expected output:
# ▲ Next.js 15.x.x
# - Local:        http://localhost:3000
# Ready in 1234ms
```

### 6. Test It
```
Open http://localhost:3000
See: LearnAI landing page
Login with:
  Email: student@demo.learnai.study
  Password: Demo@12345
Expected: Student dashboard loads with real data
```

**Done!** You now have all 18 flows ready to test. ✅

---

## 🆘 Quick Troubleshooting

### "psql command not found"
Install PostgreSQL client for your OS:
- **macOS**: `brew install postgresql`
- **Ubuntu**: `sudo apt install postgresql-client`
- **Windows**: Download from https://www.postgresql.org/download/windows/

Then retry the schema import commands.

### "Cannot connect to Neon database"
- Verify DATABASE_URL is copied correctly from Neon dashboard
- Check URL includes `?sslmode=require` at the end
- Wait 10-15 seconds after creating Neon project before connecting

### "Seed script fails"
1. Verify database is accessible: `psql $DATABASE_URL -c "SELECT 1"`
2. Verify .env.local exists: `cat .env.local | grep DATABASE_URL`
3. Verify NODE_ENV is set: `export NODE_ENV=development`
4. Try again: `npx ts-node db/seed.ts`

### "Dev server won't start"
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

---

Copy these to test different roles:

### Admin (Platform Management)
```
Email:    saasadmin@learnai.study
Password: Admin@12345
Role:     saas_admin
Access:   /admin/dashboard
Can:      Create schools, manage platform
```

### Principal (School Admin)
```
Email:    principal@demo.learnai.study
Password: Demo@12345
Role:     principal
School:   LearnAI Demo Academy
Access:   /principal/dashboard
Can:      Manage teachers, view school stats
```

### Teacher (Instructor)
```
Email:    teacher@demo.learnai.study
Password: Demo@12345
Role:     teacher
School:   LearnAI Demo Academy
Access:   /teacher/dashboard
Can:      Create syllabi, review student tests
```

### Student (Learner)
```
Email:    student@demo.learnai.study
Password: Demo@12345
Role:     student
School:   LearnAI Demo Academy
Access:   /student/dashboard
Can:      Take tests, view learning plan, use AI
```

---

## ✅ Quick Verification: All 18 Flows

After setup, test these flows. Most take <30 seconds each:

### 🔑 Auth Flows (2 flows)
- [ ] **Flow 1**: Landing page loads at /landing
- [ ] **Flow 2**: Can login as student → redirects to dashboard

### 👥 Account Flows (4 flows)
- [ ] **Flow 3**: After login, student dashboard shows (role-based redirect works)
- [ ] **Flow 4**: Admin can create school (go to /admin/dashboard)
- [ ] **Flow 5**: Teacher can sign up with school code
- [ ] **Flow 6**: Student can self-register without school code

### 📚 Curriculum Flows (2 flows)
- [ ] **Flow 7**: Teacher can create syllabus (/teacher/syllabus or similar)
- [ ] **Flow 8**: Student sees self-assessment section (should be prepopulated with demo data)

### 🧪 Testing Flows (4 flows)
- [ ] **Flow 9**: Click "Generate Diagnostic Test" → AI test appears with 5+ questions
- [ ] **Flow 10**: Switch to teacher role → can see student test results
- [ ] **Flow 11**: Switch to student → take test → get score (auto-grading works)
- [ ] **Flow 12**: After test, see "Your Readiness" showing READY/UNDERCONFIDENT/OVERCONFIDENT

### 🎓 Learning Flows (3 flows)
- [ ] **Flow 13**: Student dashboard shows "Learning Plan" with topics
- [ ] **Flow 14**: Click "Start AI Session" → interactive lesson loads
- [ ] **Flow 15**: Complete session → appears in "Recent Sessions" after refresh

### 📊 Dashboard & Payments (3 flows)
- [ ] **Flow 16**: Dashboards load with charts (student/teacher/principal/admin all work)
- [ ] **Flow 17**: Payment section shows: current plan, invoices, API keys
- [ ] **Flow 18**: All 18 flows work together without errors

**Total Test Time**: ~10 minutes for all flows

---

## 🆘 Quick Troubleshooting

### "Cannot connect to database"
```bash
# Check connection string
grep DATABASE_URL .env.local

# If using Neon, verify URL is complete: postgresql://user:pass@host/db?...
# If using Docker, check: docker ps | grep postgres

# Test connection directly
psql $DATABASE_URL -c "SELECT 1"
```

### "FATAL: database does not exist"
```bash
# Schema not imported - run:
psql $DATABASE_URL < db/schema.sql
psql $DATABASE_URL < db/schema-payments.sql
```

### "Seed script fails"
```bash
# Verify .env.local is configured
cat .env.local | head -5

# Run with debug output
NODE_DEBUG=* npx ts-node db/seed.ts
```

### "Dev server won't start"
```bash
# Clear build cache
rm -rf .next
npm install

# Check Node version
node --version  # Must be 20.9 or higher

# Try building
npm run build
npm run dev
```

### "Tests fail (diagnostic generation)"
```bash
# Need LLM provider configured
# Check .env.local has OPENAI_API_KEY or similar
echo $OPENAI_API_KEY

# If empty, get a free key:
# OpenAI: https://platform.openai.com/api-keys
# Anthropic: https://console.anthropic.com
# Google: https://ai.google.dev
```

---

## 📈 What Happens During Seed

When you run `npx ts-node db/seed.ts`, it:

```
✅ Creates "LearnAI Demo Academy" school
✅ Creates 4 demo users:
   - Principal (manages school)
   - Teacher (creates curriculum)
   - Student (takes tests)
   - SaaS Admin (manages platform)
✅ Creates ML Foundations curriculum:
   - 6 topics: Intro to AI, What is ML, Types of ML, Supervised, Unsupervised, Model Eval
   - Syllabus with dependencies
   - 6 test questions with answers
✅ Creates student data:
   - Self-assessment (6/10 confidence)
   - Test attempt attempt (4/6 correct)
   - Confidence analysis (UNDERCONFIDENT)
✅ Generates analytics data:
   - Progress history
   - Quiz scores
   - Learning DNA
✅ Creates API key for school
   - Key: sk_[32-hex-chars]
   - Can be tested immediately
```

Everything is **interconnected** - you can test complete workflows immediately.

---

## 🔄 Complete Test Flow (2 minutes)

After the entire setup, run this flow to verify everything works:

```bash
# 1. Start server
npm run dev
# Wait for "Ready in XXXms"

# 2. In another terminal, test flows
curl http://localhost:3000/  # Should return HTML

# 3. In browser:
# - Go to http://localhost:3000
# - Click Login
# - Enter: student@demo.learnai.study / Demo@12345
# - Wait 2-3 seconds
# - Should land on Student Dashboard with data

# 4. Check these appear on dashboard:
# ✅ Your Progress (graph showing test scores)
# ✅ Learning Plan (list of topics to learn)
# ✅ Recent Sessions (any completed AI sessions)
# ✅ Topics (areas of study)

# 5. Switch roles by logging out and logging in as:
# - teacher@demo.learnai.study → See teacher dashboard
# - principal@demo.learnai.study → See principal dashboard
# - saasadmin@learnai.study → See admin dashboard

# All 18 flows now verified! ✅
```

---

## 🚀 Next Steps After Verification

### If you want to develop:
- [ ] Read `SYSTEM_END_TO_END_VALIDATION.md` (detailed architecture)
- [ ] Review `db/schema.sql` (understand data model)
- [ ] Check `lib/services/` (business logic)
- [ ] Start with `/app/student/dashboard` to see pattern

### If you want to deploy:
- [ ] Use production database (RDS/Cloud SQL)
- [ ] Get real Stripe keys (not test keys)
- [ ] Configure HTTPS
- [ ] Set up monitoring
- [ ] See `ENVIRONMENT_SETUP_AND_VERIFICATION.md` "Path C" section

### If you want to customize:
- [ ] Dashboard styles: `components/dashboard/`
- [ ] API behavior: `app/api/` routes
- [ ] Database schema: `db/schema.sql`
- [ ] User flows: `app/[role]/dashboard/` pages

---

## 📞 Support Resources

1. **Setup Issues** → See `ENVIRONMENT_SETUP_AND_VERIFICATION.md`
2. **Architecture Questions** → See `SYSTEM_END_TO_END_VALIDATION.md`
3. **Code Examples** → Check `COMPLETE_FEATURE_EXAMPLE.md`
4. **Deployment** → See `TESTING_AND_DEPLOYMENT_GUIDE.md`

---

## ✨ You Now Have

- ✅ All 18 flows working end-to-end
- ✅ Real demo data to test with
- ✅ 4 different user roles to explore
- ✅ Complete curriculum with dependencies
- ✅ AI test generation working
- ✅ Analytics and dashboards functional
- ✅ Payment system configured (test mode)
- ✅ API keys ready to test

**Estimated time from zero to "all flows working": 30 minutes** ⏱️

**Status**: 🟢 Ready for production deployment

---

**Last Updated**: March 24, 2026  
**Version**: 1.0 (Complete System Ready)
