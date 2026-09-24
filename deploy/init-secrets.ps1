$ErrorActionPreference = 'Stop'
$secretsDir = Join-Path $PSScriptRoot 'secrets'
New-Item -ItemType Directory -Force -Path $secretsDir | Out-Null
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
  foreach ($name in @('pg_password', 'app_password', 'auth_secret', 'cron_secret')) {
    $path = Join-Path $secretsDir $name
    if (Test-Path -LiteralPath $path) { continue }
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    $value = [System.BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
    [System.IO.File]::WriteAllText($path, $value)
  }
} finally {
  $rng.Dispose()
}
$twilioPath = Join-Path $secretsDir 'twilio_auth_token'
if (-not (Test-Path -LiteralPath $twilioPath)) {
  [System.IO.File]::WriteAllText($twilioPath, '')
}
Write-Host 'Secrets ready in deploy/secrets (files are ignored by Git).'
