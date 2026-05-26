#!/bin/bash

# LearnAI Test Credentials Display Script
# Shows all 22 test accounts with color formatting

cat <<'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🎯 LEARNAI TEST USER CREDENTIALS - QUICK REFERENCE              ║
║                                                                              ║
║              Login at: http://localhost:3000/auth/login                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

EOF

# Color codes
ADMIN='\033[0;94m'      # Blue
PRINCIPAL='\033[0;92m'  # Green
TEACHER='\033[0;93m'    # Yellow
STUDENT='\033[0;95m'    # Magenta
PARENT='\033[0;96m'     # Cyan
ACCOUNTANT='\033[0;91m' # Red
SUPERVISOR='\033[0;97m' # White
RESET='\033[0m'

echo_section() {
    echo -e "\n${1}\n═══════════════════════════════════════════════════════════════════════════════\n"
}

echo_user() {
    local color=$1
    local num=$2
    local name=$3
    local email=$4
    local password=$5
    local details=$6
    
    printf "${color}%-3s%-30s${RESET}\n" "$num." "$name"
    printf "     Email:    ${color}%s${RESET}\n" "$email"
    printf "     Password: ${color}%s${RESET}\n" "$password"
    if [ -n "$details" ]; then
        printf "     %s\n" "$details"
    fi
    echo ""
}

# ============================================================================
# ADMINISTRATORS
# ============================================================================
echo_section "${ADMIN}🔐 ADMINISTRATORS (1 Account)${RESET}"

echo_user "$ADMIN" "1" "Admin User" "admin@learnai.com" "admin123" "Role: SaaS Admin"

# ============================================================================
# PRINCIPALS
# ============================================================================
echo_section "${PRINCIPAL}🏫 PRINCIPALS (3 Accounts)${RESET}"

echo_user "$PRINCIPAL" "1" "Dr. Sarah Mitchell" "principal@demo.learnai.study" "principal123" "School: Lincoln High School"
echo_user "$PRINCIPAL" "2" "Mr. James Rodriguez" "principal2@demo.learnai.study" "principal123" "School: Central Elementary School"
echo_user "$PRINCIPAL" "3" "Ms. Emily Chen" "principal3@demo.learnai.study" "principal123" "School: Riverside Middle School"

# ============================================================================
# TEACHERS
# ============================================================================
echo_section "${TEACHER}👨‍🏫 TEACHERS (5 Accounts)${RESET}"

echo_user "$TEACHER" "1" "Mr. David Thompson" "teacher@demo.learnai.study" "teacher123" "Subject: Mathematics | School: Lincoln High"
echo_user "$TEACHER" "2" "Ms. Jessica Walsh" "teacher2@demo.learnai.study" "teacher123" "Subject: English Literature | School: Lincoln High"
echo_user "$TEACHER" "3" "Dr. Marcus Johnson" "teacher3@demo.learnai.study" "teacher123" "Subject: Science | School: Central Elementary"
echo_user "$TEACHER" "4" "Ms. Anna Kowalski" "teacher4@demo.learnai.study" "teacher123" "Subject: History | School: Riverside Middle"
echo_user "$TEACHER" "5" "Mr. Kevin Park" "teacher5@demo.learnai.study" "teacher123" "Subject: Computer Science | School: Lincoln High"

# ============================================================================
# STUDENTS
# ============================================================================
echo_section "${STUDENT}🎓 STUDENTS (6 Accounts)${RESET}"

echo_user "$STUDENT" "1" "Alex Rodriguez" "student@demo.learnai.study" "student123" "Grade: 10 | School: Lincoln High"
echo_user "$STUDENT" "2" "Emma Wilson" "student2@demo.learnai.study" "student123" "Grade: 11 | School: Lincoln High"
echo_user "$STUDENT" "3" "Liam O'Brien" "student3@demo.learnai.study" "student123" "Grade: 7 | School: Central Elementary"
echo_user "$STUDENT" "4" "Sophia Martinez" "student4@demo.learnai.study" "student123" "Grade: 8 | School: Riverside Middle"
echo_user "$STUDENT" "5" "Noah Kim" "student5@demo.learnai.study" "student123" "Grade: 12 | School: Lincoln High (Senior)"
echo_user "$STUDENT" "6" "Olivia Taylor" "student6@demo.learnai.study" "student123" "Grade: 6 | School: Central Elementary"

