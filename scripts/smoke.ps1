param([string]$Base = "http://localhost:3000")

$ErrorActionPreference = "Continue"
$results = @()

function Call($session, $method, $path, $body, $headers = $null) {
  $params = @{ Uri = "$Base$path"; Method = $method; WebSession = $session; UseBasicParsing = $true; TimeoutSec = 180 }
  if ($null -ne $headers) { $params.Headers = $headers }
  if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Depth 5); $params.ContentType = "application/json" }
  try {
    $r = Invoke-WebRequest @params
    $data = $null
    try { $data = $r.Content | ConvertFrom-Json } catch {}
    return @{ code = [int]$r.StatusCode; data = $data }
  } catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    return @{ code = $code; data = $null }
  }
}

function Login($email, $password) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $csrf = Invoke-RestMethod "$Base/api/auth/csrf" -WebSession $s
  $body = @{ csrfToken = $csrf.csrfToken; email = $email; password = $password; callbackUrl = "$Base/"; json = "true" }
  Call $s "POST" "/api/auth/callback/credentials" $body | Out-Null
  $sess = Invoke-RestMethod "$Base/api/auth/session" -WebSession $s
  return @{ session = $s; user = $sess.user }
}

function Check($name, $actual, $expected) {
  $script:results += [pscustomobject]@{ Uji = $name; Harusnya = $expected; Hasil = $actual; Lulus = ($actual -eq $expected) }
}

# tunggu server siap
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  try { $r = Invoke-WebRequest "$Base/login" -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch {}
  Start-Sleep -Seconds 2
}
if (-not $ready) { Write-Error "Server tidak siap di $Base"; exit 1 }

$anon = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Check "tanpa login: /api/chat" (Call $anon "GET" "/api/chat").code 401
Check "tanpa login: /api/admin/analytics" (Call $anon "GET" "/api/admin/analytics").code 401
Check "tanpa login: /api/collab/teams" (Call $anon "GET" "/api/collab/teams").code 401

$admin = Login "admin@ut.ac.id" "astoria123"
Check "login admin" $(if ($admin.user.role) { $admin.user.role } else { "gagal" }) "admin"
Check "admin: /api/admin/analytics" (Call $admin.session "GET" "/api/admin/analytics").code 200
Check "admin: keputusan tidak valid" (Call $admin.session "POST" "/api/admin/decision" @{ documentId = "x"; decision = "hapus" }).code 400

$student = Login "raka@ut.ac.id" "astoria123"
Check "login mahasiswa" $(if ($student.user.role) { $student.user.role } else { "gagal" }) "mahasiswa"
Check "mahasiswa: /api/admin/analytics" (Call $student.session "GET" "/api/admin/analytics").code 403
Check "mahasiswa: chat tanpa pertanyaan" (Call $student.session "POST" "/api/chat" @{ documentId = "x"; question = "" }).code 400

# pendaftaran akun baru (IP acak agar tidak menabrak batas 5/jam saat smoke diulang)
$email = "uji$([DateTimeOffset]::Now.ToUnixTimeSeconds())@contoh.id"
$testIp = "198.51.100.$((Get-Random -Minimum 2 -Maximum 250))"
$testHeaders = @{ "X-Forwarded-For" = $testIp }
Check "register akun baru" (Call $anon "POST" "/api/auth/register" @{ name = "Penguji Otomatis"; email = $email; password = "uji12345" } $testHeaders).code 200
Check "register email duplikat" (Call $anon "POST" "/api/auth/register" @{ name = "Penguji Otomatis"; email = $email; password = "uji12345" } $testHeaders).code 409
Check "register email tidak valid" (Call $anon "POST" "/api/auth/register" @{ name = "Penguji"; email = "bukan-email"; password = "uji12345" } $testHeaders).code 400

$newcomer = Login $email "uji12345"
Check "login akun baru" $(if ($newcomer.user.role) { $newcomer.user.role } else { "gagal" }) "mahasiswa"

# tim dibuat mahasiswa lain; akun baru bukan anggota
$team = Call $student.session "POST" "/api/collab/teams" @{ name = "Tim Uji $([DateTimeOffset]::Now.ToUnixTimeSeconds())" }
Check "mahasiswa: buat tim" $team.code 200
$teamId = $team.data.team.id
Check "proyek tanpa nama" (Call $student.session "POST" "/api/collab/projects" @{ teamId = $teamId; name = "" }).code 400

$proj = Call $student.session "POST" "/api/collab/projects" @{ teamId = $teamId; name = "Proyek Uji" }
Check "anggota: buat proyek" $proj.code 200

Check "non-anggota: buat proyek" (Call $newcomer.session "POST" "/api/collab/projects" @{ teamId = $teamId; name = "Proyek Ilegal" }).code 403
Check "non-anggota: baca proyek" (Call $newcomer.session "GET" "/api/collab/projects/$($proj.data.project.id)").code 403
Check "akun baru: daftar tim kosong" $(Call $newcomer.session "GET" "/api/collab/teams").data.teams.Count 0

$results | Format-Table -AutoSize | Out-String -Width 200
$failed = @($results | Where-Object { -not $_.Lulus }).Count
if ($failed -gt 0) { "GAGAL: $failed uji"; exit 1 } else { "SEMUA $($results.Count) UJI LULUS" }
