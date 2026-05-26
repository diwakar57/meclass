# Student List Table Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DASHBOARD PAGES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Teacher Student List        │        Admin Student List         │
│  /dashboard/teacher/students │ /dashboard/admin/students         │
│  (StudentListPage Component) │ (StudentListPage Component)       │
│                              │                                    │
│  - Filters: 6 types          │  - Filters: 7 types (+ school)   │
│  - Search capability         │  - CSV export                     │
│  - Pagination (25/page)      │  - Bulk import button             │
│  - Sorting                   │  - Pagination (25/page)           │
│  - Row selection             │  - Sorting                        │
│                              │                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT TABLE COMPONENT                       │
│              (Reusable StudentTable Component)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────┐                    │
│  │ Bulk Actions Toolbar (when selected)    │                    │
│  │ ☐ Select All  [Assign] [Message] [CSV] │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NAME   │ ID   │ GRADE │ CLASS │ STATUS │ MASTERY │ ...  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ☐ John │ 1001 │ Class │ 5-A   │ Active │ 85% ▓▓▓▓  │ ▼  │  │
│  │ ☐ Jane │ 1002 │ Class │ 5-A   │ Active │ 92% ▓▓▓▓  │ ▼  │  │
│  │ ☐ Mike │ 1003 │ Class │ 5-B   │ Active │ 45% ▓     │ ▼  │  │
│  │ ☐ Sara │ 1004 │ Class │ 5-A   │ Inactv │ 78% ▓▓▓   │ ▼  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Showing 1-4 of 45 students  [◀ Previous] [Page 1 of 3] [Next ▶]│
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  GET /api/teacher/students?                                      │
│  - page=1&pageSize=25                                            │
│  - sortBy=name&sortOrder=asc                                     │
│  - search=john&gradeLevel=Class%205                              │
│  - className=5-A&section=A                                       │
│  - status=active&riskLevel=high                                  │
│                                                                   │
│              ↕                              ↕                    │
│                                                                   │
│  PUT /api/teacher/students/[id]     GET /api/admin/students     │
│  (Update student)                   (Admin view - all students)  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  USERS table              STUDENT_PROFILES table                 │
│  ├─ id                    ├─ user_id                             │
│  ├─ name                  ├─ grade_level                         │
│  ├─ email                 ├─ class_name                          │
│  ├─ phone                 ├─ section                             │
│  ├─ role (student)        ├─ enrollment_status                   │
│  ├─ school_id             ├─ overall_mastery                     │
│  └─ last_active           ├─ attendance_rate                     │
│                           ├─ recent_quiz_score                   │
│                           ├─ risk_level                          │
│                           └─ parent_id                           │
│                                                                   │
│  SCHOOLS table            PARENT_CONTACTS table                  │
│  ├─ id                    ├─ user_id                             │
│  ├─ name                  ├─ parent_id                           │
│  └─ address               └─ relationship                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action              Component State           API Call             DB Query            Response
─────────────           ─────────────────         ────────              ────────            ────────

Click Search ──────→ filters.search ──────→ GET /api/teacher/students
  "John"              = "John"               ?search=john
                                                      │
                                                      ▼
                                            SELECT * FROM users u
                                            WHERE u.role='student'
                                            AND (u.name ILIKE '%john%'
                                                 OR u.id ILIKE '%john%'
                                                 OR u.email ILIKE '%john%')
                                                      │
                                                      ▼
                                            ◀─────────────────────
                                            Returns: students[], totalCount
                                            │
Select Grade ──────── filters.gradeLevel ──→ ADDED to WHERE clause
  "Class 5"           = "Class 5"           ?gradeLevel=Class%205
                                                      │
                                                      ▼
                                            AND sp.grade_level='Class 5'

Click Sort ──────── sortBy="attendance" ──→ ORDER BY clause
  "Attendance"       sortOrder="desc"      ?sortBy=attendance
                                          &sortOrder=desc
                                                      │
                                                      ▼
                                            ORDER BY sp.attendance_rate DESC

Select Students ──── selectedStudents ────→ (Stored in component state)
                     = [student1, ...]     (Used for bulk actions)

Click "Export" ────────────────────────────→ generateCSV(selectedStudents)
                                                      │
                                                      ▼
                                            Download: students.csv


Pagination ──────── currentPage=2 ────────→ LIMIT 25 OFFSET 25
                   pageSize=25             ?page=2&pageSize=25
                                                      │
                                                      ▼
                                            Only return items 26-50
```

## Component Hierarchy

```
StudentListPage (Teacher/Admin)
├── DashboardLayout
│   └── Page Header & Title
├── Filter Section
│   ├── Search Input
│   ├── Grade Level Dropdown
│   ├── Class Dropdown (dynamic)
│   ├── Section Dropdown (dynamic)
│   ├── Status Dropdown
│   ├── Risk Level Dropdown
│   ├── School Dropdown (Admin only)
│   └── Clear Filters Button
├── StudentTable
│   ├── Bulk Actions Bar
│   │   ├── Selection Count
│   │   └── Action Buttons (Assign, Message, Export)
│   ├── Table
│   │   ├── Header Row
│   │   │   ├── Select All Checkbox
│   │   │   └── Column Headers (Name, ID, Grade, Class, etc.)
│   │   └── Body Rows
│   │       ├── Select Checkbox
│   │       ├── Name Cell (Text + Email)
│   │       ├── Progress Bars (Mastery, Attendance)
│   │       ├── Status Badges
│   │       └── Action Buttons + Dropdown Menu
│   └── Pagination Controls
│       ├── Previous Button
│       ├── Page Info
│       └── Next Button
└── Stats Footer
    ├── Total Students Card
    ├── Active Students Card
    ├── At-Risk Students Card
    └── Avg. Mastery Card
