param(
    [string]$Database = 'xpertsedge_lms',
    [string]$DatabaseUser = 'xpertsedge',
    [string]$DatabaseHost = '127.0.0.1',
    [int]$Port = 5432,
    [string]$PgDump = 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe',
    [string]$Destination = (Join-Path (Split-Path -Parent $PSScriptRoot) 'backups')
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $PgDump -PathType Leaf)) { throw 'pg_dump was not found. Pass -PgDump with the installed PostgreSQL pg_dump.exe path.' }
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$target = Join-Path (Resolve-Path -LiteralPath $Destination).Path ('xpertsedge-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,6) + '.dump')
$secret = Read-Host 'PostgreSQL database user password' -AsSecureString
$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
    & $PgDump --host=$DatabaseHost --port=$Port --username=$DatabaseUser --dbname=$Database --format=custom --no-password --file=$target
    if ($LASTEXITCODE -ne 0) { throw 'Backup failed. The output file may be incomplete; review the error before using it.' }
    Write-Host "Backup created: $target"
    Write-Host 'This archive contains learner records and database-stored files. Keep it private and test restoration into a separate database.'
} finally {
    if ($null -eq $previousPassword) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue } else { $env:PGPASSWORD = $previousPassword }
    $secret = $null
}
