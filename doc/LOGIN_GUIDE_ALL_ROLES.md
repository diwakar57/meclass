# 🔐 LearnAI - Complete Login Guide for All Accounts

**Date:** March 25, 2026  
**Status:** All accounts ready for testing

---

## 📚 Overview

LearnAI supports 8 different user roles, each with their own dashboard and capabilities. All demo accounts use the same password for testing purposes.

---

## 🔑 Demo Account Credentials

### Common Password for All Accounts
```
Password: Demo@12345
```

### Individual Account Details

| Role | Email | Password | Access Level | Dashboard |
|------|-------|----------|--------------|-----------|
| **SAAS Admin** | `saasadmin@learnai.study` | Demo@12345 | Platform-wide | SaaS Management |
| **Principal** | `principal@demo.learnai.study` | Demo@12345 | School-wide | School Analytics |
| **School Admin** | `admin@demo.learnai.study` | Demo@12345 | School-wide | Admin Panel |
| **Teacher** | `teacher@demo.learnai.study` | Demo@12345 | Class-level | Classroom Management |
| **Student** | `student@demo.learnai.study` | Demo@12345 | Personal | Learning Dashboard |
| **Parent** | `parent@demo.learnai.study` | Demo@12345 | Child-level | Child Progress |
| **Supervisor** | `supervisor@demo.learnai.study` | Demo@12345 | School-level | Supervision Dashboard |
| **Accountant** | `accountant@demo.learnai.study` | Demo@12345 | Financial | Billing & Accounting |

---

## 🚀 How to Login

### Step 1: Start the Application
```bash
npm run dev
```
Server runs on `http://localhost:3000`

### Step 2: Navigate to Login Page
Open your browser and go to:
```
http://localhost:3000/login
```

### Step 3: Enter Credentials
- **Email:** Choose from accounts above
- **Password:** `Demo@12345`

### Step 4: Click "Sign In"

---

## 📊 What Each Role Can Do

### 👨‍💼 SAAS Admin
- Manage multiple schools
- Configure platform-wide settings
- View system analytics
- Manage billing across all tenants
- Access: System administration features

**Dashboard:** `/saas-admin` or `/admin`

---

### 🏫 Principal
- **School:** Demo School (550e8400-e29b-41d4-a716-446655440000)
- View all school analytics
- Monitor student performance
- Manage teachers and classes
- Generate school reports

**Dashboard:** `/principal/analytics`

**Features:**
- Total Students: View full count
- Teacher Management: Hire/assign teachers
- Class Management: Create and manage classes
- Analytics: Student performance trends
- Attendance Reports: School-wide attendance

---

### 👔 School Admin
- **School:** Demo School
- Administrative operations
- User account management
- Billing and invoicing
- System configuration

**Dashboard:** `/admin` or `/admin/dashboard`

**Features:**
- User Management: Create/edit users
- Billing Settings: Configure payment methods
- School Settings: Customize policies
- Reporting: Generate administrative reports

---

### 👨‍🏫 Teacher
- **School:** Demo School
- Create and manage classes
- Assign and grade work
- Create AI learning sessions
- Monitor student progress

**Dashboard:** `/teacher` or `/teacher/dashboard`

**Features:**
- Class Management: Create classes, invite students
- Assignment Creation: Create assignments with AI assistance
- Grading: Grade student work
- AI Sessions: Launch AI classroom sessions
- Progress Tracking: Monitor individual student progress

---

### 👨‍🎓 Student
- **School:** Demo School
- **Grade Level:** Configurable
- Participate in classes
- Complete assignments
- Engage with AI learning
- Track personal progress

**Dashboard:** `/student` or `/student/dashboard`

**Features:**
- Class Browse: Join available classes
- Assignments: View and submit work
- AI Classroom: Participate in AI-guided lessons
- Achievements: View earned badges/certificates
- Progress: Track learning advancement
- Quiz: Take quizzes and assessments

---

### 👨‍👩‍👧‍👦 Parent
- **School:** Demo School
- Monitor child's progress
- View grades and attendance
- Receive notifications
- Track learning activities

**Dashboard:** `/parent` or `/parent/dashboard`

**Features:**
- Child Monitoring: View child's academic performance
- Grade Tracking: See all grades and assessments
- Attendance: Check attendance records
- Reports: Generate progress reports
- Notifications: Receive updates on child's activities

