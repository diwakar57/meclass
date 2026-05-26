# 🎯 LearnAI Dashboard Testing Guide

**Complete end-to-end testing flows for all user roles and dashboards**

---

## 🔐 Demo Test Credentials

Login at: **http://localhost:3000/auth/login**

### 1. **Administrator (SaaS Admin)**
- **Email**: `admin@learnai.com`
- **Password**: `admin123`
- **Dashboard**: `/admin/dashboard`
- **Role ID**: `saas_admin`

### 2. **Principal (School Admin)**
- **Email**: `principal@demo.learnai.study`
- **Password**: `principal123`
- **Dashboard**: `/principal/dashboard`
- **Role ID**: `principal` / `school_admin`

### 3. **Teacher**
- **Email**: `teacher@demo.learnai.study`
- **Password**: `teacher123`
- **Dashboard**: `/teacher/dashboard`
- **Role ID**: `teacher`

### 4. **Student**
- **Email**: `student@demo.learnai.study`
- **Password**: `student123`
- **Dashboard**: `/student/dashboard`
- **Role ID**: `student`

---

## 📊 Dashboard Overview

### Route Structure
```
Primary Routes:        Alternate Routes:
/admin/dashboard   →   /dashboard/admin
/principal/dashboard → /dashboard/principal
/teacher/dashboard →   /dashboard/teacher
/student/dashboard →   /dashboard/student
/parent/dashboard  →   /dashboard/parent
/accountant/dashboard → /dashboard/accountant
/supervisor/dashboard → /dashboard/supervisor
```

---

## 🧪 Test Flows by User Role

### 1️⃣ **ADMINISTRATOR (SaaS Admin) - Platform Overview**

**Login Credentials**: `admin@learnai.com` / `admin123`

#### Key Metrics to Check:
- ✅ **Total Schools** - Number of registered schools
- ✅ **Active Subscriptions** - Current subscription count
- ✅ **Monthly Revenue** - Revenue trends
- ✅ **School Growth** - Growth metrics over time
- ✅ **Platform Usage** - Overall platform engagement
- ✅ **Plan Distribution** - Breakdown of plans (Free, Professional, Enterprise)

#### Dashboard Components:
- Summary cards showing KPIs
- Line chart for monthly revenue trends
- Bar chart for school growth
- Donut chart for plan distribution
- Heatmap for platform usage patterns

#### Test Steps:
```
1. Navigate to http://localhost:3000/auth/login
2. Enter: admin@learnai.com / admin123
3. Verify redirect to /admin/dashboard
4. Check all summary cards load with data
5. Verify charts render without errors
6. Refresh page (F5) - data should persist
7. Check responsive design (resize window)
```

#### Expected Behaviors:
- Dashboard auto-refreshes every 60 seconds
- Charts are interactive (hover shows tooltips)
- Data updates in real-time
- Mobile responsive on smaller screens

---

### 2️⃣ **PRINCIPAL (School Administrator)**

**Login Credentials**: `principal@demo.learnai.study` / `principal123`

#### Key Metrics to Check:
- ✅ **Total Students** - Count of enrolled students
- ✅ **Total Teachers** - Count of staff
- ✅ **Attendance Trend** - Daily/weekly attendance patterns
- ✅ **Subject Performance** - Performance by subject/topic
- ✅ **Class Performance Comparison** - Class-wise benchmarking
- ✅ **Fee Collection** - Financials (collected vs outstanding)
- ✅ **Syllabus Completion** - Curriculum progress percentage

#### Dashboard Tabs:
1. **Overview Tab** - Main analytics and KPIs
2. **Join Requests Tab** - Pending staff/teacher requests
3. **Members Tab** - Approved staff and teachers

#### Test Steps:
```
1. Login: principal@demo.learnai.study / principal123
2. Verify redirect to /principal/dashboard
3. Check Overview tab:
   - Summary cards show students/teachers count
   - Charts render properly
4. Click "Join Requests" tab:
   - See pending approval requests
   - Test Approve/Reject buttons
5. Click "Members" tab:
   - See approved staff members
   - Verify member details display
6. Test data filtering and sorting
```

#### Expected Behaviors:
- Three distinct tabs with different data
- Approve/Reject buttons for requests
- Real-time member list updates
- Search/filter functionality for members

