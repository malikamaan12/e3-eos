$ErrorActionPreference = 'Stop'
$eosWorkspace = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $eosWorkspace

# This entry point is exclusively for the repository's loopback development DB.
$env:NODE_ENV = 'development'
$env:ENVIRONMENT = 'local'
$env:EOS_ENABLE_LOCAL_SYNTHETIC_AUTH = 'false'
$env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
$env:APP_BASE_URL = 'http://localhost:3002'
$env:EMAIL_PROVIDER = 'durable_outbox'

$eosInvitationKeyPath = Join-Path $eosWorkspace '.local/invitation-delivery.key.dpapi'
if (Test-Path -LiteralPath $eosInvitationKeyPath) {
    $eosProtectedKey = Get-Content -LiteralPath $eosInvitationKeyPath | ConvertTo-SecureString
    $env:EOS_INVITATION_DELIVERY_KEY = [System.Net.NetworkCredential]::new('', $eosProtectedKey).Password
}

node apps/api/dist/main.js
exit $LASTEXITCODE