---

### 👮 Supervisor
- **School:** Demo School
- Supervise teachers
- Monitor school operations
- Handle compliance matters
- Manage disciplinary actions

**Dashboard:** `/supervisor` or `/supervisor/dashboard`

**Features:**
- Teacher Supervision: Monitor teaching quality
- Compliance: Track school policies
- Incident Management: Handle school issues
- Performance Reviews: Teacher evaluations

---

### 💰 Accountant
- **School:** Demo School
- Manage all billing
- Process payments
- Generate invoices
- Track expenses

**Dashboard:** `/accountant` or `/accountant/dashboard`

**Features:**
- Billing Management: Create and manage invoices
- Payment Processing: Process student/parent payments
- Financial Reports: Generate financial statements
- Expense Tracking: Track school expenses

---

## 🧪 Testing Each Role

### Quick Test Script
```bash
# Test login for each role
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "principal@demo.learnai.study",
    "password": "Demo@12345"
  }'
```

---

## 📱 Mobile Testing

All accounts work on mobile and tablet versions:
- **Responsive Design:** Fully responsive dashboards
- **Mobile Features:** Touch-optimized interfaces
- **Cross-Platform:** Same features on all devices

---

## 🔒 Security Notes

### Demo Credentials
- ⚠️ These are demo accounts only
- Change password after first login (optional for testing)
- Each role has appropriate permission levels
- Data is school-isolated (Principal only sees their school)

### Password Hashing
- Passwords are hashed with bcrypt
- Demo password hash: `$2b$10$ljnf6nGIiIaHflfGtIPKae48tx0kvBSN1byQa/UR.EGBzG7obtE/O`
- Production uses secure password generation

---

## ❌ Troubleshooting Login Issues

### "Invalid email or password"
**Solution:** Check spelling of email and password (case-sensitive)
```
Correct: Demo@12345 (capital D)
Wrong:   demo@12345  (lowercase d)
```

### "User not found"
**Solution:** Run setup script to create demo accounts
```bash
node setup-demo-accounts.js
```

### "Email or password incorrect"
**Solution:** Verify credentials from table above

### "Account is inactive"
**Solution:** Admin needs to activate account in admin panel

### "Too many login attempts"
**Solution:** Wait 15 minutes or clear browser cookies

---

## 📋 Testing Workflow

### Test Complete Flow (30 minutes)
1. **Student Login** (5 min)
   - Login as student
   - View dashboard
   - Explore assignments
   
2. **Teacher Logic** (5 min)
   - Login as teacher
   - Create a test class
   - Assign assignment to student
   
3. **Parent Monitoring** (5 min)
   - Login as parent
   - View student grades
   - Check attendance
   
4. **Principal Analytics** (5 min)
   - Login as principal
   - View school metrics
   - Check performance reports
   
5. **Billing/Admin** (5 min)
   - Login as accountant
   - View billing dashboard
   - Check invoices

---

## 🔗 Quick Login Links

Open these directly in your browser:

- **Student:** http://localhost:3000/login?email=student@demo.learnai.study
- **Teacher:** http://localhost:3000/login?email=teacher@demo.learnai.study
- **Principal:** http://localhost:3000/login?email=principal@demo.learnai.study
- **Parent:** http://localhost:3000/login?email=parent@demo.learnai.study
- **Admin:** http://localhost:3000/login?email=admin@demo.learnai.study

*(Password field will still need manual entry)*

---

## 📞 Support

### Role-Specific Help

**For Student Issues:**
- Check `/student/help` or `/help/student`
- Contact teacher for assignment help
- Use AI assistant in classroom

**For Teacher Issues:**
- Check `/teacher/help`
- View training materials
- Contact admin support

**For Admin Issues:**
- System settings: `/admin/settings`
- User management: `/admin/users`
- Billing: `/admin/billing`

---

## 🎯 Next Steps

1. ✅ Start dev server: `npm run dev`
2. ✅ Navigate to: `http://localhost:3000/login`
3. ✅ Login with credentials from table above
4. ✅ Explore role-specific features
5. ✅ Test multi-user workflows

---

**Status:** ✅ All demo accounts configured  
**Last Updated:** March 25, 2026  
**Version:** Complete Login Guide v1.0
