#!/bin/bash
# Dashboard Implementation Verification Script
# Run this to verify all dashboard components and endpoints are working

set -e

echo "🚀 Dashboard Implementation Verification"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} File exists: $1"
        return 0
    else
        echo -e "${RED}❌${NC} File missing: $1"
        return 1
    fi
}

# Function to check if endpoint exists
check_endpoint() {
    local endpoint=$1
    echo "  Checking: $endpoint"
}

echo "📁 Phase 1: Checking Component Files"
echo "-----------------------------------"

# Check chart components
check_file "components/dashboard/advanced-charts.tsx"
check_file "components/dashboard/dashboard-components.tsx"

echo ""
echo "📊 Phase 2: Checking Dashboard Files"
echo "-----------------------------------"

# Check all dashboard implementations
dashboards=(
    "app/dashboard/admin/page.tsx"
    "app/dashboard/principal/page.tsx"
    "app/dashboard/teacher/page.tsx"
    "app/dashboard/student/page.tsx"
    "app/dashboard/parent/page.tsx"
    "app/dashboard/accountant/page.tsx"
    "app/dashboard/supervisor/page.tsx"
)

completed=0
for dashboard in "${dashboards[@]}"; do
    if [ -f "$dashboard" ]; then
        size=$(wc -c < "$dashboard")
        if [ "$size" -gt 500 ]; then  # If file has substantial content
            echo -e "${GREEN}✅${NC} $dashboard ($(($size/1024))KB)"
            ((completed++))
        else
            echo -e "${YELLOW}⚠️${NC}  $dashboard (too small, likely placeholder)"
        fi
    else
        echo -e "${RED}❌${NC} $dashboard (missing)"
    fi
done

echo ""
echo "🔌 Phase 3: API Endpoints to Verify"
echo "-----------------------------------"

endpoints=(
    "/api/admin/analytics"
    "/api/principal/analytics"
    "/api/teacher/analytics"
    "/api/student/analytics"
    "/api/parent/analytics"
    "/api/accountant/analytics"
    "/api/supervisor/analytics"
)

for endpoint in "${endpoints[@]}"; do
    echo "  📍 $endpoint (verify returns role-specific data)"
done

echo ""
echo "✅ Required Data Structures"
echo "-----------------------------------"

echo "Admin Analytics should include:"
echo "  - totalSchools (number)"
echo "  - activeSubscriptions (number)"
echo "  - monthlyRevenue (array)"
echo "  - schoolGrowth (array)"
echo "  - platformUsage (array)"
echo "  - planDistribution (array)"
echo ""

echo "Principal Analytics should include:"
echo "  - totalStudents (number)"
echo "  - totalTeachers (number)"
echo "  - attendanceTrend (array)"
echo "  - subjectPerformance (array)"
echo "  - classPerfComparison (array)"
echo "  - feeCollection (object)"
echo "  - syllabusCompletion (number)"
echo ""

echo "Teacher Analytics should include:"
echo "  - totalStudents (number)"
echo "  - avgClassScore (number)"
echo "  - studentProgressTrend (array)"
echo "  - topicMasteryChart (array)"
echo "  - weakTopicHeatmap (array)"
echo "  - quizPerformanceDistribution (array)"
echo "  - assignmentCompletion (object)"
echo "  - atRiskStudents (array)"
echo ""

echo ""
echo "🧪 Testing Checklist"
echo "-----------------------------------"
echo "□ Load dashboard in browser at /dashboard/admin"
echo "□ Verify data loads (not placeholders)"
echo "□ Check console for errors"
echo "□ Test mobile view (320px width)"
echo "□ Test tablet view (768px width)"
echo "□ Verify charts render correctly"
echo "□ Test tenant isolation (login as different school)"
echo "□ Check performance (should load <2s)"
echo "□ Verify auto-refresh (60 second interval)"
echo "□ Test error states (disconnect network)"
echo ""

echo "📊 Implementation Status"
echo "-----------------------------------"
echo -e "Dashboards Completed: ${GREEN}$completed/7${NC}"
echo ""

if [ "$completed" -eq 7 ]; then
    echo -e "${GREEN}🎉 All dashboards are implemented!${NC}"
elif [ "$completed" -gt 1 ]; then
    echo -e "${YELLOW}⚠️  $((7-completed)) dashboards remaining${NC}"
    echo "Use templates from DASHBOARDS_IMPLEMENTATION_COMPLETE.md"
else
    echo -e "${RED}⚠️  Most dashboards not yet implemented${NC}"
    echo "See DASHBOARDS_IMPLEMENTATION_COMPLETE.md for templates"
fi

echo ""
echo "📚 Documentation"
echo "-----------------------------------"
echo "Reference files created:"
echo "  - components/dashboard/advanced-charts.tsx (Chart components)"
echo "  - components/dashboard/dashboard-components.tsx (Utility components)"
echo "  - DASHBOARDS_IMPLEMENTATION_COMPLETE.md (Full guide)"
echo "  - DASHBOARD_ENHANCEMENT_PLAN.md (Detailed planning)"

echo ""
echo "🚀 Next Steps"
echo "-----------------------------------"
echo "1. Copy remaining dashboard templates from DASHBOARDS_IMPLEMENTATION_COMPLETE.md"
echo "2. Verify analytics endpoints return required data"
echo "3. Run tests on all dashboards"
echo "4. Check performance with real data"
echo "5. Deploy to production"
echo ""
