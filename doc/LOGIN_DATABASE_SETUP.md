# 🔐 Login & Database Configuration Guide

**Status**: ✅ Development Mode Enabled - Login Now Available  
**Date**: March 24, 2026

---

## 🔑 Login Now (Development Mode)

Your platform is now in **development mode** with mock authentication enabled. You can log in with these demo credentials:

### Available Demo Users

| Role | Email | Password |
|------|-------|----------|
| **SaaS Admin** | admin@learnai.com | admin123 |
| **Principal** | principal@demo.learnai.study | principal123 |
| **Teacher** | teacher@demo.learnai.study | teacher123 |
| **Student** | student@demo.learnai.study | student123 |

**Login URL**: http://localhost:3000/auth/login

### What Works in Development Mode
✅ Login and authentication  
✅ Dashboard navigation  
✅ UI exploration  
✅ Role-based access  
⚠️ Data persistence (limited - in-memory only)  
⚠️ Real-time analytics (mock data)  

---

## 📚 Next Steps: Production Database Setup

For a fully functional platform with persistent data, set up one of these databases:

### Option 1: Neon Cloud Database (⭐ Recommended - 5 minutes)

**Fastest setup for production:**

1. **Create Neon Account**
   ```
   Go to https://neon.tech
   Sign up with email or GitHub
   Create free project
   ```

2. **Get Connection String**
   ```
   Copy the postgresql:// URL from Neon dashboard
   ```

3. **Update .env.local**
   ```bash
   # Replace the DATABASE_URL line in .env.local with:
   DATABASE_URL=postgresql://[your_neon_connection_string]
   
   # Disable development auth fallback:
   ENABLE_DEV_AUTH_FALLBACK=false
   ```

4. **Initialize Database**
   ```bash
   # Run this in terminal:
   npx ts-node db/seed.ts
   ```

5. **Restart Server**
   ```bash
   # Press Ctrl+C in the terminal running the server
   # Then restart: npm run dev
   ```

---

### Option 2: Docker PostgreSQL (Local - 10 minutes)

**If you install Docker:**

```bash
# Start PostgreSQL container
docker run -d --name learnai_db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=learnai \
  -p 5432:5432 \
  postgres:15

# Update .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/learnai
ENABLE_DEV_AUTH_FALLBACK=false

# Initialize database
npx ts-node db/seed.ts

# Restart server
npm run dev
```

---

### Option 3: Other Cloud Providers

**Supabase** (PostgreSQL managed):
- Go to https://supabase.com
- Create free project
- Copy connection string
- Follow any of the setup steps above

**Railway** (Simple deployment):
- Go to https://railway.app
- Create PostgreSQL database
- Get connection string
- Follow the setup steps above

**AWS RDS** (Enterprise):
- AWS Console → RDS
- Create PostgreSQL instance
- Get endpoint and credentials
- Follow the setup steps above

---

## 🔄 Switching Between Modes

### Development Mode (Current)
```
DATABASE_URL=mock://development
ENABLE_DEV_AUTH_FALLBACK=true
← Login with demo credentials
← Data not persistent
← Fast testing
```

### Production Mode
```
DATABASE_URL=postgresql://real_database_url
ENABLE_DEV_AUTH_FALLBACK=false
← Real user database
← Data persistent
← Seed with real data
```

---

## ✅ Database Setup Checklist

After setting up a production database:

- [ ] Created database account (Neon, Supabase, etc.)
- [ ] Copied connection string
- [ ] Updated DATABASE_URL in .env.local
- [ ] Set ENABLE_DEV_AUTH_FALLBACK=false
- [ ] Ran `npx ts-node db/seed.ts`
- [ ] Restarted the server (`npm run dev`)
- [ ] Successfully logged in with real user

---

## 🆘 Troubleshooting

### "Invalid email or password" after updating DATABASE_URL
**Cause**: New database doesn't have users yet  
**Solution**:
```bash
npx ts-node db/seed.ts
# This creates demo users in your new database
```

### Server won't restart
**Cause**: Old environment cached  
**Solution**:
```bash
# Kill the old process
killall node
# Or: ps aux | grep node (find PID, then kill -9 PID)

# Restart
npm run dev
```

### "connect ECONNREFUSED" error
**Cause**: PostgreSQL not running  
**Solution**:
- If using Docker: `docker start learnai_db`
- If using cloud: Check your connection string
- Use Neon (recommended) - no installation needed

### "relation 'users' does not exist"
**Cause**: Database not initialized  
**Solution**:
```bash
npx ts-node db/seed.ts
```

---

## 📊 Demo Data Included

When you seed the database, you get:

- **1 School**: LearnAI Demo Academy
- **4 Demo Users**: Admin, Principal, Teacher, Student
- **10+ Curriculum Topics**: AI, ML, etc.
- **Sample Syllabus**: Ready to teach
- **Complete Schema**: All tables pre-created

---

## 🚀 Advanced: Custom Database Setup

For custom database setup or specific configurations, see:
- `db/schema.sql` - Database schema
- `db/seed.ts` - Seed script
- `ENVIRONMENT_SETUP_AND_VERIFICATION.md` - Detailed guide

---

**You're all set!** Start with development mode, then set up a production database when ready.

**Questions?** Check the documentation files in the root directory.
