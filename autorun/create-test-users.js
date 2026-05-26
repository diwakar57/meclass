#!/usr/bin/env node

/**
 * LearnAI Test User Creation Script
 * 
 * Creates demo user accounts for comprehensive dashboard testing
 * Includes all user roles with realistic test data
 */

import fs from 'fs';
import path from 'path';

// Test users data
const testUsers = [
  // ============= ADMINISTRATORS =============
  {
    id: 'admin-001',
    email: 'admin@learnai.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'saas_admin',
    description: 'Platform administrator'
  },

  // ============= PRINCIPALS/SCHOOL ADMINS =============
  {
    id: 'principal-001',
    email: 'principal@demo.learnai.study',
    password: 'principal123',
    name: 'Dr. Sarah Mitchell',
    role: 'principal',
    school: 'Lincoln High School',
    description: 'Principal of Lincoln High School'
  },
  {
    id: 'principal-002',
    email: 'principal2@demo.learnai.study',
    password: 'principal123',
    name: 'Mr. James Rodriguez',
    role: 'principal',
    school: 'Central Elementary School',
    description: 'Principal of Central Elementary School'
  },
  {
    id: 'principal-003',
    email: 'principal3@demo.learnai.study',
    password: 'principal123',
    name: 'Ms. Emily Chen',
    role: 'principal',
    school: 'Riverside Middle School',
    description: 'Principal of Riverside Middle School'
  },

  // ============= TEACHERS =============
  {
    id: 'teacher-001',
    email: 'teacher@demo.learnai.study',
    password: 'teacher123',
    name: 'Mr. David Thompson',
    role: 'teacher',
    school: 'Lincoln High School',
    subject: 'Mathematics',
    description: 'Math Teacher - Grade 10-12'
  },
  {
    id: 'teacher-002',
    email: 'teacher2@demo.learnai.study',
    password: 'teacher123',
    name: 'Ms. Jessica Walsh',
    role: 'teacher',
    school: 'Lincoln High School',
    subject: 'English Literature',
    description: 'English Teacher - Grade 9-11'
  },
  {
    id: 'teacher-003',
    email: 'teacher3@demo.learnai.study',
    password: 'teacher123',
    name: 'Dr. Marcus Johnson',
    role: 'teacher',
    school: 'Central Elementary School',
    subject: 'Science',
    description: 'Science Teacher - Grade 6-8'
  },
  {
    id: 'teacher-004',
    email: 'teacher4@demo.learnai.study',
    password: 'teacher123',
    name: 'Ms. Anna Kowalski',
    role: 'teacher',
    school: 'Riverside Middle School',
    subject: 'History',
    description: 'History Teacher - Grade 7-8'
  },
  {
    id: 'teacher-005',
    email: 'teacher5@demo.learnai.study',
    password: 'teacher123',
    name: 'Mr. Kevin Park',
    role: 'teacher',
    school: 'Lincoln High School',
    subject: 'Computer Science',
    description: 'CS Teacher - Grade 10-12'
  },

  // ============= STUDENTS =============
  {
    id: 'student-001',
    email: 'student@demo.learnai.study',
    password: 'student123',
    name: 'Alex Rodriguez',
    role: 'student',
    school: 'Lincoln High School',
    grade: '10',
    description: 'High School Student'
  },
  {
    id: 'student-002',
    email: 'student2@demo.learnai.study',
    password: 'student123',
    name: 'Emma Wilson',
    role: 'student',
    school: 'Lincoln High School',
    grade: '11',
    description: 'High School Student'
  },
  {
    id: 'student-003',
    email: 'student3@demo.learnai.study',
    password: 'student123',
    name: 'Liam O\'Brien',
    role: 'student',
    school: 'Central Elementary School',
    grade: '7',
    description: 'Middle School Student'
  },
  {
    id: 'student-004',
    email: 'student4@demo.learnai.study',
    password: 'student123',
    name: 'Sophia Martinez',
    role: 'student',
    school: 'Riverside Middle School',
    grade: '8',
    description: 'Middle School Student'
  },
  {
    id: 'student-005',
    email: 'student5@demo.learnai.study',
    password: 'student123',
    name: 'Noah Kim',
    role: 'student',
    school: 'Lincoln High School',
    grade: '12',
    description: 'High School Student (Senior)'
  },
  {
    id: 'student-006',
    email: 'student6@demo.learnai.study',
    password: 'student123',
    name: 'Olivia Taylor',
    role: 'student',
    school: 'Central Elementary School',
    grade: '6',
    description: 'Middle School Student'
  },

  // ============= PARENTS =============
  {
    id: 'parent-001',
    email: 'parent@demo.learnai.study',
    password: 'parent123',
    name: 'Mr. Robert Wilson',
    role: 'parent',
    children: ['student-001', 'student-002'],
    description: 'Parent of 2 students'
  },
  {
    id: 'parent-002',
    email: 'parent2@demo.learnai.study',
    password: 'parent123',
    name: 'Mrs. Maria Garcia',
    role: 'parent',
    children: ['student-004'],
    description: 'Parent of 1 student'
  },
  {
    id: 'parent-003',
    email: 'parent3@demo.learnai.study',
    password: 'parent123',
    name: 'Mr. Steven Lee',
    role: 'parent',
    children: ['student-005', 'student-006'],
    description: 'Parent of 2 students'
  },

  // ============= ACCOUNTANTS =============
  {
    id: 'accountant-001',
    email: 'accountant@demo.learnai.study',
    password: 'accountant123',
    name: 'Ms. Rebecca Foster',
    role: 'accountant',
    school: 'Lincoln High School',
    description: 'School Accountant'
  },
  {
    id: 'accountant-002',
    email: 'accountant2@demo.learnai.study',
    password: 'accountant123',
    name: 'Mr. Thomas Bennett',
    role: 'accountant',
    school: 'Central Elementary School',
    description: 'School Accountant'
  },

  // ============= SUPERVISORS =============
  {
    id: 'supervisor-001',
    email: 'supervisor@demo.learnai.study',
    password: 'supervisor123',
    name: 'Dr. Patricia Sullivan',
    role: 'supervisor',
    district: 'North District',
    description: 'District Supervisor'
  },
  {
    id: 'supervisor-002',
    email: 'supervisor2@demo.learnai.study',
    password: 'supervisor123',
    name: 'Mr. Richard Johnson',
    role: 'supervisor',
    district: 'South District',
    description: 'District Supervisor'
  },
];

