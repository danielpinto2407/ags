param(
    [Parameter(Mandatory = $true)][ValidateSet('create', 'delete')][string]$Action,
    [ValidateSet('student', 'coach')][string]$Role = 'student'
)

$ErrorActionPreference = 'Stop'

$previousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$statusLines = & npx supabase status -o env 2>&1 | ForEach-Object { $_.ToString() }
$ErrorActionPreference = $previousPreference

$localConfig = @{}
foreach ($line in $statusLines) {
    if ($line -match '^(API_URL|SERVICE_ROLE_KEY)="(.*)"$') { $localConfig[$Matches[1]] = $Matches[2] }
}

$apiUrl = $localConfig['API_URL']
$serviceRoleKey = $localConfig['SERVICE_ROLE_KEY']
if ($apiUrl -notmatch '^http://(127\.0\.0\.1|localhost):54321$') {
    throw 'Safety stop: this script only runs against the local Supabase API.'
}
if (-not $serviceRoleKey) { throw 'Local Supabase admin key was not returned by the CLI.' }

$email = "dev-$Role@example.test"
$password = 'LocalDevOnly-2026!'
$profileRole = if ($Role -eq 'coach') { 'coach_admin' } else { 'user_personalized' }
$fullName = if ($Role -eq 'coach') { 'Coach Local Dev' } else { 'Alumna Local Dev' }
$adminHeaders = @{ apikey = $serviceRoleKey; Authorization = "Bearer $serviceRoleKey" }
$env:PGPASSWORD = 'postgres'

function Invoke-LocalSql([string]$Sql) {
    & psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -t -A -c $Sql
    if ($LASTEXITCODE -ne 0) { throw 'Local SQL command failed.' }
}

try {
    $existingId = (Invoke-LocalSql "select id from auth.users where email = '$email'" | Select-Object -First 1)

    if ($Action -eq 'delete') {
        if ($existingId) {
            Invoke-RestMethod -Method Delete -Uri "$apiUrl/auth/v1/admin/users/$existingId" -Headers $adminHeaders | Out-Null
        }
        Write-Output "Deleted local test user $email (if it existed)."
        return
    }

    if ($existingId) { throw "Local test user $email already exists; run with -Action delete first." }

    $created = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/admin/users" -Headers $adminHeaders -ContentType 'application/json' -Body (@{
        email = $email
        password = $password
        email_confirm = $true
    } | ConvertTo-Json)
    $userId = [string]$created.id
    if ($userId -notmatch '^[0-9a-fA-F-]{36}$') { throw 'Admin API did not return a valid user ID.' }

    Invoke-LocalSql "insert into public.profiles (id, tenant_id, role, status, full_name) values ('$userId', 'a0000000-0000-4000-8000-000000000001', '$profileRole', 'ACTIVE', '$fullName')" | Out-Null
    Write-Output "Created local-only $Role test user: $email (password: $password)"
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $serviceRoleKey = $null
}