---

### 3️⃣ **TEACHER (Classroom Educator)**

**Login Credentials**: `teacher@demo.learnai.study` / `teacher123`

#### Key Metrics to Check:
- ✅ **Total Students** - Class size
- ✅ **Average Class Score** - Overall performance
- ✅ **Engagement Percentage** - Student participation rate
- ✅ **Student Progress Trend** - Learning curve over time
- ✅ **Topic Mastery** - Subject mastery levels
- ✅ **Quiz Performance Distribution** - Score distribution
- ✅ **Assignment Completion** - Submission rates
- ✅ **At-Risk Students** - Students needing intervention

#### Dashboard Features:
- Class selector dropdown
- Student performance table
- Topic mastery heatmap
- Progress trend line chart
- Assignment completion gauge

#### Test Steps:
```
1. Login: teacher@demo.learnai.study / teacher123
2. Verify redirect to /teacher/dashboard
3. Check class selector dropdown:
   - Select different classes
   - Data updates accordingly
4. Verify all analytics cards:
   - Total Students
   - Average Class Score
   - Engagement %
5. Check charts:
   - Progress trend chart updates
   - Topic mastery displays
   - Performance distribution
6. Look for "At-Risk Students" section:
   - See list of struggling students
   - Click to view detailed profiles
7. Test interactive chart elements (hover, click)
```

#### Expected Behaviors:
- Class selector updates all data in real-time
- Charts show smooth animations
- At-risk students highlighted with action buttons
- Mobile-responsive table layout

---

### 4️⃣ **STUDENT (Learner)**

**Login Credentials**: `student@demo.learnai.study` / `student123`

#### Key Metrics to Check:
- ✅ **Overall Progress** - Learning completion percentage
- ✅ **School Count** - Number of schools attended
- ✅ **Personal Progress Over Time** - Growth trajectory
- ✅ **Mastery by Topic** - Competency breakdown
- ✅ **Completed vs Pending Lessons** - Course progress
- ✅ **Quiz Score History** - Assessment performance
- ✅ **Learning DNA** - Learning style profile
- ✅ **Streak Status** - Consistency metrics

#### Dashboard Features:
- Personal learning stats
- Progress timeline chart
- Topic mastery visualization
- Quiz score history
- Learning style profile (pace, mistakes, preferences)
- Current streak counter

#### Test Steps:
```
1. Login: student@demo.learnai.study / student123
2. Verify redirect to /student/dashboard
3. Check personal stats:
   - Overall Progress percentage
   - School count display
4. Review Learning DNA section:
   - Pace Type (Fast, Moderate, Slow)
   - Mistake Type (Careless, Conceptual)
   - Preferred Style (Visual, Auditory, etc.)
5. Check charts:
   - Progress over time (line chart)
   - Topic mastery (bar chart)
   - Completed vs pending lessons
6. Verify streak status:
   - Current streak count
   - Best streak record
7. Test lesson/quiz navigation links
```

#### Expected Behaviors:
- Personalized dashboard shows individual progress
- Charts animate on page load
- Learning DNA profile provides insights
- Links to lessons and quizzes work properly

---

### 5️⃣ **PARENT (Guardian)**

**Login Credentials**: Create parent account or use demo parent credentials

#### Key Metrics to Check:
- ✅ **Child Progress Summary** - Child's overall performance
- ✅ **Recent Score Trend** - Recent assessment results
- ✅ **Strengths vs Weaknesses** - Subject analysis
- ✅ **Attendance/Engagement Overview** - Activity summary
- ✅ **Fee Payment Summary** - Outstanding balances
- ✅ **Learning DNA** - Child's learning profile

#### Dashboard Features:
- Child selector if multiple children
- Score trend visualization
- Strengths/weaknesses chart
- Payment status display
- Activity summary

#### Test Steps:
```
1. Create parent account (if not existing):
   - Go to /auth/signup
   - Select "I'm a Parent"
   - Complete registration with child details
2. Login with parent credentials
3. Check child progress:
   - View overall performance
   - Check recent test scores
4. Review insights:
   - Strengths in green
   - Weaknesses in red
5. Check payment status:
   - View outstanding fees
   - See payment history
6. Test child switching (if multiple children):
   - Switch between children
   - Verify data updates
```

