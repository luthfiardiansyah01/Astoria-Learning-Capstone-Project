# Membaca kunci Resend/Turnstile dari file lokal, lalu menulisnya ke Vercel
# Production. Tidak pernah mencetak nilai kunci.
#
# File yang dibutuhkan (satu baris, tanpa tanda kutip):
#   $env:TEMP\opencode\resend-api-key.txt
#   $env:TEMP\opencode\turnstile-site-key.txt
#   $env:TEMP\opencode\turnstile-secret-key.txt
#
# Pemakaian:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-email-verification.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/setup-email-verification.ps1 -Deploy

param(
  [string]$EmailFrom = "SOBAT ADI <no-reply@moedatrace.com>",
  [switch]$Deploy,
  [switch]$Cleanup
)

$ErrorActionPreference = "Continue"
$base = Join-Path $env:TEMP "opencode"
$files = @{
  RESEND_API_KEY                = Join-Path $base "resend-api-key.txt"
  NEXT_PUBLIC_TURNSTILE_SITE_KEY = Join-Path $base "turnstile-site-key.txt"
  TURNSTILE_SECRET_KEY          = Join-Path $base "turnstile-secret-key.txt"
}

foreach ($name in $files.Keys) {
  if (-not (Test-Path $files[$name])) {
    throw "File untuk $name tidak ditemukan: $($files[$name])"
  }
}

$values = @{}
foreach ($name in $files.Keys) {
  $value = (Get-Content -LiteralPath $files[$name] -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($value)) { throw "File $name kosong." }
  $values[$name] = $value
}

function Set-VercelEnv([string]$name, [string]$value, [switch]$Sensitive) {
  $cmdArgs = @("env", "add", $name, "production", "--value", $value, "--yes", "--force")
  if ($Sensitive) {
    $cmdArgs += @("--type", "secret", "--sensitive")
  } else {
    $cmdArgs += @("--type", "config")
  }
  & vercel @cmdArgs 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { throw "Gagal menulis $name ke Vercel." }
  Write-Host "OK  $name"
}

Set-VercelEnv "RESEND_API_KEY" $values["RESEND_API_KEY"] -Sensitive
Set-VercelEnv "NEXT_PUBLIC_TURNSTILE_SITE_KEY" $values["NEXT_PUBLIC_TURNSTILE_SITE_KEY"]
Set-VercelEnv "TURNSTILE_SECRET_KEY" $values["TURNSTILE_SECRET_KEY"] -Sensitive
Set-VercelEnv "EMAIL_FROM" $EmailFrom
Set-VercelEnv "EMAIL_VERIFICATION_ENABLED" "true"

if ($Cleanup) {
  foreach ($path in $files.Values) {
    Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  }
  Write-Host "File kunci lokal dihapus."
}

if ($Deploy) {
  Write-Host "Mendeploy production..."
  & vercel --prod --yes 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { throw "Deploy gagal." }
  Write-Host "Deploy selesai. Uji registrasi end-to-end."
} else {
  Write-Host "Env tersimpan. Jalankan `vercel --prod --yes` untuk menerapkan."
}
