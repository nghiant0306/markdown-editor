# Start All Services - Markdown Editor + AI
# Run this once to start everything!

$ErrorActionPreference = "Continue"

# Add Ollama to PATH if not already there
$ollamaPath = "$env:USERPROFILE\AppData\Local\Programs\Ollama"
if ($env:Path -notlike "*Ollama*") {
    $env:Path = "$ollamaPath;$env:Path"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Markdown Editor - Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop any existing services first
Write-Host "[0/5] Cleaning up existing services..." -ForegroundColor Yellow
& "$PSScriptRoot\stop-all.ps1"
Write-Host ""

# 1. Check for Native Ollama
Write-Host "[1/5] Checking Native Ollama..." -ForegroundColor Yellow

try {
    $ollama = ollama --version 2>$null
    if ($ollama) {
        Write-Host "  [OK] Ollama found: $ollama" -ForegroundColor Green
    } else {
        throw "Ollama not found"
    }
} catch {
    Write-Host ""
    Write-Host "  [!] Ollama not installed!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Install Ollama:" -ForegroundColor Gray
    Write-Host "    https://ollama.ai" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# 2. Start Ollama service (if not running)
Write-Host "[2/5] Starting Ollama service..." -ForegroundColor Yellow

# First check if already running
$ollamaRunning = $false
try {
    $response = curl.exe -s http://localhost:11434/api/tags -ErrorAction SilentlyContinue
    if ($response) {
        $ollamaRunning = $true
        Write-Host "  [OK] Ollama already running" -ForegroundColor Green
    }
} catch {}

# If not running, start it
if (-not $ollamaRunning) {
    Write-Host "  Starting Ollama background service..." -ForegroundColor Gray
    
    # Set environment variable to keep model loaded in memory
    $env:OLLAMA_KEEP_ALIVE = "0" # 0 = infinite, keep model loaded until backend closes
    
    Start-Process -WindowStyle Hidden -FilePath "$ollamaPath\ollama.exe" -ArgumentList "serve" -ErrorAction SilentlyContinue
    
    # Wait for it to start
    Write-Host "  Waiting for Ollama to start (up to 30 seconds)..." -ForegroundColor Gray
    $maxRetries = 30
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries -and -not $ollamaRunning) {
        try {
            $response = curl.exe -s http://localhost:11434/api/tags -ErrorAction SilentlyContinue
            if ($response) {
                $ollamaRunning = $true
                Write-Host "  [OK] Ollama service started" -ForegroundColor Green
            }
        } catch {}
        
        if (-not $ollamaRunning) {
            $retryCount++
            Start-Sleep -Seconds 1
        }
    }
}

if (-not $ollamaRunning) {
    Write-Host ""
    Write-Host "  [!] Failed to start Ollama!" -ForegroundColor Yellow
    Write-Host "  Try manually:" -ForegroundColor Gray
    Write-Host "    ollama serve" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Verify models available
Write-Host "  Checking available models..." -ForegroundColor Cyan
$modelList = ollama list 2>$null

if ($modelList) {
    Write-Host "  Available models:" -ForegroundColor Green
    $modelList | Select-Object -Skip 1 | ForEach-Object {
        Write-Host "     $_" -ForegroundColor Gray
    }
    
    # Check if ANY model is available to use
    $hasModel = $false
    if ($modelList -match "qwen|deepseek|llama|mistral|neural|dolphin|codellama") {
        $hasModel = $true
        Write-Host "  [OK] Found suitable AI model - skipping download" -ForegroundColor Green
    }
    
    if (-not $hasModel) {
        Write-Host ""
        Write-Host "  [!] No suitable AI model found!" -ForegroundColor Yellow
        Write-Host "  Please download a model manually:" -ForegroundColor Gray
        Write-Host "    ollama pull qwen2.5-coder:7b" -ForegroundColor Gray
        Write-Host "  or any other model you prefer from: https://ollama.ai/library" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
} else {
    Write-Host "  [!] Could not check models" -ForegroundColor Yellow
    Write-Host "  Please ensure Ollama is running and has models installed" -ForegroundColor Gray
    exit 1
}

# 3. Start Backend
Write-Host "[3/5] Starting Backend Server..." -ForegroundColor Yellow
$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir

# Install deps if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies..." -ForegroundColor Gray
    cmd /c npm install
}

# Set environment variables for backend
$env:OLLAMA_BASE_URL = "http://localhost:11434"
$env:OLLAMA_KEEP_ALIVE = "0" # Keep model loaded indefinitely
# Note: Model is auto-detected from available models in Ollama
# No need to specify OLLAMA_MODEL or OLLAMA_EMBED_MODEL

# Start backend in background
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev"
Write-Host "  [OK] Backend running on http://localhost:3001" -ForegroundColor Green
Write-Host "  Using auto-detected models from Ollama" -ForegroundColor Cyan
Start-Sleep -Seconds 3

# 4. Start Frontend
Write-Host "[4/5] Starting Frontend..." -ForegroundColor Yellow
$frontendDir = $PSScriptRoot
Set-Location $frontendDir

# Install deps if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies..." -ForegroundColor Gray
    cmd /c npm install
}

# Start frontend
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c", "npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Browser will open in 5 seconds at:" -ForegroundColor White
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop all: run .\stop-all.ps1" -ForegroundColor Gray
Write-Host ""

Start-Sleep -Seconds 5
