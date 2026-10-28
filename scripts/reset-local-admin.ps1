param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$names=@('DB_PASSWORD','LOCAL_ADMIN_RESET_EMAIL','LOCAL_ADMIN_NEW_PASSWORD')
$previous=@{}
foreach($name in $names){$previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
try {
    $java='C:\Program Files\Java\jdk-24\bin\java.exe'
    if($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))){$java=Join-Path $env:JAVA_HOME 'bin\java.exe'}
    if(!(Test-Path -LiteralPath $java)){throw 'JDK 21 or newer is required.'}
    $jar=Join-Path $root 'backend\target\lms-backend-0.0.1-SNAPSHOT.jar'
    if(!(Test-Path -LiteralPath $jar)){throw 'Build the backend first; the local recovery helper uses its installed dependencies.'}
    $lib=Join-Path $root 'backend\target\admin-recovery\lib'
    New-Item -ItemType Directory -Force $lib | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive=[IO.Compression.ZipFile]::OpenRead($jar)
    try {foreach($entry in $archive.Entries){if($entry.FullName.StartsWith('BOOT-INF/lib/') -and $entry.Name.EndsWith('.jar')){[IO.Compression.ZipFileExtensions]::ExtractToFile($entry,(Join-Path $lib $entry.Name),$true)}}} finally {$archive.Dispose()}
    $env:LOCAL_ADMIN_RESET_EMAIL='xpertsedgetechlms@gmail.com'
    Write-Host 'Administrator: xpertsedgetechlms@gmail.com' -ForegroundColor Green
    if(!$CheckOnly){
        Write-Host 'This changes ONLY this local administrator password, revokes old sessions and records a local recovery event.'
        if((Read-Host 'Type RESET to continue') -cne 'RESET'){Write-Host 'Cancelled. No password changed.';exit 0}
    }
    if(!$env:DB_PASSWORD){$dbSecret=Read-Host 'PostgreSQL password for database user xpertsedge (hidden)' -AsSecureString;$env:DB_PASSWORD=[Net.NetworkCredential]::new('', $dbSecret).Password;$dbSecret=$null}
    if(!$CheckOnly){
        while($true){
            $secret=Read-Host 'NEW admin password (12+ characters; hidden)' -AsSecureString
            $plain=[Net.NetworkCredential]::new('', $secret).Password
            if($plain.Length -lt 12 -or [Text.Encoding]::UTF8.GetByteCount($plain) -gt 72){Write-Host 'Use at least 12 characters and at most 72 UTF-8 bytes.' -ForegroundColor Yellow;continue}
            $confirmation=Read-Host 'Confirm NEW admin password (hidden)' -AsSecureString
            $confirm=[Net.NetworkCredential]::new('', $confirmation).Password
            if($plain -cne $confirm){Write-Host 'Passwords do not match. Try again.' -ForegroundColor Yellow;continue}
            $env:LOCAL_ADMIN_NEW_PASSWORD=$plain
            $plain=$null;$confirm=$null;$secret=$null;$confirmation=$null
            break
        }
    }
    $mode=if($CheckOnly){'--check'}else{'--reset'}
    & $java --class-path (Join-Path $lib '*') (Join-Path $root 'backend\tools\AdminPasswordRecovery.java') $mode
    if($LASTEXITCODE -ne 0){throw 'Recovery did not complete. See the message above.'}
} catch {Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}
finally {$plain=$null;$confirm=$null;$secret=$null;$confirmation=$null;foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}}
