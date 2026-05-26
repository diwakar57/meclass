@echo off
REM LearnAI Selenium Test Suite Runner for Windows
REM This script installs dependencies and runs automated browser tests

setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║        🧪 LearnAI Selenium Test Suite - Windows Batch          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

REM Check if dev server is running
echo.
echo ⏳ Checking if dev server is running...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Dev server not detected at http://localhost:3000
    echo Make sure to run: npm run dev
    echo.
    set /p cont="Continue anyway? (y/n): "
    if /i not "!cont!"=="y" exit /b 1
)

echo ✅ Server check complete

REM Create screenshots directory
if not exist "test-screenshots" mkdir test-screenshots
echo ✅ Screenshots directory ready

REM Install Selenium if needed
echo.
echo 📦 Checking Selenium WebDriver...
npm list selenium-webdriver >nul 2>&1
if errorlevel 1 (
    echo Installing selenium-webdriver...
    npm install --no-save selenium-webdriver
) else (
    echo ✅ Selenium WebDriver found
)

REM Select browser
echo.
echo Select browser for testing:
echo 1. Chrome (default)
echo 2. Firefox
echo 3. Edge
echo.

set /p browser_choice="Enter choice (1-3): "

set BROWSER=chrome
if "!browser_choice!"=="2" set BROWSER=firefox
if "!browser_choice!"=="3" set BROWSER=edge

echo.
echo 🚀 Starting Selenium test suite...
echo Browser: !BROWSER!
echo URL: http://localhost:3000
echo.

REM Run the tests
set BROWSER=!BROWSER!
node selenium-test-suite.js

if !errorlevel! equ 0 (
    echo.
    echo ✅ Test suite completed successfully!
    echo.
    echo 📸 Results saved to: test-screenshots\
    echo 📄 HTML Report: test-screenshots\test-report.html
    echo.
    set /p open="Open report in browser? (y/n): "
    if /i "!open!"=="y" (
        start test-screenshots\test-report.html
    )
) else (
    echo.
    echo ❌ Test suite failed with error code !errorlevel!
)

pause