#### Expected Behaviors:
- Clean, easy-to-understand visualizations
- Clear action items (e.g., "Pay Outstanding Fees")
- Links to child profiles and preferences
- Mobile-first responsive design

---

### 6️⃣ **ACCOUNTANT (Finance Manager)**

**Login Credentials**: Create accountant account or demo credentials

#### Key Metrics to Check:
- ✅ **Total Outstanding Fees** - Receivables
- ✅ **Total Collected** - Revenue recognized
- ✅ **Fee Collection Percentage** - Collection rate
- ✅ **Fees by Status** - Paid, Pending, Overdue breakdown
- ✅ **Monthly Collections** - Revenue trends
- ✅ **Overdue Invoices** - Past due accounts
- ✅ **Fees by Grade** - Per-grade revenue

#### Dashboard Features:
- Financial KPI cards
- Collection percentage gauge
- Collection trend line chart
- Overdue invoices data table
- Grade-wise fee breakdown

#### Test Steps:
```
1. Login with accountant credentials
2. Verify redirect to /accountant/dashboard
3. Check financial cards:
   - Total Outstanding Fees
   - Total Collected
   - Collection Percentage
4. Review charts:
   - Monthly collections trend
   - Fees by status breakdown
   - Fees by grade distribution
5. Check overdue invoices table:
   - Sort by days overdue
   - Click to view invoice details
6. Test date range filter (if available):
   - Select date range
   - Verify data updates
```

#### Expected Behaviors:
- Financial data clearly displayed
- Overdue alerts highlighted in red
- Export functionality for reports
- Clear action buttons for payment follow-up

---

### 7️⃣ **SUPERVISOR (District/Network Admin)**

**Login Credentials**: Create supervisor account or demo credentials

#### Key Metrics to Check:
- ✅ **Monthly Active Users** - Platform engagement
- ✅ **Active Classes** - Classes in session
- ✅ **Platform Engagement** - Overall usage percentage
- ✅ **Monthly User Growth** - Growth trends
- ✅ **Class Performance** - School/class benchmarking
- ✅ **Teacher Performance** - Staff effectiveness
- ✅ **Risk Distribution** - At-risk students by risk level
- ✅ **School Comparison** - School benchmarking
- ✅ **At-Risk Schools** - Schools needing support

#### Dashboard Features:
- Multi-school analytics
- Comparative performance charts
- Teacher effectiveness metrics
- Risk heatmaps
- Growth tracking

#### Test Steps:
```
1. Login with supervisor credentials
2. Verify redirect to /supervisor/dashboard
3. Check engagement metrics:
   - Monthly active users
   - Active classes count
   - Overall engagement %
4. Review comparative charts:
   - User growth over time
   - Class performance comparison
   - Teacher performance ranking
5. Check risk analysis:
   - Risk distribution chart
   - At-risk schools list
   - Risk score interpretation
6. Test school/teacher selector:
   - Filter by school
   - Filter by teacher
   - Verify data updates
```

#### Expected Behaviors:
- Multi-level aggregation (district-wide view)
- Drill-down capability to individual schools
- Comparative analytics for benchmarking
- Clear risk indicators and action items

---

## 🔄 Complete User Journey Test

### Flow 1: Landing Page → Sign Up → First Login → Dashboard

```
✅ Step 1: Landing Page
   - Go to http://localhost:3000
   - Verify futuristic design loads
   - Check all sections visible

✅ Step 2: Click "Sign Up"
   - Go to /auth/signup
   - Choose user type (Teacher, Student, Parent, etc.)
   - Fill form with test data
   - Submit

✅ Step 3: First Login
   - Email verification (if required)
   - Login with new credentials
   - Verify redirect to correct dashboard

✅ Step 4: Dashboard Exploration
   - Check all widgets load
   - Verify data displays correctly
   - Test navigation menus
```

### Flow 2: School Registration → Principal Login → Team Management

```
✅ Step 1: School Registration
   - Go to http://localhost:3000
   - Click "For Schools"
   - Proceed to /register-school
   - Fill school details
   - Submit

✅ Step 2: Principal Onboarding
   - Email confirmation
   - Create principal account
   - First login verification

✅ Step 3: Dashboard Testing
   - Check school overview
   - Review student/teacher counts
   - Test join request feature
   - Approve sample teacher requests
```

