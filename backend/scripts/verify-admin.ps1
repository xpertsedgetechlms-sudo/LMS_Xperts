param([string]$BaseUrl = 'http://127.0.0.1:8080', [string]$Email = 'xpertsedgetechlms@gmail.com')
$ErrorActionPreference = 'Stop'
if ($BaseUrl -notmatch '^https://|^http://(localhost|127\.0\.0\.1)(:\d+)?$') { throw 'Use HTTPS or a local loopback server.' }
$browser = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$secret = Read-Host 'Administrator password (never paste it into chat)' -AsSecureString
try {
    $token = Invoke-RestMethod -Uri "$BaseUrl/api/auth/csrf" -WebSession $browser
    $body = @{ email = $Email; password = [System.Net.NetworkCredential]::new('', $secret).Password } | ConvertTo-Json
    $headers = @{}; $headers[$token.headerName] = $token.token
    $account = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -WebSession $browser -Headers $headers -ContentType 'application/json' -Body $body
    if ($account.role -ne 'ADMIN') { throw 'This account is not an administrator.' }
    $verified = Invoke-RestMethod -Uri "$BaseUrl/api/auth/me" -WebSession $browser
    $courses = Invoke-RestMethod -Uri "$BaseUrl/api/admin/courses" -WebSession $browser
    Write-Host "Admin login verified: $($verified.email). Accessible courses: $(@($courses).Count)."
    foreach ($path in @('/api/workspace/batches','/api/workspace/sessions','/api/workspace/attendance','/api/workspace/resources','/api/workspace/assignments','/api/workspace/submissions','/api/workspace/learning/lessons','/api/workspace/learning/quizzes','/api/workspace/learning/progress','/api/workspace/learning/certificates','/api/workspace/fees','/api/workspace/announcements','/api/workspace/reports','/api/public/settings','/api/workspace/profile','/api/admin/activity')) {
        Invoke-RestMethod -Uri "$BaseUrl$path" -WebSession $browser | Out-Null
        Write-Host "Verified: $path"
    }

} finally {
    $body = $null
    if ($browser.Cookies.Count -gt 0) {
        try {
            $token = Invoke-RestMethod -Uri "$BaseUrl/api/auth/csrf" -WebSession $browser
            $headers = @{}; $headers[$token.headerName] = $token.token
            Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/logout" -WebSession $browser -Headers $headers | Out-Null
        } catch { Write-Warning 'Verification session could not be signed out; it will expire automatically.' }
    }
}
