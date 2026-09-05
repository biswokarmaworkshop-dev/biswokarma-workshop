# Restore Database from Backup
# Usage: .\restore-database.ps1 -BackupFile "path\to\backup.sql"

param(
    [string]$BackupFile
)

if (-not $BackupFile) {
    $BackupFile = Read-Host "Enter backup file path"
}

if (-not (Test-Path $BackupFile)) {
    Write-Host "Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

$env:PGPASSWORD = "kunal@123"
$pgRestore = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$dbName = "biswokarma"
$user = "postgres"

Write-Host "Restoring database '$dbName' from: $BackupFile" -ForegroundColor Yellow
$confirm = Read-Host "This will OVERWRITE current data. Continue? (y/n)"

if ($confirm -ne "y") {
    Write-Host "Restore cancelled." -ForegroundColor Red
    exit 0
}

& $pgRestore -U $user -d $dbName -f $BackupFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restore successful!" -ForegroundColor Green
} else {
    Write-Host "Restore FAILED!" -ForegroundColor Red
}
