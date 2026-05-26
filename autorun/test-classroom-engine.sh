#!/bin/bash
# CLASSROOM ENGINE VERIFICATION TEST SUITE
# Tests the OpenMAIC classroom engine integration with school platform

set -e

BASE_URL="http://localhost:3000"
echo "🧪 Testing Classroom Engine Integration"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4
  local expected_status=$5

  echo -e "${BLUE}Test:${NC} $description"
  echo "  $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /tmp/response.json -w "%{http_code}" "$BASE_URL$endpoint")
  else
    status=$(curl -s -o /tmp/response.json -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" "$BASE_URL$endpoint")
  fi
  
  if [ "$status" = "$expected_status" ] || [ -z "$expected_status" ]; then
    echo -e "  ${GREEN}✓ Status: $status${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "  ${RED}✗ Expected $expected_status, got $status${NC}"
    cat /tmp/response.json | head -c 200
    echo ""
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
  echo ""
}

# ====================
# 1. Test Server Health
# ====================
echo -e "${YELLOW}=== 1. SERVER HEALTH CHECK ===${NC}"
test_endpoint "GET" "/" "Homepage loads" "" "200"
echo ""

# ====================
# 2. Test Auth Endpoints
# ====================
echo -e "${YELLOW}=== 2. AUTHENTICATION ENDPOINTS ===${NC}"
test_endpoint "GET" "/api/auth/me" "Get current user (should return 401)" "" "401"

# Try login (should fail without DB)
test_endpoint "POST" "/api/auth/login" "Login endpoint exists" \
  '{"email":"student@demo.learnai.study","password":"Demo@12345"}' "400"
echo ""

# ====================
# 3. Test Classroom Engine Endpoints
# ====================
echo -e "${YELLOW}=== 3. CLASSROOM ENGINE API ENDPOINTS ===${NC}"

# Check if classroom session generation endpoint exists
test_endpoint "POST" "/api/ai-classroom/sessions/generate" \
  "Classroom session generation endpoint" \
  '{"topicId":"test","difficulty":5}' "400"

# Check classroom sessions list endpoint
test_endpoint "GET" "/api/ai-classroom/sessions" \
  "Classroom sessions list endpoint" "" "401"

echo ""

# ====================
# 4. Test LearnAI Integration Endpoints
# ====================
echo -e "${YELLOW}=== 4. LEARNAI INTEGRATION ENDPOINTS ===${NC}"

test_endpoint "GET" "/api/learnai/dashboard" \
  "LearnAI dashboard endpoint" "" "401"

test_endpoint "POST" "/api/learnai/diagnostic/generate" \
  "LearnAI diagnostic generation endpoint" \
  '{"syllabus":"test"}' "400"

test_endpoint "POST" "/api/learnai/session" \
  "LearnAI session endpoint" \
  '{"studentId":"test","topicId":"test"}' "400"

echo ""

# ====================
# 5. Test Generation Endpoints
# ====================
echo -e "${YELLOW}=== 5. GENERATION/MEDIA ENDPOINTS ===${NC}"

test_endpoint "POST" "/api/generate/scene-outlines-stream" \
  "Scene outline generation (SSE)" \
  '{"topic":"test"}' "400"

test_endpoint "POST" "/api/generate/scene-content" \
  "Scene content generation" \
  '{"outline":"test"}' "400"

test_endpoint "POST" "/api/generate/tts" \
  "Text-to-speech generation" \
  '{"text":"hello"}' "400"

echo ""

# ====================
# 6. Test Configuration Files
# ====================
echo -e "${YELLOW}=== 6. CONFIGURATION & INTEGRATION FILES ===${NC}"

# Check if key configuration files exist
check_file() {
  local filepath=$1
  local description=$2
  
  if [ -f "$filepath" ]; then
    echo -e "  ${GREEN}✓${NC} $description"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $description (NOT FOUND: $filepath)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

check_file "/mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/lib/services/learnai-integration-service.ts" \
  "LearnAI Integration Service"

check_file "/mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/lib/types/ai-classroom.ts" \
  "AI Classroom Types"

check_file "/mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/lib/server/classroom-generation.ts" \
  "Classroom Generation Service"

check_file "/mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/lib/server/classroom-storage.ts" \
  "Classroom Storage Service"

check_file "/mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/app/api/ai-classroom/sessions/generate/route.ts" \
  "Classroom Session Generate Endpoint"

check_file "/mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/lib/db/schema.ts" \
  "Database Schema (with classroom tables)"

check_file "/mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/.env.local" \
  "Environment Configuration File"

echo ""

# ====================
# 7. Test Database Configuration
# ====================
echo -e "${YELLOW}=== 7. DATABASE CONFIGURATION CHECK ===${NC}"

if grep -q "DATABASE_URL" /mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/.env.local; then
  echo -e "  ${GREEN}✓${NC} DATABASE_URL is configured"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "  ${RED}✗${NC} DATABASE_URL not found in .env.local"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

if grep -q "LEARNAI\|OPENAI\|CLAUDE\|LLM" /mnt/c/Users/atulp/Desktop/ai_school/OpenMAIC/.env.local; then
  echo -e "  ${GREEN}✓${NC} LLM provider is configured"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "  ${YELLOW}⚠${NC} LLM provider not configured (optional for demo)"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ====================
# 8. SUMMARY
# ====================
echo -e "${YELLOW}=== TEST SUMMARY ===${NC}"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$((TESTS_PASSED * 100 / TOTAL))

echo -e "Pass Rate: ${GREEN}$PASS_RATE%${NC} ($TESTS_PASSED/$TOTAL)"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All critical systems operational!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review.${NC}"
  exit 1
fi
