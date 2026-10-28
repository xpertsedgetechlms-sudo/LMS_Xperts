param([ValidateSet('Start','Frontend','Backend')][string]$Mode = 'Start')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
function Get-LocalNpm {
    $paths = @("$env:ProgramFiles\nodejs\npm.cmd", "$env:APPDATA\npm\npm.cmd")
    $paths += @(Get-Command npm.cmd -All -ErrorAction SilentlyContinue | ForEach-Object Source)
    $npm = $paths | Where-Object { $_ -and $_ -notmatch 'codex-runtimes' -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
    if (!$npm) { throw 'Installed Node.js/npm not found. Install Node.js and reopen this launcher.' }
    return $npm
}
function Test-Http([string]$Url, [string]$Expected) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -Proxy $null
        return ($r.StatusCode -eq 200 -and $r.Content -match $Expected)
    } catch { return $false }
}
function Test-Port([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $task = $client.ConnectAsync('127.0.0.1', $Port); return ($task.Wait(700) -and $client.Connected) }
    catch { return $false } finally { $client.Dispose() }
}
try {
    if ($Mode -eq 'Frontend') {
        $Host.UI.RawUI.WindowTitle = 'XpertsEdge Frontend - keep open'
        $npm = Get-LocalNpm
        $env:Path = (Split-Path -Parent $npm) + ';' + $env:Path
        & $npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
        if ($LASTEXITCODE -ne 0) { throw 'Frontend stopped. See the error above.' }
        exit 0
    }
    if ($Mode -eq 'Backend') {
        $Host.UI.RawUI.WindowTitle = 'XpertsEdge Backend - keep open'
        $env:ALLOWED_ORIGINS = 'http://127.0.0.1:5173,http://localhost:5173,http://localhost:5174'
        try { & (Join-Path $root 'backend\scripts\start-local.ps1') -UseJar }
        finally { Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue }
        exit 0
    }
    Write-Host 'Starting XpertsEdge LMS...' -ForegroundColor Green
    $null = Get-LocalNpm
    if (!(Test-Path -LiteralPath 'node_modules\vite\bin\vite.js')) { throw 'Run npm.cmd install in the project folder first.' }
    if (!(Test-Port 5432)) { throw 'PostgreSQL is not running on port 5432. Start its Windows service, then retry.' }
    $front = Test-Http 'http://127.0.0.1:5173/' '(<html|<!doctype)'
    $back = Test-Http 'http://127.0.0.1:8080/api/health' 'xpertsedge-lms-backend'
    if (!$front -and (Test-Port 5173)) { throw 'Port 5173 is occupied but the website is not responding. Close the old frontend terminal and retry.' }
    if (!$back -and (Test-Port 8080)) { throw 'Port 8080 is occupied but the backend is not healthy. Close the old backend terminal and retry.' }
    $script = Join-Path $PSScriptRoot 'start-website.ps1'
    # Visible windows let the user enter the database password and stop each server.
    foreach ($server in @(@{Ready=$front; Mode='Frontend'}, @{Ready=$back; Mode='Backend'})) {
        if (!$server.Ready) {
            Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $script + '"'),'-Mode',$server.Mode) -WindowStyle Normal
        }
    }
    Write-Host 'Enter the PostgreSQL password in the Backend window when prompted.'
    Write-Host 'Keep the Frontend and Backend windows open while using the website.'
    $deadline = (Get-Date).AddMinutes(5)
    do {
        $front = Test-Http 'http://127.0.0.1:5173/' '(<html|<!doctype)'
        $back = Test-Http 'http://127.0.0.1:8080/api/health' 'xpertsedge-lms-backend'
        if ($front -and $back) {
            Start-Process 'http://127.0.0.1:5173/'
            Write-Host 'Website ready. Browser opened.' -ForegroundColor Green
            exit 0
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw 'Startup timed out. Read the error in the Frontend/Backend windows, correct it, then run the launcher again.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($Mode -ne 'Start') { Read-Host 'Press Enter to close' | Out-Null }
    exit 1
}