/**
 * Generate a credentials reference card
 */
function generateCredentialsCard() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          LearnAI TEST USER CREDENTIALS REFERENCE              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const roleGroups = {};
  testUsers.forEach(user => {
    if (!roleGroups[user.role]) {
      roleGroups[user.role] = [];
    }
    roleGroups[user.role].push(user);
  });

  Object.entries(roleGroups).forEach(([role, users]) => {
    console.log(`\n📌 ${role.toUpperCase().replace(/_/g, ' ')} (${users.length})`);
    console.log('─'.repeat(68));
    
    users.forEach((user, idx) => {
      console.log(`\n  ${idx + 1}. ${user.name}`);
      console.log(`     Email:    ${user.email}`);
      console.log(`     Password: ${user.password}`);
      if (user.school) console.log(`     School:   ${user.school}`);
      if (user.subject) console.log(`     Subject:  ${user.subject}`);
      if (user.grade) console.log(`     Grade:    ${user.grade}`);
      if (user.district) console.log(`     District: ${user.district}`);
    });
  });

  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SCENARIOS                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('🔐 SCENARIO 1: Platform Admin Testing');
  console.log('   Login: admin@learnai.com / admin123');
  console.log('   Test: School counts, subscriptions, revenue metrics\n');

  console.log('🏫 SCENARIO 2: School Management');
  console.log('   Principals: principal@demo.learnai.study / principal123');
  console.log('              principal2@demo.learnai.study / principal123');
  console.log('              principal3@demo.learnai.study / principal123');
  console.log('   Test: Student/teacher counts, attendance, fee collection\n');

  console.log('👨‍🏫 SCENARIO 3: Classroom Teaching');
  console.log('   Teachers: teacher@demo.learnai.study / teacher123');
  console.log('            teacher2@demo.learnai.study / teacher123');
  console.log('            teacher3@demo.learnai.study / teacher123');
  console.log('            teacher4@demo.learnai.study / teacher123');
  console.log('            teacher5@demo.learnai.study / teacher123');
  console.log('   Test: Student progress, topic mastery, at-risk students\n');

  console.log('🎓 SCENARIO 4: Student Learning');
  console.log('   Students: student@demo.learnai.study / student123');
  console.log('            student2@demo.learnai.study / student123');
  console.log('            student3@demo.learnai.study / student123');
  console.log('            student4@demo.learnai.study / student123');
  console.log('            student5@demo.learnai.study / student123');
  console.log('            student6@demo.learnai.study / student123');
  console.log('   Test: Personal progress, quiz scores, learning DNA\n');

  console.log('👪 SCENARIO 5: Parent Monitoring');
  console.log('   Parents: parent@demo.learnai.study / parent123');
  console.log('           parent2@demo.learnai.study / parent123');
  console.log('           parent3@demo.learnai.study / parent123');
  console.log('   Test: Child progress, scores, attendance\n');

  console.log('💰 SCENARIO 6: Finance Management');
  console.log('   Accountants: accountant@demo.learnai.study / accountant123');
  console.log('               accountant2@demo.learnai.study / accountant123');
  console.log('   Test: Fee collection, revenue, overdue accounts\n');

  console.log('📊 SCENARIO 7: District Oversight');
  console.log('   Supervisors: supervisor@demo.learnai.study / supervisor123');
  console.log('               supervisor2@demo.learnai.study / supervisor123');
  console.log('   Test: School comparison, teacher performance, risk analysis\n');

  console.log('═'.repeat(68));
  console.log('\n✅ All test accounts are ready to use!');
  console.log('📍 Login URL: http://localhost:3000/auth/login\n\n');
}

