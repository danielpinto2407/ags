$ErrorActionPreference = 'Stop'

$previousErrorPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$statusLines = & npx supabase status -o env 2>&1 | ForEach-Object { $_.ToString() }
$ErrorActionPreference = $previousErrorPreference
$localConfig = @{}
foreach ($line in $statusLines) {
    if ("$line" -match '^(API_URL|PUBLISHABLE_KEY|SERVICE_ROLE_KEY)="(.*)"$') {
        $localConfig[$Matches[1]] = $Matches[2]
    }
}

$apiUrl = $localConfig['API_URL']
$publishableKey = $localConfig['PUBLISHABLE_KEY']
$serviceRoleKey = $localConfig['SERVICE_ROLE_KEY']
if ($apiUrl -notmatch '^http://(127\.0\.0\.1|localhost):54321$') {
    throw 'Safety stop: auth smoke test is allowed only against the local Supabase API.'
}
if (-not $publishableKey -or -not $serviceRoleKey) {
    throw 'Supabase local URL or keys were not returned by the CLI.'
}

$email = "cu01-$([guid]::NewGuid().ToString('N'))@example.test"
$signupEmail = "signup-$([guid]::NewGuid().ToString('N'))@example.test"
$password = [guid]::NewGuid().ToString('N') + 'Aa1!'
$userId = $null
$signupUserId = $null
$adminHeaders = @{ apikey = $serviceRoleKey; Authorization = "Bearer $serviceRoleKey" }
$oldPgPassword = $env:PGPASSWORD

try {
    $createdUser = Invoke-RestMethod `
        -Method Post `
        -Uri "$apiUrl/auth/v1/admin/users" `
        -Headers $adminHeaders `
        -ContentType 'application/json' `
        -Body (@{
            email = $email
            password = $password
            email_confirm = $true
            user_metadata = @{ full_name = 'CU01 Local Test' }
        } | ConvertTo-Json -Depth 5)

    $userId = [string]$createdUser.id
    if (-not $userId) { $userId = [string]$createdUser.user.id }
    if ($userId -notmatch '^[0-9a-fA-F-]{36}$') {
        throw 'Supabase Admin API did not return a valid user ID.'
    }

    $env:PGPASSWORD = 'postgres'
    $profileSql = "insert into public.profiles (id, tenant_id, role, status, full_name) values ('$userId', 'a0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'CU01 Local Test');"
    & psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -c $profileSql | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not provision the temporary local profile.' }
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

    $publicHeaders = @{ apikey = $publishableKey; Authorization = "Bearer $publishableKey" }
    $signupWasBlocked = $false
    try {
        $signupResponse = Invoke-RestMethod `
            -Method Post `
            -Uri "$apiUrl/auth/v1/signup" `
            -Headers $publicHeaders `
            -ContentType 'application/json' `
            -Body (@{ email = $signupEmail; password = $password } | ConvertTo-Json)
        $signupUserId = [string]$signupResponse.id
        if (-not $signupUserId) { $signupUserId = [string]$signupResponse.user.id }
    } catch {
        $signupStatusCode = 0
        try { $signupStatusCode = [int]$_.Exception.Response.StatusCode } catch { }
        $signupErrorBody = [string]$_.ErrorDetails.Message
        $signupErrorCode = ''
        if ($signupErrorBody -match '"error_code"\s*:\s*"([^"]+)"') { $signupErrorCode = $Matches[1] }
        if (($signupStatusCode -eq 400 -and $signupErrorBody -match '(?i)signups? not allowed') -or ($signupStatusCode -eq 422 -and $signupErrorCode -eq 'signup_disabled')) {
            $signupWasBlocked = $true
        } else {
            throw "Could not verify signup policy: local Auth returned status $signupStatusCode and code '$signupErrorCode'."
        }
    }
    if ($signupUserId) { throw 'Public self-signup unexpectedly created a user.' }
    if (-not $signupWasBlocked) { throw 'Public self-signup was not explicitly rejected by local Auth.' }

    $login = Invoke-RestMethod `
        -Method Post `
        -Uri "$apiUrl/auth/v1/token?grant_type=password" `
        -Headers $publicHeaders `
        -ContentType 'application/json' `
        -Body (@{ email = $email; password = $password } | ConvertTo-Json)

    $sessionHeaders = @{ apikey = $publishableKey; Authorization = "Bearer $($login.access_token)" }
    $verifiedUser = Invoke-RestMethod -Method Get -Uri "$apiUrl/auth/v1/user" -Headers $sessionHeaders
    $profileRows = @(
        Invoke-RestMethod `
            -Method Get `
            -Uri "$apiUrl/rest/v1/profiles?select=id,tenant_id,role,status,full_name&id=eq.$userId" `
            -Headers $sessionHeaders
    )

    if ($verifiedUser.id -ne $userId) { throw 'Supabase Auth did not verify the expected local user.' }
    if ($profileRows.Count -ne 1 -or $profileRows[0].role -ne 'user_personalized' -or $profileRows[0].tenant_id -ne 'a0000000-0000-4000-8000-000000000001') {
        throw 'RLS did not return the expected own-tenant profile.'
    }

    $refreshedSession = Invoke-RestMethod `
        -Method Post `
        -Uri "$apiUrl/auth/v1/token?grant_type=refresh_token" `
        -Headers $publicHeaders `
        -ContentType 'application/json' `
        -Body (@{ refresh_token = $login.refresh_token } | ConvertTo-Json)
    if ($refreshedSession.user.id -ne $userId -or -not $refreshedSession.access_token) {
        throw 'Refresh-token rotation did not return the expected local session.'
    }

    $refreshedHeaders = @{ apikey = $publishableKey; Authorization = "Bearer $($refreshedSession.access_token)" }
    Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/logout" -Headers $refreshedHeaders | Out-Null

    Write-Output 'PASS: signup denied, password sign-in, verified user, own-profile RLS, refresh-token rotation, and logout.'
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    if ($oldPgPassword) { $env:PGPASSWORD = $oldPgPassword }
    if ($userId) {
        try {
            Invoke-RestMethod -Method Delete -Uri "$apiUrl/auth/v1/admin/users/$userId" -Headers $adminHeaders | Out-Null
        } catch { Write-Warning 'Temporary Auth user cleanup may require checking local Supabase Auth users.' }
    }
    if ($signupUserId) {
        try {
            Invoke-RestMethod -Method Delete -Uri "$apiUrl/auth/v1/admin/users/$signupUserId" -Headers $adminHeaders | Out-Null
        } catch { Write-Warning 'Unexpected signup test user cleanup may require checking local Supabase Auth users.' }
    }
    $password = $null
    $signupEmail = $null
    $serviceRoleKey = $null
    $publishableKey = $null
    $login = $null
}
