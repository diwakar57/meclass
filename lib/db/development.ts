// lib/db/development.ts - Development mode database adapter
// This module provides a mock database for development when PostgreSQL is unavailable

import bcryptjs from 'bcryptjs';

interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'saas_admin' | 'principal' | 'teacher' | 'student' | 'accountant' | 'supervisor' | 'parent';
  first_name: string;
  last_name: string;
  school_id?: string;
  is_active?: boolean;
  email_verified?: boolean;
  avatar_url?: string;
  created_at: Date;
}

interface School {
  id: string;
  name: string;
  slug: string;
  domain: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: Date;
}

function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, 10);
}

// Demo data
const DEMO_SCHOOL: School = {
  id: 'school-demo-001',
  name: 'LearnAI Demo Academy',
  slug: 'learnai-demo-academy',
  domain: 'demo.learnai.study',
  subscription_plan: 'professional',
  subscription_status: 'active',
  created_at: new Date('2026-01-15'),
};

const DEMO_USERS: User[] = [
  {
    id: 'user-admin-001',
    email: 'admin@learnai.com',
    password_hash: hashPassword('admin123'),
    role: 'saas_admin',
    first_name: 'Platform',
    last_name: 'Admin',
    created_at: new Date('2026-01-01'),
  },
  {
    id: 'user-principal-001',
    email: 'principal@demo.learnai.study',
    password_hash: hashPassword('principal123'),
    role: 'principal',
    first_name: 'Sarah',
    last_name: 'Johnson',
    school_id: DEMO_SCHOOL.id,
    created_at: new Date('2026-01-15'),
  },
  {
    id: 'user-teacher-001',
    email: 'teacher@demo.learnai.study',
    password_hash: hashPassword('teacher123'),
    role: 'teacher',
    first_name: 'Michael',
    last_name: 'Carter',
    school_id: DEMO_SCHOOL.id,
    created_at: new Date('2026-01-15'),
  },
  {
    id: 'user-student-001',
    email: 'student@demo.learnai.study',
    password_hash: hashPassword('student123'),
    role: 'student',
    first_name: 'Emma',
    last_name: 'Davis',
    school_id: DEMO_SCHOOL.id,
    created_at: new Date('2026-01-15'),
  },
  {
    id: 'user-student-002',
    email: 'dangolruman.6@gmail.com',
    password_hash: hashPassword('testingruman'),
    role: 'student',
    first_name: 'Ruman',
    last_name: 'Dangol',
    school_id: DEMO_SCHOOL.id,
    created_at: new Date('2026-01-15'),
  },
  {
    id: 'user-parent-001',
    email: 'parent@demo.learnai.study',
    password_hash: hashPassword('parent123'),
    role: 'parent',
    first_name: 'Robert',
    last_name: 'Wilson',
    school_id: DEMO_SCHOOL.id,
    created_at: new Date('2026-01-15'),
  },
];

