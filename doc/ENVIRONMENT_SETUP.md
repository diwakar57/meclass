# Environment Configuration Guide

## Overview

The authentication system requires several environment variables for:
- JWT token generation and validation
- Database connectivity
- API configuration
- Security settings

---

## Required Environment Variables

### Authentication & Tokens

```env
# JWT Secret key for signing tokens (minimum 32 characters, use strong random string)
JWT_SECRET=your-super-secret-key-minimum-32-characters-long-12345678

# Token expiration times
JWT_EXPIRATION=24h              # Access token valid for 24 hours
REFRESH_TOKEN_EXPIRATION=7d     # Refresh token valid for 7 days
```

**How to Generate a Secure JWT_SECRET:**

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32

# Example output:
# 9f7e6d5c4b3a2918f0e9d8c7b6a5949383827160a9f8e7d6c5b4a39382817
```

**Option 3: Using Python**
```bash
python -c "import secrets; print(secrets.token_hex(32))"

# Example output:
# f1e2d3c4b5a6978869576495c4a3b2a1f0e9d8c7b6a5949383827160a9f8e
```

### Database Configuration

```env
# PostgreSQL connection string
# Format: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://postgres:password@localhost:5432/openmaix_db

# Example with remote database:
# DATABASE_URL=postgresql://user:password@db.example.com:5432/openmaix_db

# Example with Docker database:
# DATABASE_URL=postgresql://postgres:password@postgres:5432/openmaix_db
```

**Database Connection Tips:**
- Default PostgreSQL port: 5432
- Default postgres user password: typically requires no password on localhost
- For local development: `postgresql://postgres:@localhost:5432/openmaix_db` (no password)
- For production: Use strong password and remote host

### API Configuration

```env
# API base URL for frontend API calls
NEXT_PUBLIC_API_URL=http://localhost:3000

# For local development:
# NEXT_PUBLIC_API_URL=http://localhost:3000

# For production:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**Note:** `NEXT_PUBLIC_*` prefix makes this variable available in browser. Use for non-sensitive config only.

### Node Environment

```env
# Node environment
NODE_ENV=development

# Options:
# - development: Use for local development (enables logging, faster rebuilds)
# - production: Use for production (optimized, secure cookies over HTTPS only)
```

### Optional: Email Configuration (for future notifications)

```env
# SMTP for email notifications (optional for auth system, but needed for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@learnai.study

# For Gmail, use App Password (not regular password)
# Enable 2FA and create: https://support.google.com/accounts/answer/185833
```

### Optional: Cloud Storage (for user avatars, documents)

```env
# AWS S3 or similar
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=openmaix-uploads
```

### Optional: External Services

```env
# Azure Speech Services for audio generation
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=eastus

# OpenAI/Claude for AI features
OPENAI_API_KEY=sk-...
```

---

## Setup Instructions

### Step 1: Create `.env.local` File

In project root (`/mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/`):

```bash
# Create file
touch .env.local

# Or in Windows
# type nul > .env.local
```

### Step 2: Copy Required Variables

Edit `.env.local` with a text editor:

```env
# ============================================
# AUTHENTICATION & TOKENS (REQUIRED)
# ============================================

JWT_SECRET=<generate-using-openssl-or-node>
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# ============================================
# DATABASE (REQUIRED)
# ============================================

DATABASE_URL=postgresql://postgres:@localhost:5432/openmaix_db

# ============================================
# API (REQUIRED)
# ============================================

NEXT_PUBLIC_API_URL=http://localhost:3000

# ============================================
# ENVIRONMENT (REQUIRED)
# ============================================

NODE_ENV=development
```

### Step 3: Verify Database Connection

```bash
# Test PostgreSQL connection
psql -U postgres -d openmaix_db -c "SELECT version();"

# Expected output should show PostgreSQL version
```

### Step 4: Run Database Migrations

```bash
# If using Prisma:
npm run prisma:migrate

# If using SQL files:
psql -U postgres -d openmaix_db -f db/schema.sql
psql -U postgres -d openmaix_db -f db/schema-payments.sql
```

### Step 5: Seed Test Data

```bash
# Run seed script
npm run seed

# Or manually insert:
psql -U postgres -d openmaix_db << 'EOF'
INSERT INTO users (school_id, email, password_hash, role, first_name, last_name)
VALUES 
  (1, 'student@school.com', '$2b$10$...[hashed-password]...', 'student', 'Bob', 'Student'),
  (1, 'teacher@school.com', '$2b$10$...[hashed-password]...', 'teacher', 'Jane', 'Teacher'),
  (1, 'principal@school.com', '$2b$10$...[hashed-password]...', 'principal', 'John', 'Principal'),
  (1, 'admin@school.com', '$2b$10$...[hashed-password]...', 'saas_admin', 'Admin', 'Admin'),
  (1, 'accountant@school.com', '$2b$10$...[hashed-password]...', 'accountant', 'Alice', 'Accountant'),
  (1, 'supervisor@school.com', '$2b$10$...[hashed-password]...', 'supervisor', 'Charlie', 'Supervisor'),
  (1, 'parent@school.com', '$2b$10$...[hashed-password]...', 'parent', 'David', 'Parent');
EOF
```

### Step 6: Start Development Server

```bash
# Install dependencies
npm install
# or
pnpm install

# Start dev server
npm run dev
# or
pnpm dev

# Server should run on http://localhost:3000
```

### Step 7: Verify Auth System Working

Open browser and navigate to:
```
http://localhost:3000/auth/login
```

Try login with:
- Email: `student@school.com`
- Password: `password123` (or whatever you set in seed)

Expected: Redirects to `/student/dashboard`

---

## Environment Variables by Environment

### Development (.env.local)

```env
JWT_SECRET=dev-secret-key-at-least-32-chars-1234567890
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