```

## Column Rendering Strategy

```
Column Type         Input Data              Output UI
───────────────    ────────────            ──────────

name               name, email            ┌─ John Doe
                                           └─ john@school.com

studentId          studentId              [STU001] ← Badge

grade              gradeLevel             Class 5

className          className, section     5-A (A)

school             schoolName             Main Campus

parent             parentName             Mrs. Jane Doe

enrollmentStatus   enrollmentStatus       Status Badge
                   (active, inactive...)  (Green Active)

overallMastery     overallMastery (0-100) Progress Bar
                                          [████████░░] 85%
                                          Green if 80%+

attendanceRate     attendanceRate (0-100) Progress Bar
                   attendanceRate (0-100) [██████████] 92%
                                          Green if 90%+

recentQuizScore    recentQuizScore        88%

riskLevel          riskLevel              Risk Badge
                   (low, medium, high)    (Red High)

lastActive         lastActivityAt         01/15/2024

feesStatus         feesStatus             Fee Badge
                   (paid, pending...)     (Green Paid)

actions            student object         ✓ Buttons + Dropdown
                   (passed to onRowAction) [View] [Progress] [...]
```

## Filter Application Logic

```
Step 1: Fetch all students from database
        ↓
Step 2: Apply Search Filter
        Keep only students where:
        - name CONTAINS "search"
        OR id CONTAINS "search"
        OR email CONTAINS "search"
        ↓
Step 3: Apply Status Filter
        Keep only students where:
        - enrollmentStatus === selectedStatus (if set)
        ↓
Step 4: Apply Grade Filter
        Keep only students where:
        - gradeLevel === selectedGrade (if set)
        ↓
Step 5: Apply Class Filter
        Keep only students where:
        - className === selectedClass (if set)
        ↓
Step 6: Apply Section Filter
        Keep only students where:
        - section === selectedSection (if set)
        ↓
Step 7: Apply Risk Level Filter
        Keep only students where:
        - riskLevel === selectedRisk (if set)
        ↓
Step 8: Apply School Filter (Admin only)
        Keep only students where:
        - schoolId === selectedSchool (if set)
        ↓
Total Results
```

## Sorting Implementation

```
sortBy Parameter     Sort Key              Comparison
────────────        ────────             ─────────

"name"              studentName           Alphabetical (A→Z)
"studentId"         studentId             Numerical
"grade"             gradeLevel            Custom order (Class 1→12)
"className"         className             Alphabetical
"enrollment"        enrollmentStatus      Custom order
"mastery"           overallMastery        Numerical (0-100)
"attendance"        attendanceRate        Numerical (0-100)
"score"             recentQuizScore       Numerical (0-100)
"risk"              riskLevel             Custom (high→medium→low)
"active"            lastActivityAt        Date (newest first)
```

## Pagination Formula

```
Page 1: OFFSET = (1-1) * 25 = 0        → Items 1-25
Page 2: OFFSET = (2-1) * 25 = 25       → Items 26-50
Page 3: OFFSET = (3-1) * 25 = 50       → Items 51-75
Page N: OFFSET = (N-1) * 25 = ...      → Items (N-1)*25+1 to N*25

Total Pages = CEIL(totalCount / pageSize)
            = CEIL(45 / 25) = 2 pages
```

## Error Handling Flow

```
Component Renders
    ↓
Try: Fetch data from API
    │
    ├─ Success ──→ setStudents(data) ──→ Render table
    │
    ├─ Network Error ──→ setError("Failed to fetch...") ──→ Show error message
    │
    ├─ 401 Unauthorized ──→ Redirect to login
    │
    ├─ 500 Server Error ──→ Show "Failed to get students"
    │
    └─ Empty Results ──→ Show "No students found"

Loading State: Show spinner while fetching ✓
Error State: Show error box with message ✓
Empty State: Show "No students found" message ✓
```

## Performance Optimization

```
Optimization Technique           Implementation
──────────────────────          ──────────────

Search Debounce                 setTimeout(300ms) before API call
                                Prevents excessive API calls while typing

useMemo for Dropdowns            uniqueClasses, uniqueSections
                                Only recalculate when students change

useCallback for Handlers         handleSelectRow, handleSort, etc.
                                Prevent unnecessary re-renders

Client-side Filtering            Applied after fetch (for UX)
                                Server-side filtering (for efficiency)

Pagination                       Only load 25 items per page
                                Reduce DOM elements and memory

Event Delegation                 Stop propagation on row selections
                                Prevent accidental action triggers
```

## State Management

```
StudentListPage State:
├── students: Student[]              ← Data from API
├── loading: boolean                 ← Fetch in progress
├── error: string | null             ← Error message
├── currentPage: number              ← Current page (1, 2, 3...)
├── totalCount: number               ← Total student count
├── sortBy: string                   ← Sort column
├── sortOrder: 'asc' | 'desc'       ← Sort direction
├── filters: FilterState             ← All filter values
│   ├── search: string
│   ├── gradeLevel?: string
│   ├── className?: string
│   ├── section?: string
│   ├── status?: string
│   └── riskLevel?: string
└── selectedStudents: Student[]      ← Multi-select state
```