/**
 * Generate a JSON file with all test users
 */
function exportToJSON() {
  const output = {
    generated: new Date().toISOString(),
    totalUsers: testUsers.length,
    users: testUsers,
    usageInstructions: {
      step1: 'Copy these credentials to your password manager',
      step2: 'Login at http://localhost:3000/auth/login',
      step3: 'Start testing dashboard features',
      note: 'All test accounts use the password format: [role]123 except admin uses admin123'
    }
  };

  const filePath = path.join(process.cwd(), 'TEST_USERS.json');
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Test users exported to: ${filePath}`);
  return filePath;
}

/**
 * Generate a markdown credentials file
 */
function exportToMarkdown() {
  let markdown = `# LearnAI Test User Accounts

Generated: ${new Date().toLocaleString()}

## Overview
Total test accounts created: ${testUsers.length}

## Login Information
**URL**: http://localhost:3000/auth/login

---

`;

  const roleGroups = {};
  testUsers.forEach(user => {
    if (!roleGroups[user.role]) {
      roleGroups[user.role] = [];
    }
    roleGroups[user.role].push(user);
  });

  Object.entries(roleGroups).forEach(([role, users]) => {
    markdown += `## ${role.toUpperCase().replace(/_/g, ' ')}\n\n`;
    markdown += `| # | Name | Email | Password | Details |\n`;
    markdown += `|---|------|-------|----------|----------|\n`;
    
    users.forEach((user, idx) => {
      const details = [];
      if (user.school) details.push(`School: ${user.school}`);
      if (user.subject) details.push(`Subject: ${user.subject}`);
      if (user.grade) details.push(`Grade: ${user.grade}`);
      if (user.district) details.push(`District: ${user.district}`);
      if (user.children) details.push(`Children: ${user.children.length}`);
      
      markdown += `| ${idx + 1} | ${user.name} | \`${user.email}\` | \`${user.password}\` | ${details.join(', ') || user.description} |\n`;
    });

    markdown += '\n';
  });

  markdown += `## Quick Test Scenarios\n\n`;
  markdown += `### Admin Dashboard\n`;
  markdown += `- Email: \`admin@learnai.com\`\n`;
  markdown += `- Password: \`admin123\`\n`;
  markdown += `- Test: Schools count, subscriptions, revenue\n\n`;

  markdown += `### Principal Dashboard\n`;
  markdown += `- Email: \`principal@demo.learnai.study\`\n`;
  markdown += `- Password: \`principal123\`\n`;
  markdown += `- Test: Students, teachers, fee collection\n\n`;

  markdown += `### Teacher Dashboard\n`;
  markdown += `- Email: \`teacher@demo.learnai.study\`\n`;
  markdown += `- Password: \`teacher123\`\n`;
  markdown += `- Test: Class analytics, student progress, at-risk students\n\n`;

  markdown += `### Student Dashboard\n`;
  markdown += `- Email: \`student@demo.learnai.study\`\n`;
  markdown += `- Password: \`student123\`\n`;
  markdown += `- Test: Personal progress, quizzes, learning profile\n\n`;

  markdown += `### Parent Dashboard\n`;
  markdown += `- Email: \`parent@demo.learnai.study\`\n`;
  markdown += `- Password: \`parent123\`\n`;
  markdown += `- Test: Child progress, scores, fees\n\n`;

  markdown += `### Accountant Dashboard\n`;
  markdown += `- Email: \`accountant@demo.learnai.study\`\n`;
  markdown += `- Password: \`accountant123\`\n`;
  markdown += `- Test: Revenue, fee collection, payments\n\n`;

  markdown += `### Supervisor Dashboard\n`;
  markdown += `- Email: \`supervisor@demo.learnai.study\`\n`;
  markdown += `- Password: \`supervisor123\`\n`;
  markdown += `- Test: Multi-school analytics, teacher performance\n`;

  const filePath = path.join(process.cwd(), 'doc', 'TEST_USERS.md');
  fs.writeFileSync(filePath, markdown);
  console.log(`✅ Test users exported to: ${filePath}`);
  return filePath;
}

/**
 * Main execution
 */
function main() {
  console.clear();
  console.log('\n🚀 LearnAI Test User Creation Script\n');

  // Generate credentials card
  generateCredentialsCard();

  // Export to files
  console.log('\n📁 Exporting test user data...\n');
  exportToJSON();
  exportToMarkdown();

  console.log('\n✅ Setup complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Open http://localhost:3000/auth/login');
  console.log('   2. Try any test account from the credentials above');
  console.log('   3. Explore the dashboard for that user role');
  console.log('   4. Check doc/TEST_USERS.md for all credentials\n');
}

main();
