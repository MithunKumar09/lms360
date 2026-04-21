# PowerShell Script to Run k6 Tests
# Usage: .\k6\run-tests.ps1 [test-name] [base-url]

param(
    [string]$TestName = "api-load-test",
    [string]$BaseUrl = "http://localhost:3000",
    [string]$TestUserEmail = "student@test.com",
    [string]$TestUserPassword = "testpassword123"
)

# Set environment variables for PowerShell
$env:K6_BASE_URL = $BaseUrl
$env:TEST_USER_EMAIL = $TestUserEmail
$env:TEST_USER_PASSWORD = $TestUserPassword

# Map test names to script files
$testScripts = @{
    "smoke" = "k6/scripts/smoke-test.js"
    "api" = "k6/scripts/api-load-test.js"
    "api-load-test" = "k6/scripts/api-load-test.js"
    "payment" = "k6/scripts/payment-flow-load.js"
    "payment-flow-load" = "k6/scripts/payment-flow-load.js"
    "dashboard" = "k6/scripts/dashboard-load.js"
    "dashboard-load" = "k6/scripts/dashboard-load.js"
}

# Get script path
if ($testScripts.ContainsKey($TestName)) {
    $scriptPath = $testScripts[$TestName]
} else {
    Write-Host "Unknown test: $TestName" -ForegroundColor Red
    Write-Host "Available tests: smoke, api, payment, dashboard" -ForegroundColor Yellow
    exit 1
}

# Check if k6 is installed
try {
    $k6Version = k6 version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "k6 not found"
    }
} catch {
    Write-Host "k6 is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install k6 first. See k6/INSTALL_WINDOWS.md for instructions." -ForegroundColor Yellow
    exit 1
}

# Display configuration
Write-Host "`n=== k6 Test Configuration ===" -ForegroundColor Cyan
Write-Host "Test: $TestName" -ForegroundColor White
Write-Host "Script: $scriptPath" -ForegroundColor White
Write-Host "Base URL: $BaseUrl" -ForegroundColor White
Write-Host "Test User: $TestUserEmail" -ForegroundColor White
Write-Host "==============================`n" -ForegroundColor Cyan

# Run k6 test
Write-Host "Starting k6 test..." -ForegroundColor Green
k6 run $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nTest completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nTest failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
