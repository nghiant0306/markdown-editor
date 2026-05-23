# Stop All Services - Markdown Editor + AI
# Stops all running services (Backend, Frontend, Ollama)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Markdown Editor - Stopping All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill Ollama service/process
Write-Host "[1/3] Stopping Ollama..." -ForegroundColor Yellow
taskkill /F /IM ollama.exe 2>$null | Out-Null
Write-Host "  [OK] Ollama stopped" -ForegroundColor Green

# Kill Node.js processes
Write-Host "[2/3] Stopping Node.js processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null | Out-Null
Write-Host "  [OK] Node.js processes stopped" -ForegroundColor Green

# Kill processes on ports
Write-Host "[3/3] Clearing ports 3000, 3001, 11434..." -ForegroundColor Yellow
$ports = @(3000, 3001, 11434)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        $procId = $process.OwningProcess
        Write-Host "  Killing process on port $port (PID: $procId)" -ForegroundColor Gray
        taskkill /F /PID $procId 2>$null | Out-Null
    }
}

# Give ports time to release
Start-Sleep -Seconds 2
Write-Host "  [OK] All ports cleared" -ForegroundColor Green

Write-Host "[3/3] Cleanup complete" -ForegroundColor Green
Write-Host ""
Write-Host "All services stopped. Run ./start-all.ps1 to restart." -ForegroundColor Cyan
Write-Host ""
