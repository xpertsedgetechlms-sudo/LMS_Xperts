param([string]$PublicAppUrl='http://127.0.0.1:5173')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$names=@('RECOVERY_ENABLED','NOTIFICATIONS_EMAIL_ENABLED','PUBLIC_APP_URL','MAIL_FROM','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD')
$previous=@{}
foreach($name in $names){$previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
try {
    $client=New-Object System.Net.Sockets.TcpClient
    try {$task=$client.ConnectAsync('127.0.0.1',8080);$running=$task.Wait(700)-and $client.Connected} catch {$running=$false} finally {$client.Dispose()}
    if($running){throw 'An existing backend is using port 8080. Close its backend terminal first, then open this Gmail launcher. The frontend can stay open.'}
    $uri=[Uri]$PublicAppUrl
    $local=$uri.Scheme -eq 'http' -and $uri.Host -in @('localhost','127.0.0.1')
    if(!$uri.IsAbsoluteUri -or (!$local -and $uri.Scheme -ne 'https') -or $uri.Query -or $uri.Fragment -or $uri.UserInfo -or $uri.AbsolutePath -ne '/') {throw 'Use a frontend origin such as http://127.0.0.1:5173 or https://your-lms-domain.'}
    Write-Host 'Gmail sender: xpertsedgetechlms@gmail.com' -ForegroundColor Green
    Write-Host 'Enter a Google App Password, not your normal Google password. It is used only for this running backend and is not saved to disk.'
    $secret=Read-Host 'Google App Password (hidden)' -AsSecureString
    $plain=([System.Net.NetworkCredential]::new('', $secret).Password)-replace '\s',''
    if($plain -notmatch '^[a-zA-Z]{16}$'){throw 'Expected a 16-letter Google App Password. Generate one in the Google account App passwords page.'}
    $env:SMTP_PASSWORD=$plain
    $plain=$null;$secret=$null
    $env:MAIL_FROM='xpertsedgetechlms@gmail.com'
    $env:SMTP_USER='xpertsedgetechlms@gmail.com'
    $env:SMTP_HOST='smtp.gmail.com'
    $env:SMTP_PORT='587'
    $env:PUBLIC_APP_URL=$PublicAppUrl.TrimEnd('/')
    $env:RECOVERY_ENABLED='true'
    $env:NOTIFICATIONS_EMAIL_ENABLED='true'
    Write-Host 'Password reset and queued learning notifications will use Gmail. Keep this backend window open.'
    & (Join-Path $root 'backend\scripts\start-local.ps1') -UseJar
    if($LASTEXITCODE -ne 0){throw 'Backend stopped with an error. See the startup output above.'}
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    $plain=$null;$secret=$null
    foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
    Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
}