# ============================================================================
# PARENTS
# ============================================================================
echo_section "${PARENT}👪 PARENTS (3 Accounts)${RESET}"

echo_user "$PARENT" "1" "Mr. Robert Wilson" "parent@demo.learnai.study" "parent123" "Children: 2 students (Alex, Emma)"
echo_user "$PARENT" "2" "Mrs. Maria Garcia" "parent2@demo.learnai.study" "parent123" "Children: 1 student (Sophia)"
echo_user "$PARENT" "3" "Mr. Steven Lee" "parent3@demo.learnai.study" "parent123" "Children: 2 students (Noah, Olivia)"

# ============================================================================
# ACCOUNTANTS
# ============================================================================
echo_section "${ACCOUNTANT}💰 ACCOUNTANTS (2 Accounts)${RESET}"

echo_user "$ACCOUNTANT" "1" "Ms. Rebecca Foster" "accountant@demo.learnai.study" "accountant123" "School: Lincoln High School"
echo_user "$ACCOUNTANT" "2" "Mr. Thomas Bennett" "accountant2@demo.learnai.study" "accountant123" "School: Central Elementary School"

# ============================================================================
# SUPERVISORS
# ============================================================================
echo_section "${SUPERVISOR}📊 SUPERVISORS (2 Accounts)${RESET}"

echo_user "$SUPERVISOR" "1" "Dr. Patricia Sullivan" "supervisor@demo.learnai.study" "supervisor123" "District: North District"
echo_user "$SUPERVISOR" "2" "Mr. Richard Johnson" "supervisor2@demo.learnai.study" "supervisor123" "District: South District"

# ============================================================================
# SUMMARY
# ============================================================================
cat <<'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                          TEST QUICK REFERENCE                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

📱 DASHBOARD URLS:
   • Admin:       /admin/dashboard
   • Principal:   /principal/dashboard
   • Teacher:     /teacher/dashboard
   • Student:     /student/dashboard
   • Parent:      /parent/dashboard
   • Accountant:  /accountant/dashboard
   • Supervisor:  /supervisor/dashboard

🧪 QUICK TEST FLOWS:

   1️⃣  Complete User Journey (3 min)
       Login as Admin → Check analytics → Logout
       Login as Student → Check progress → Test charts

   2️⃣  School Management (5 min)
       Login as Principal → Overview → Join Requests → Members

   3️⃣  Classroom Teaching (5 min)
       Login as Teacher → Student analytics → At-risk students

   4️⃣  Student Learning (3 min)
       Login as Student → Progress → Learning DNA → Quiz history

   5️⃣  Parent Monitoring (3 min)
       Login as Parent → Child progress → Fees → Notifications

   6️⃣  Finance Management (3 min)
       Login as Accountant → Revenue → Collections → Invoices

   7️⃣  District Oversight (3 min)
       Login as Supervisor → Multi-school analytics → Comparisons

📁 ADDITIONAL FILES:

   • doc/DASHBOARD_TESTING_GUIDE.md    - Comprehensive testing guide
   • doc/QUICK_TEST_REFERENCE.md       - Copy-paste ready credentials
   • doc/TEST_USERS.md                 - Full credentials table
   • TEST_USERS.json                   - Machine-readable format

💡 PRO TIPS:

   • Use Incognito window for faster logout/login cycles
   • Press F12 to open DevTools (check Console for errors)
   • Use DevTools → Device Toolbar (Shift+Ctrl+M) for mobile testing
   • All passwords follow pattern: [role]123 (except admin: admin123)

✨ TOTAL TEST ACCOUNTS: 22

   ✅ 1 Admin
   ✅ 3 Principals
   ✅ 5 Teachers
   ✅ 6 Students
   ✅ 3 Parents
   ✅ 2 Accountants
   ✅ 2 Supervisors

🚀 READY TO TEST!

   Start at: http://localhost:3000/auth/login

═══════════════════════════════════════════════════════════════════════════════

EOF

echo "📋 For more details, see:"
echo "   • doc/DASHBOARD_TESTING_GUIDE.md"
echo "   • doc/QUICK_TEST_REFERENCE.md"
echo "   • doc/TEST_USERS.md"
echo ""