### Flow 3: Role-Based Access Control

```
✅ Test Direct URL Access:
   - As admin, try /teacher/dashboard → ✓ Allowed or redirected
   - As teacher, try /admin/dashboard → ✗ Redirected to teacher dashboard
   - As student, try /accountant/dashboard → ✗ Redirected to student dashboard

✅ Test Session Persistence:
   - Login as student
   - Navigate to different pages
   - Refresh page (F5) 
   - Verify still logged in

✅ Test Logout:
   - Click logout button
   - Verify redirected to login
   - Try to access dashboard → Redirected to login
```

---

## 📱 Responsive Design Testing

Test each dashboard on:
- **Desktop** (1920x1080)
- **Tablet** (768x1024)
- **Mobile** (375x667)
- **Large Monitor** (2560x1440)

### Checklist:
- [ ] Sidebar/Menu responsive
- [ ] Charts fit screen properly
- [ ] Cards stack on mobile
- [ ] Navigation buttons accessible
- [ ] Forms are mobile-friendly
- [ ] No horizontal scrolling needed
- [ ] Touch targets are at least 44x44px

---

## 🎨 Visual Verification

### Landing Page
- [ ] Particle effects visible
- [ ] Gradient animations smooth
- [ ] 3D card animations work
- [ ] Text is readable
- [ ] All sections accessible via scroll
- [ ] CTA buttons are prominent
- [ ] Mobile menu works

### Dashboards
- [ ] Header/nav visible and functional
- [ ] Summary cards properly styled
- [ ] Charts render without errors
- [ ] Colors are accessible (good contrast)
- [ ] Animations are smooth (60fps)
- [ ] Hover states work
- [ ] Loading states are clear

---

## 🚨 Error Scenarios to Test

### Test Cases:
```
1. Slow Network
   - Simulate 3G in DevTools
   - Check loading states
   - Verify proper error messages

2. Missing Data
   - What if no students enrolled?
   - What if no test scores yet?
   - Check EmptyState components

3. Authentication Failures
   - Wrong password
   - Invalid credentials
   - Expired session

4. Invalid Routes
   - Try /dashboard/nonexistent
   - Try /invalid/path
   - Verify proper 404 handling
```

---

## 📊 Data Verification

### Admin Dashboard
- Schools count increases
- Revenue updates when new subscription
- Monthly data points match
- Growth trend is logical

### Principal Dashboard
- Student count accurate
- Teacher count accurate
- Attendance trends make sense
- Fee collection % is correct

### Teacher Dashboard
- Student list matches enrollment
- Average score matches quiz results
- Topic mastery sums correctly
- At-risk students actually struggle

### Student Dashboard
- Progress percentage increases
- Quiz scores reflect attempts
- Topic mastery changes after tests
- Streak updates daily

---

## 🔐 Security Checks

- [ ] XSS - No script injection possible
- [ ] CSRF - Token validation present
- [ ] SQL Injection - Parameterized queries
- [ ] Session Hijacking - Secure cookies
- [ ] Role Verification - Can't bypass role checks
- [ ] Data Privacy - Can't see other user's data
- [ ] Password Security - Hashed, minimum requirements
- [ ] HTTPS - All connections encrypted (production)

---

## 📝 Test Result Template

```
Date: _______________
Tester: _______________
Environment: Development / Staging / Production

User Role Tested: _________________
Credentials Used: _________________
Dashboard URL: _________________

✅ PASSED TESTS:
- [ ] Component 1 loads
- [ ] Component 2 interactive
- [ ] Data displays correctly
- [ ] Charts render properly

❌ FAILED TESTS:
- [ ] Issue 1
- [ ] Issue 2

⚠️ NOTES:
_________________________________

Signature: _______________
```

---

## 📞 Support

If you encounter issues:

1. **Check Browser Console** (F12 → Console tab)
2. **Check Network Tab** for failed requests
3. **Verify Demo Credentials** are correct
4. **Clear Browser Cache** (Ctrl+Shift+Delete)
5. **Restart Development Server** if data unchanged
6. **Check /doc/TROUBLESHOOTING_GUIDE.ts** for common issues

---

**Last Updated**: March 24, 2026  
**Status**: ✅ All dashboards implemented and tested
