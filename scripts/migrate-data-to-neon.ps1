# PowerShell Script: Migrate Data from Local PostgreSQL to Neon
# 
# This script uses pg_dump and psql to migrate data
# Requires PostgreSQL client tools to be installed
#
# Usage:
#   .\scripts\migrate-data-to-neon.ps1
#
# Prerequisites:
#   1. PostgreSQL client tools installed (pg_dump, psql)
#   2. Local PostgreSQL database accessible
#   3. Neon DATABASE_URL in .env.local

param(
    [switch]$SkipExisting = $false,
    [string]$DumpFile = "data_dump.sql"
)

# Load environment variables from .env.local
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    $envFile = ".env"
}

if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: .env.local or .env file not found" -ForegroundColor Red
    exit 1
}

# Read environment variables
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Get local database config
$localHost = $env:DB_HOST
$localPort = $env:DB_PORT
$localDb = $env:DB_NAME
$localUser = $env:DB_USER
$localPassword = $env:DB_PASSWORD

if (-not $localHost) { $localHost = "localhost" }
if (-not $localPort) { $localPort = "5432" }
if (-not $localDb) { $localDb = "edurock_db" }
if (-not $localUser) { $localUser = "postgres" }

if (-not $localPassword) {
    Write-Host "❌ Error: DB_PASSWORD not found in $envFile" -ForegroundColor Red
    exit 1
}

# Get Neon connection string
$neonUrl = $env:DATABASE_URL

if (-not $neonUrl) {
    Write-Host "❌ Error: DATABASE_URL not found in $envFile" -ForegroundColor Red
    Write-Host "Please add your Neon connection string to $envFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Starting data migration from local PostgreSQL to Neon..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Export data from local database
Write-Host "📤 Step 1: Exporting data from local database..." -ForegroundColor Yellow
Write-Host "   Database: $localDb on $localHost`:$localPort" -ForegroundColor Gray

$env:PGPASSWORD = $localPassword

try {
    # Export data only (no schema)
    $dumpArgs = @(
        "-h", $localHost,
        "-p", $localPort,
        "-U", $localUser,
        "-d", $localDb,
        "--data-only",
        "--no-owner",
        "--no-acl",
        "--verbose",
        "-f", $DumpFile
    )

    & pg_dump $dumpArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "✅ Data exported successfully to $DumpFile" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error exporting data: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# Step 2: Import data to Neon
Write-Host "📥 Step 2: Importing data to Neon..." -ForegroundColor Yellow

try {
    # Import to Neon
    $importArgs = @(
        $neonUrl,
        "-f", $DumpFile,
        "--verbose"
    )

    & psql $importArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "psql import failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "✅ Data imported successfully to Neon" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error importing data: $_" -ForegroundColor Red
    Write-Host "The dump file is saved at: $DumpFile" -ForegroundColor Yellow
    Write-Host "You can manually import it later using:" -ForegroundColor Yellow
    Write-Host "  psql `"$neonUrl`" -f $DumpFile" -ForegroundColor Gray
    exit 1
}

# Step 3: Cleanup (optional)
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
if (Test-Path $DumpFile) {
    $response = Read-Host "Delete dump file $DumpFile? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Remove-Item $DumpFile
        Write-Host "✅ Dump file deleted" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Dump file kept at: $DumpFile" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🎉 Migration completed successfully!" -ForegroundColor Green
Write-Host ""

