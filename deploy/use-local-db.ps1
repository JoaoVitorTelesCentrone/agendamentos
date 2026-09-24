$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root 'frontend/apps/web/.env.local'
$examplePath = Join-Path $root 'frontend/apps/web/.env.example'
$appPasswordPath = Join-Path $PSScriptRoot 'secrets/app_password'
$authSecretPath = Join-Path $PSScriptRoot 'secrets/auth_secret'
$cronSecretPath = Join-Path $PSScriptRoot 'secrets/cron_secret'

if (-not (Test-Path -LiteralPath $appPasswordPath)) {
  throw 'Run .\deploy\init-secrets.ps1 first.'
}

$appPassword = [System.IO.File]::ReadAllText($appPasswordPath).Trim()
$authSecret = [System.IO.File]::ReadAllText($authSecretPath).Trim()
$cronSecret = [System.IO.File]::ReadAllText($cronSecretPath).Trim()
$dbPort = if ($env:LOCAL_DB_PORT) { $env:LOCAL_DB_PORT } else { '55432' }
$dbUrl = "postgresql://vivio_app:$appPassword@localhost:$dbPort/vivio"
$settings = @{
  DATABASE_URL = $dbUrl
  AUTH_SECRET = $authSecret
  CRON_SECRET = $cronSecret
  APP_ENV = 'local'
  OTP_DEV_MODE = 'true'
}

$lines = if (Test-Path -LiteralPath $envPath) {
  [System.IO.File]::ReadAllLines($envPath)
} else {
  [System.IO.File]::ReadAllLines($examplePath)
}

foreach ($key in $settings.Keys) {
  $replacement = "$key=$($settings[$key])"
  $found = $false
  for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "^$key=") {
      $lines[$i] = $replacement
      $found = $true
    }
  }
  if (-not $found) { $lines += $replacement }
}

[System.IO.File]::WriteAllLines($envPath, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host 'frontend/apps/web/.env.local now points to the local Docker PostgreSQL.'