DATABASE_URL=postgresql://postgres:@localhost:5432/openmaix_db

NEXT_PUBLIC_API_URL=http://localhost:3000

NODE_ENV=development
```

### Staging (.env.staging)

```env
JWT_SECRET=<use-strong-random-32-char-secret>
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

DATABASE_URL=postgresql://user:password@staging-db.example.com:5432/openmaix_db

NEXT_PUBLIC_API_URL=https://staging.yourdomain.com

NODE_ENV=production
```

### Production (.env.production)

```env
JWT_SECRET=<use-very-strong-random-32-char-secret>
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

DATABASE_URL=postgresql://user:strong_password@db.yourdomain.com:5432/openmaix_db

NEXT_PUBLIC_API_URL=https://api.learnai.study

NODE_ENV=production
```

**Security Best Practices for Production:**
1. Never commit `.env.production` to git
2. Use environment variables from CI/CD platform (GitHub Secrets, Vercel, etc.)
3. Use strong passwords (20+ chars) for database
4. Use HTTPS-only (set `Secure` flag on cookies)
5. Rotate JWT_SECRET periodically
6. Monitor failed login attempts
7. Use VPN or IP whitelist for database access

---

## Verifying Environment Setup

### Checklist

- [ ] `.env.local` file exists
- [ ] `JWT_SECRET` is set (min 32 chars)
- [ ] `DATABASE_URL` points to running PostgreSQL
- [ ] `NEXT_PUBLIC_API_URL` is set
- [ ] `NODE_ENV` is set
- [ ] Database connection works: `psql -U postgres -d openmaix_db -c "SELECT 1;"`
- [ ] Test user data exists: `SELECT * FROM users;`
- [ ] No errors in `npm run dev` startup

### Test Commands

```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Verify DATABASE_URL is set
echo $DATABASE_URL

# Verify PostgreSQL is running
psql -U postgres -d openmaix_db -c "SELECT version();"

# Verify users table exists and has data
psql -U postgres -d openmaix_db -c "SELECT email, role FROM users LIMIT 5;"

# Start development server and check for errors
npm run dev
```

---

## Troubleshooting Environment Issues

### Error: "ENOENT: no such file (.env.local)"

**Solution:** Create the file:
```bash
touch .env.local
echo "JWT_SECRET=your-32-char-secret" >> .env.local
```

### Error: "Environment variable JWT_SECRET is not defined"

**Solution:** Make sure `.env.local` exists in project root (not in `app/` or `lib/`)

**Check:**
```bash
ls -la .env.local              # Should exist in /mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/
cat .env.local | grep JWT      # Should show JWT_SECRET line
```

### Error: "ECONNREFUSED 127.0.0.1:5432"

**Problem:** PostgreSQL is not running

**Solution:**
```bash
# Start PostgreSQL
# On Mac:
brew services start postgresql

# On Linux:
sudo systemctl start postgresql

# On Windows (with WSL):
sudo service postgresql start

# Verify it's running:
psql -U postgres -c "SELECT 1;"
# Should return: 1
```

### Error: "FATAL: database openmaix_db does not exist"

**Solution:** Create the database:
```bash
psql -U postgres -c "CREATE DATABASE openmaix_db;"

# Then run migrations:
psql -U postgres -d openmaix_db -f db/schema.sql
psql -U postgres -d openmaix_db -f db/schema-payments.sql
```

### Error: "The server is running but the environment variables are not loaded"

**Solution:** Restart the dev server:
```bash
# Stop the server (Ctrl+C)
# Then start again:
npm run dev

# Or completely clean rebuild:
rm -rf .next
npm run dev
```

### Error: "Cookies not being set (httpOnly always false)"

**Problem:** NODE_ENV is not 'production' or credentials not included

**Solution:**
- For dev: httpOnly works locally (browser allows it)
- For prod: Ensure NODE_ENV=production
- For HTTPS: Ensure Secure flag set in cookie handler

---

## Using Environment Variables in Code

### In Next.js API Routes

```typescript
// app/api/auth/login/route.ts
const jwtSecret = process.env.JWT_SECRET;
const dbUrl = process.env.DATABASE_URL;

if (!jwtSecret) {
  throw new Error('JWT_SECRET is not defined');
}
```

### In Client Components (Public Variables Only)

```typescript
// Only use NEXT_PUBLIC_* variables
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// This will be available in browser:
fetch(`${apiUrl}/api/auth/me`)
```

### In Server Components

```typescript
// Can use any environment variable
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;

export async function getData() {
  // These are never exposed to browser
}
```

---

## Security Notes

### Do NOT

❌ Commit `.env.local` or `.env.production` to git  
❌ Push JWT_SECRET to GitHub  
❌ Use weak passwords or short secrets  
❌ Share JWT_SECRET in Slack, email, etc.  
❌ Log JWT tokens to console  
❌ Send JWT in URL parameters  

### Do

✅ Store sensitive variables in CI/CD platform  
✅ Use `.gitignore` to exclude `.env*` files  
✅ Rotate secrets periodically  
✅ Use different JWT_SECRET for dev/staging/prod  
✅ Use strong passwords (20+ chars) for database  
✅ Enable HTTPS for production  
✅ Monitor for failed login attempts  

---

## Next Steps

1. ✅ Create `.env.local` with required variables
2. ✅ Verify PostgreSQL connection
3. ✅ Run database migrations
4. ✅ Seed test data
5. ✅ Start dev server
6. ✅ Test login with demo account
7. ✅ Run AUTH_SYSTEM_TESTING_GUIDE.md scenarios
8. ✅ Deploy to staging/production

---

**Last Updated:** 2025  
**Status:** Ready for Setup  
**Dependencies:** PostgreSQL 12+, Node.js 18+
