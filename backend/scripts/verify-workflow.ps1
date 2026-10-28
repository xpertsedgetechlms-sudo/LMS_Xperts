param([string]$JavaHome = $env:JAVA_HOME)
$ErrorActionPreference = 'Stop'
if (-not $JavaHome -and (Test-Path -LiteralPath 'C:\Program Files\Java\jdk-24')) { $JavaHome = 'C:\Program Files\Java\jdk-24' }
if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) { throw 'Pass -JavaHome with a JDK 21 or newer.' }
$previousDbPassword = $env:DB_PASSWORD
$previousVerify = $env:LMS_POSTGRES_VERIFY
$previousSchema = $env:LMS_POSTGRES_TEST_SCHEMA
$env:JAVA_HOME = $JavaHome
$backendRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $backendRoot
try {
    if (-not $env:DB_PASSWORD) {
        $secret = Read-Host 'PostgreSQL password for the xpertsedge database user' -AsSecureString
        $env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
        $secret = $null
    }
    $env:LMS_POSTGRES_VERIFY = 'true'
    $env:LMS_POSTGRES_TEST_SCHEMA = 'lms_verify_' + [guid]::NewGuid().ToString('N').Substring(0,16)
    Write-Host 'Running the HTTP workflow against local PostgreSQL in a separate temporary schema. The existing backend can stay running.'
    & .\mvnw.cmd '-Dtest=WorkspaceWorkflowTests' test
    if ($LASTEXITCODE -ne 0) { throw 'Workflow verification failed. Review the first test failure above.' }
    Write-Host 'PostgreSQL workflow verified. Temporary test records were removed. This verifies HTTP APIs, not browser clicks.'
} finally {
    Pop-Location
    if ($null -eq $previousDbPassword) { Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue } else { $env:DB_PASSWORD = $previousDbPassword }
    if ($null -eq $previousVerify) { Remove-Item Env:LMS_POSTGRES_VERIFY -ErrorAction SilentlyContinue } else { $env:LMS_POSTGRES_VERIFY = $previousVerify }
    if ($null -eq $previousSchema) { Remove-Item Env:LMS_POSTGRES_TEST_SCHEMA -ErrorAction SilentlyContinue } else { $env:LMS_POSTGRES_TEST_SCHEMA = $previousSchema }
}
