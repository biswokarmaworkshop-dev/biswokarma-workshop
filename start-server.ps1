# Auto-start Biswokarma Workshop Server
# Run at Windows startup via Task Scheduler

$workDir = "c:\Users\Vishal Sharma\Desktop\biswokarma"

# Kill any existing node process on port 3000
$existing = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($existing) {
    $existing | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

# Start the server
Set-Location $workDir
Start-Process node -ArgumentList "server.js" -WindowStyle Hidden
