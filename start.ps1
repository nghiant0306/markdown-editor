# Kill process on port 3000
$proc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($proc) {
    Write-Host "Killing process on port 3000 (PID: $proc)..." -ForegroundColor Yellow
    Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
} else {
    Write-Host "Port 3000 is free." -ForegroundColor Green
}

# Open Chrome after a delay (wait for dev server to start)
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 6
    $chrome = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
        "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($chrome) {
        & $chrome "http://localhost:3000"
    } else {
        Start-Process "http://localhost:3000"
    }
} | Out-Null

# Start dev server
Write-Host "Starting npm..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
npm start
