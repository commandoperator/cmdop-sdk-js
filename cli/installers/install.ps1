# cmdok CLI Installer (Windows)
# Downloads and installs the cmdok command-line tool
#
# Usage:
#   iwr -useb cmdop.com/install-cli.ps1 | iex
#
# Or with custom installation directory:
#   $env:CMDOP_SDK_INSTALL_DIR="C:\Tools"; iwr -useb ... | iex

$ErrorActionPreference = "Stop"

$BINARY_NAME = "cmdok"
$GITHUB_REPO = "commandoperator/cmdop-sdk-js"
$BASE_URL = "https://github.com/$GITHUB_REPO/releases/latest/download"

# Default installation directory
$INSTALL_DIR = $env:CMDOP_SDK_INSTALL_DIR
if (-not $INSTALL_DIR) {
    $INSTALL_DIR = "$env:LOCALAPPDATA\cmdok\bin"
}

Write-Host ""
Write-Host "  cmdok installer" -ForegroundColor Cyan
Write-Host ""

# Detect Architecture
$arch = "x64"
if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $arch = "arm64"
}

Write-Host "  Platform: windows-$arch" -ForegroundColor Blue

# Construct Download URL
$binaryFile = "$BINARY_NAME-windows-$arch.exe"
$downloadUrl = "$BASE_URL/$binaryFile"

# ─────────────────────────────────────────────────────────────────────
# Download
# ─────────────────────────────────────────────────────────────────────

Write-Host "  Downloading..." -ForegroundColor Blue

$tempDir = Join-Path $env:TEMP "cmdok-install-$(Get-Random)"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
$tempBinary = Join-Path $tempDir "$BINARY_NAME.exe"

try {
    $ProgressPreference = 'Continue'

    if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
        Start-BitsTransfer -Source $downloadUrl -Destination $tempBinary -Description "Downloading cmdok..."
    } else {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempBinary -UseBasicParsing
    }

    $sizeMB = [math]::Round((Get-Item $tempBinary).Length / 1MB)
    Write-Host "  Downloaded ($sizeMB MB)" -ForegroundColor Green
} catch {
    Write-Host "  Failed to download cmdok" -ForegroundColor Red
    Write-Host ""

    if ($_.Exception.Message -match "504|timeout|connection") {
        Write-Host "  Network error. Check your internet connection and try again." -ForegroundColor Yellow
    } else {
        Write-Host "  Try downloading manually:" -ForegroundColor Yellow
        Write-Host "    Invoke-WebRequest -Uri $downloadUrl -OutFile cmdok.exe" -ForegroundColor White
        Write-Host "    Move-Item cmdok.exe $INSTALL_DIR\" -ForegroundColor White
    }

    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# ─────────────────────────────────────────────────────────────────────
# Install
# ─────────────────────────────────────────────────────────────────────

Write-Host "  Installing to: $INSTALL_DIR" -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null

$binaryPath = Join-Path $INSTALL_DIR "$BINARY_NAME.exe"
Move-Item -Path $tempBinary -Destination $binaryPath -Force

Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

# ─────────────────────────────────────────────────────────────────────
# PATH
# ─────────────────────────────────────────────────────────────────────

$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$needsPathUpdate = $currentPath -notlike "*$INSTALL_DIR*"

if ($needsPathUpdate) {
    try {
        $newPath = "$currentPath;$INSTALL_DIR"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        $env:Path = "$env:Path;$INSTALL_DIR"
        Write-Host "  Added $INSTALL_DIR to PATH" -ForegroundColor Green
    } catch {
        Write-Host "  Could not update PATH automatically" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Add manually:" -ForegroundColor Yellow
        Write-Host "    `$env:Path += `";$INSTALL_DIR`"" -ForegroundColor White
    }
}

Write-Host ""

# ─────────────────────────────────────────────────────────────────────
# Verify & Quick Start
# ─────────────────────────────────────────────────────────────────────

try {
    $version = & "$binaryPath" version 2>$null | Select-Object -First 1

    Write-Host "  cmdok $version installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Quick Start:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "    cmdok ssh" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "  cmdok was installed but could not verify" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Try running:" -ForegroundColor Yellow
    Write-Host "    cmdok version" -ForegroundColor White
    Write-Host ""
}

if ($needsPathUpdate) {
    Write-Host "  Tip: Restart your terminal for PATH changes to take effect" -ForegroundColor Cyan
    Write-Host ""
}
