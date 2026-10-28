param(
    [string]$JavaHome = $env:JAVA_HOME,
    [switch]$BootstrapAdmin,
    [switch]$UseJar,
    [string]$AdminEmail = 'xpertsedgetechlms@gmail.com'
)
$ErrorActionPreference = 'Stop'
if (-not $JavaHome -and (Test-Path -LiteralPath 'C:\Program Files\Java\jdk-24')) {
    $JavaHome = 'C:\Program Files\Java\jdk-24'
}
if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) {
    throw 'Set JAVA_HOME to an installed JDK 21 or newer, or pass -JavaHome.'
}
$env:JAVA_HOME = $JavaHome
if (-not $env:DB_PASSWORD) {
    $dbSecret = Read-Host 'PostgreSQL password for the xpertsedge database user' -AsSecureString
    $env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', $dbSecret).Password
}
if ($BootstrapAdmin) {
    while ($true) {
        $adminSecret = Read-Host 'Create ADMIN password (12+ characters; different from the database password)' -AsSecureString
        $adminPlain = [System.Net.NetworkCredential]::new('', $adminSecret).Password
        if ($adminPlain.Length -lt 12 -or [System.Text.Encoding]::UTF8.GetByteCount($adminPlain) -gt 72) {
            Write-Host 'Admin password must contain at least 12 characters and at most 72 UTF-8 bytes. Please enter a longer password.' -ForegroundColor Yellow
            $adminPlain = $null
            $adminSecret = $null
            continue
        }
        $adminConfirmation = Read-Host 'Confirm ADMIN password' -AsSecureString
        $confirmPlain = [System.Net.NetworkCredential]::new('', $adminConfirmation).Password
        if ($adminPlain -cne $confirmPlain) {
            Write-Host 'Passwords do not match. Try again.' -ForegroundColor Yellow
            $adminPlain = $null
            $confirmPlain = $null
            $adminSecret = $null
            $adminConfirmation = $null
            continue
        }
        break
    }
    $env:BOOTSTRAP_ADMIN_EMAIL = $AdminEmail
    $env:BOOTSTRAP_ADMIN_PASSWORD = $adminPlain
    $adminPlain = $null
    $confirmPlain = $null
    $adminSecret = $null
    $adminConfirmation = $null
}
$backendRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $backendRoot
try {
    if ($UseJar) {
        $jar = Join-Path $backendRoot 'target\lms-backend-0.0.1-SNAPSHOT.jar'
        $stamp = Join-Path $backendRoot 'target\local-build.ready'
        $sources = @(Get-ChildItem (Join-Path $backendRoot 'src\main') -Recurse -File)
        $sources += Get-Item (Join-Path $backendRoot 'pom.xml')
        $needsBuild = !(Test-Path -LiteralPath $jar) -or !(Test-Path -LiteralPath $stamp)
        if (!$needsBuild) {
            $builtAt = (Get-Item -LiteralPath $stamp).LastWriteTimeUtc
            $needsBuild = @($sources | Where-Object { $_.LastWriteTimeUtc -gt $builtAt }).Count -gt 0
        }
        if ($needsBuild) {
            & .\mvnw.cmd -DskipTests package
            if ($LASTEXITCODE -ne 0) { throw 'Backend build failed. See the error above.' }
            Set-Content -LiteralPath $stamp -Value 'Local backend build complete. No credentials stored.'
        }
        & (Join-Path $JavaHome 'bin\java.exe') -jar $jar '--spring.profiles.active=local'
    } else {
        & .\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
    }
    if ($LASTEXITCODE -ne 0) {
        throw 'Backend did not start successfully. Check the first Application run failed / Caused by message above.'
    }
} finally {
    Pop-Location
    if ($BootstrapAdmin) {
        Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL -ErrorAction SilentlyContinue
        Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    }
}