// Development database mock
export const developmentDB = {
  users: [...DEMO_USERS],  // Use spread to avoid mutating constant
  schools: [DEMO_SCHOOL],
  
  findUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  
  findUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  },
  
  findSchoolById(id: string) {
    return this.schools.find(s => s.id === id);
  },

  findSchoolByCode(code: string) {
    // Handle invite codes like SCH-XXXXXXXX
    if (code.startsWith('SCH-')) {
      // Extract the code part
      const codePrefix = code.substring(4).toLowerCase();
      // Match against school ID prefixes
      return this.schools.find(s => 
        s.id.toLowerCase().includes(codePrefix) ||
        s.domain.toLowerCase().includes(codePrefix)
      );
    }
    // Try direct domain or ID match
    return this.schools.find(s => 
      s.id === code || 
      s.domain === code ||
      s.name === code
    );
  },

  createSchool(schoolData: Partial<School>): School {
    const newSchool: School = {
      id: schoolData.id || `school-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: schoolData.name || 'New School',
      slug: schoolData.slug || schoolData.name?.toLowerCase().replace(/\s+/g, '-') || 'new-school',
      domain: schoolData.domain || `${schoolData.slug || 'school'}.learnai.school`,
      subscription_plan: schoolData.subscription_plan || 'free',
      subscription_status: schoolData.subscription_status || 'active',
      created_at: new Date(),
    };
    this.schools.push(newSchool);
    return newSchool;
  },
  
  verifyPassword(email: string, password: string): User | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    
    const hash = hashPassword(password);
    return hash === user.password_hash ? user : null;
  },
};

// Mock query function for development
export async function developmentQuery<T = any>(
  sql: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const normalizedSql = sql.toLowerCase();

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 50));
  
  // Handle information_schema queries for column metadata
  if (sql.includes('information_schema.columns')) {
    if (sql.includes("table_name = 'schools'")) {
      const schoolColumns = [
        'id', 'name', 'slug', 'domain', 'status', 'city', 'state', 'country', 
        'website', 'description', 'subscription_plan', 'subscription_status', 'created_at'
      ];
      return { 
        rows: schoolColumns.map(col => ({ column_name: col })) as T[] 
      };
    }
    if (sql.includes("table_name = 'users'")) {
      const userColumns = [
        'id', 'email', 'password_hash', 'role', 'school_id', 'first_name', 'last_name',
        'is_active', 'email_verified', 'avatar_url', 'created_at'
      ];
      return { 
        rows: userColumns.map(col => ({ column_name: col })) as T[] 
      };
    }
  }

  // Handle INSERT queries for schools - more robust column parsing
  if (sql.includes('INSERT INTO schools')) {
    // Extract column names from SQL: INSERT INTO schools (col1, col2, ...) VALUES ...
    const columnMatch = sql.match(/INSERT INTO schools \(([^)]+)\)/i);
    const columnNames = columnMatch ? columnMatch[1].split(',').map(c => c.trim()) : [];
    
    const schoolData: any = {}; 
    columnNames.forEach((col, idx) => {
      schoolData[col] = params?.[idx];
    });
    
    const newSchool = developmentDB.createSchool({
      id: schoolData.id || `school-${Date.now()}`,
      name: schoolData.name,
      slug: schoolData.slug,
      domain: schoolData.domain || `${schoolData.slug || 'school'}.learnai.school`,
      subscription_plan: schoolData.subscription_plan || 'free',
      subscription_status: schoolData.subscription_status || 'active',
    });
    return { rows: [newSchool as T] };
  }

  // Handle INSERT queries (user creation in signup) - more robust column parsing  
  if (sql.includes('INSERT INTO users')) {
    const columnMatch = sql.match(/INSERT INTO users \(([^)]+)\)/i);
    const columnNames = columnMatch ? columnMatch[1].split(',').map(c => c.trim()) : [];
    
    const userData: any = {};
    columnNames.forEach((col, idx) => {
      userData[col] = params?.[idx];
    });
    
    const newUser: User = {
      id: userData.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: userData.email || '',
      password_hash: userData.password_hash || '',
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      role: (userData.role || 'student') as any,
      school_id: userData.school_id,
      is_active: userData.is_active !== false, // Default to true if not specified
      email_verified: userData.email_verified || false,
      avatar_url: userData.avatar_url,
      created_at: new Date(),
    };
    developmentDB.users.push(newUser);
    return { rows: [newUser as T] };
  }
  
  // Handle SELECT queries from users
  if (normalizedSql.includes('select') && normalizedSql.includes('from users')) {
    if (sql.includes('WHERE')) {
      const hasEmailFilter = /\bwhere\b[\s\S]*\bemail\b/.test(normalizedSql);
      const hasIdFilter = /\bwhere\b[\s\S]*\bid\b/.test(normalizedSql);

      if (hasEmailFilter) {
        const email = params?.[0];
        const user = developmentDB.findUserByEmail(email);
        return { rows: user ? [user as T] : [] };
      }
      if (hasIdFilter) {
        const id = params?.[0];
        const user = developmentDB.findUserById(id);
        // Check for AND is_active = true condition
        if (user && sql.includes('is_active')) {
          // In dev mode, all users are active
          return { rows: [user as T] };
        }
        return { rows: user ? [user as T] : [] };
      }
    }
    // Return all users if no WHERE clause
    return { rows: developmentDB.users as T[] };
  }

  // Handle SELECT queries from schools
  if (sql.includes('SELECT') && sql.includes('FROM schools')) {
    if (sql.includes('WHERE') && sql.includes('LOWER(domain)')) {
      const lookupValue = params?.[0];
      const school = developmentDB.schools.find(s => 
        s.domain?.toLowerCase() === lookupValue?.toLowerCase()
      );
      return { rows: school ? [school as T] : [] };
    }
    if (sql.includes('WHERE') && sql.includes('CAST(id') && sql.includes('LIKE')) {
      // Handle the LIKE query with prefix matching: WHERE LOWER(REPLACE(CAST(id AS TEXT), '-', '')) LIKE $1
      const pattern = params?.[0];
      const school = developmentDB.schools.find(s => {
        const normalized = s.id.replace(/-/g, '').toLowerCase();
        const searchPattern = String(pattern || '').replace(/%/g, '').toLowerCase();
        return normalized.startsWith(searchPattern);
      });
      return { rows: school ? [school as T] : [] };
    }
    if (sql.includes('WHERE') && sql.includes('CAST(id')) {
      const lookupValue = params?.[0];
      let school;
      if (typeof lookupValue === 'string') {
        school = developmentDB.schools.find(s => s.id === lookupValue);
        if (!school) {
          school = developmentDB.findSchoolByCode(lookupValue);
        }
      }
      return { rows: school ? [school as T] : [] };
    }
    if (sql.includes('WHERE id')) {
      const id = params?.[0];
      const school = developmentDB.findSchoolById(id);
      return { rows: school ? [school as T] : [] };
    }
    // Return all schools if no WHERE clause specific match
    return { rows: developmentDB.schools as T[] };
  }

  // Handle SELECT COUNT queries
  if (sql.includes('SELECT count(*)') || sql.includes('SELECT COUNT(*)')) {
    return { rows: [{ count: '0' } as T] };
  }
  
  return { rows: [] };
}

export default developmentDB;
