# Automated Backup Script
# Run daily: .\backup-database.ps1
# Or add to Windows Task Scheduler

$env:PGPASSWORD = "kunal@123"
$pgDump = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$backupDir = "c:\Users\Vishal Sharma\Desktop\biswokarma\backups"
$dbName = "biswokarma"
$user = "postgres"

# Create backup folder if not exists
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Generate timestamp
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupFile = Join-Path $backupDir "biswokarma_backup_$timestamp.sql"

# Run backup
Write-Host "Starting backup of database '$dbName'..."
& $pgDump -U $user -d $dbName -f $backupFile 2>&1

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $backupFile).Length / 1MB
    Write-Host "Backup successful!" -ForegroundColor Green
    Write-Host "File: $backupFile"
    Write-Host "Size: $([math]::Round($size, 2)) MB"
} else {
    Write-Host "Backup FAILED!" -ForegroundColor Red
}
