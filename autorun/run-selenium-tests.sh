#!/bin/bash

# LearnAI Selenium Test Suite Setup & Runner
# This script installs dependencies and runs the Selenium test suite

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        🧪 LearnAI Selenium Test Suite Setup & Runner          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"
echo ""

# Get browser choice
echo -e "${BLUE}Select browser for testing:${NC}"
echo "1. Chrome (default)"
echo "2. Firefox"
echo "3. Edge"
echo ""
read -p "Enter choice (1-3): " browser_choice

case $browser_choice in
    2)
        BROWSER="firefox"
        ;;
    3)
        BROWSER="edge"
        ;;
    *)
        BROWSER="chrome"
        ;;
esac

echo -e "${BLUE}Selected browser: ${BROWSER}${NC}"
echo ""

# Check if dev server is running
echo -e "${BLUE}⏳ Checking if dev server is running...${NC}"

if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Dev server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Dev server not detected at http://localhost:3000${NC}"
    echo "    Make sure to run: npm run dev"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}📦 Installing Selenium WebDriver...${NC}"

# Install selenium-webdriver if not present
if ! npm list selenium-webdriver &> /dev/null; then
    echo "Installing selenium-webdriver..."
    npm install --no-save selenium-webdriver
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""

# Create screenshots directory
mkdir -p test-screenshots
echo -e "${GREEN}✅ Screenshots directory created${NC}"
echo ""

# Run the tests
echo -e "${BLUE}🚀 Starting Selenium test suite...${NC}"
echo -e "${BLUE}Browser: ${BROWSER}${NC}"
echo -e "${BLUE}URL: http://localhost:3000${NC}"
echo ""

# Run with selected browser
BROWSER=$BROWSER node selenium-test-suite.js

echo ""
echo -e "${GREEN}✅ Test suite completed!${NC}"
echo ""
echo -e "${BLUE}📸 Screenshots and report:${NC}"
echo "   Location: ./test-screenshots/"
echo "   HTML Report: ./test-screenshots/test-report.html"
echo ""
