<#
  B3.3 · Reproducción automatizada del README en una copia limpia y aislada.

  Qué hace: copia a una carpeta nueva los archivos versionados y los no versionados que Git no ignora
  (nunca `.env`, `data/`, `node_modules/` ni el .docx/temporales de Excel que no están en el índice), y ejecuta
  en ella, en orden, los comandos del README, guardando comando, salida y código de salida reales.

  NO sustituye a TM-ENT-01: esa prueba la hace una persona distinta del autor, desde un clon del repositorio,
  leyendo el README sin esta ayuda. Esto es una comprobación previa del autor.

  Uso (desde la raíz del repositorio, en PowerShell):
    powershell -ExecutionPolicy Bypass -File docs/mvp/evidencias/B3.3/reproducir-clon-limpio.ps1 -Destino <carpeta-vacia-nueva> [-Puerto 3000]
  La carpeta destino debe estar FUERA del repositorio y no existir. No toca tu `.env` ni tus bases.
#>
param(
  [Parameter(Mandatory = $true)][string]$Destino,
  [int]$Puerto = 3000
)
$ErrorActionPreference = 'Stop'
$origen = (Get-Location).Path
if (Test-Path -LiteralPath $Destino) { throw "La carpeta destino ya existe: $Destino" }
if ($Destino.StartsWith($origen, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'El destino debe estar fuera del repositorio.' }

$log = New-Object System.Collections.Generic.List[string]
function Say([string]$t) { $log.Add($t); Write-Output $t }
$resultados = New-Object System.Collections.Generic.List[object]

function Step([string]$titulo, [string]$comando, [scriptblock]$accion, [int[]]$esperados = @(0)) {
  Say ''
  Say "### $titulo"
  Say "> $comando"
  $inicio = Get-Date
  $salida = & $accion 2>&1 | ForEach-Object { "$_" }
  $codigo = $LASTEXITCODE
  $seg = [math]::Round(((Get-Date) - $inicio).TotalSeconds, 1)
  foreach ($l in $salida) { Say $l }
  $ok = $esperados -contains $codigo
  Say "(código de salida: $codigo · $seg s · $(if ($ok) { 'ESPERADO' } else { 'INESPERADO' }))"
  $resultados.Add([pscustomobject]@{ Paso = $titulo; Codigo = $codigo; Ok = $ok })
}

Say "# Reproducción en copia limpia (automatizada por el autor; no es TM-ENT-01)"
Say "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
Say "Commit base: $(git rev-parse --short HEAD) (rama $(git branch --show-current)); la copia incluye los cambios aún sin commit de B3.3"

# --- Clon limpio: `git clone` local del último commit (sin .env, data ni node_modules) y, encima, SOLO los cambios
# todavía sin commit de B3.3 (README, docs, .env.example). Se ignoran el .docx, los temporales de Excel y
# cualquier cambio dentro de mvp-primer-bimestre/, que no pertenecen a este bloque.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
git clone --quiet --no-hardlinks $origen $Destino
if ($LASTEXITCODE -ne 0) { throw 'git clone falló' }
$superpuestos = 0
foreach ($linea in (git -c core.quotepath=off status --porcelain -uall)) {
  $ruta = $linea.Substring(3).Trim('"')
  if ($ruta -like 'mvp-primer-bimestre/*') { continue }
  $destinoArchivo = Join-Path $Destino $ruta
  if (Test-Path -LiteralPath $ruta) {
    New-Item -ItemType Directory -Force -Path (Split-Path $destinoArchivo) | Out-Null
    Copy-Item -LiteralPath $ruta -Destination $destinoArchivo -Force
    $superpuestos++
  } elseif (Test-Path -LiteralPath $destinoArchivo) { Remove-Item -LiteralPath $destinoArchivo -Force }
}
Say "Clon creado con git clone; cambios de B3.3 superpuestos: $superpuestos archivo(s)."
Say "¿Hay .env en la copia? $(Test-Path (Join-Path $Destino '.env')) · ¿hay data/? $(Test-Path (Join-Path $Destino 'data')) · ¿es un repositorio Git? $(Test-Path (Join-Path $Destino '.git'))"
Set-Location $Destino

Say ''
Say '## Versiones'
Say "node $(node -v) · npm $((& cmd.exe /c 'npm.cmd -v 2>&1') -join '') · .nvmrc $((Get-Content .nvmrc) -join '')"
Say "Sistema: $([System.Environment]::OSVersion.VersionString) · PowerShell $($PSVersionTable.PSVersion)"

# --- Pasos del README (PowerShell). npm.cmd evita el bloqueo de npm.ps1.
Step '1. Dependencias' 'npm ci' { cmd.exe /c 'npm.cmd ci 2>&1' }
Step '1b. SQLite y Argon2 (el aviso install-scripts de npm no debe impedirlo)' 'node scripts/check-sqlite-argon2.js' { cmd.exe /c 'node scripts/check-sqlite-argon2.js 2>&1' }
Say ''
Say '### 2. Configuración local'
Say "> if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }"
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
Say "(.env creado en la copia: $(Test-Path .env); es un duplicado de .env.example)"
Step '3. Migraciones' 'npm run db:migrate' { cmd.exe /c 'npm.cmd run db:migrate 2>&1' }
Step '3b. Migraciones repetidas (debe no cambiar nada)' 'npm run db:migrate' { cmd.exe /c 'npm.cmd run db:migrate 2>&1' }
Step '4. Datos de demostración' 'npm run seed:demo' { cmd.exe /c 'npm.cmd run seed:demo 2>&1' }
Step '4b. Siembra repetida (debe conservar todo)' 'npm run seed:demo' { cmd.exe /c 'npm.cmd run seed:demo 2>&1' }
Step '5. Pruebas' 'npm test' { cmd.exe /c 'npm.cmd test 2>&1' }
Step '5b. Lint' 'npm run lint' { cmd.exe /c 'npm.cmd run lint 2>&1' }

# --- Arranque (npm start) y sondeos HTTP
$estado = Join-Path $Destino 'arranque'
New-Item -ItemType Directory -Force -Path $estado | Out-Null
(Get-Content .env) -replace '^PORT=.*', "PORT=$Puerto" -replace '^APP_ORIGIN=.*', "APP_ORIGIN=http://localhost:$Puerto" | Set-Content .env
Say ''
Say "### 6. Arranque"
Say "> npm start   (puerto $Puerto$(if ($Puerto -ne 3000) { ', distinto del 3000 del README' } else { '' }))"
$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm.cmd start' -WorkingDirectory $Destino -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $estado 'stdout.txt') -RedirectStandardError (Join-Path $estado 'stderr.txt')
$base = "http://localhost:$Puerto"
$arriba = $false
for ($i = 0; $i -lt 40 -and -not $arriba; $i++) {
  Start-Sleep -Milliseconds 500
  try { $r = Invoke-WebRequest -UseBasicParsing -Uri "$base/salud" -TimeoutSec 2; $arriba = ($r.StatusCode -eq 200) } catch { }
}
Say "Servidor respondiendo en /salud: $arriba"
function Sondeo([string]$nombre, [scriptblock]$bloque) {
  try { $r = & $bloque; Say "$nombre -> $r" } catch { Say "$nombre -> ERROR: $($_.Exception.Message)" }
}
try {
  Sondeo 'GET /salud' { $r = Invoke-WebRequest -UseBasicParsing "$base/salud"; "$($r.StatusCode) $($r.Content.Trim())" }
  Sondeo 'GET /' { $r = Invoke-WebRequest -UseBasicParsing "$base/"; "$($r.StatusCode), $($r.Content.Length) bytes" }
  Sondeo 'GET /ofertas (visitante)' {
    $r = Invoke-WebRequest -UseBasicParsing "$base/ofertas"
    $ids = [regex]::Matches($r.Content, 'href="/ofertas/(\d+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    "$($r.StatusCode), ofertas distintas enlazadas: $($ids.Count), menciona 'Borrador': $($r.Content -match 'Borrador')"
  }
  Sondeo 'GET /ofertas/<id> sin número de WhatsApp' {
    $ids = [regex]::Matches((Invoke-WebRequest -UseBasicParsing "$base/ofertas").Content, 'href="/ofertas/(\d+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    $d = Invoke-WebRequest -UseBasicParsing "$base/ofertas/$($ids[0])"
    "$($d.StatusCode), 'Contacto por WhatsApp no disponible': $($d.Content -match 'Contacto por WhatsApp no disponible'), enlace wa.me presente: $($d.Content -match 'wa\.me')"
  }
  Sondeo 'GET /panel sin sesión' {
    Add-Type -AssemblyName System.Net.Http
    $h = New-Object System.Net.Http.HttpClientHandler; $h.AllowAutoRedirect = $false
    $c = New-Object System.Net.Http.HttpClient($h)
    $r = $c.GetAsync("$base/panel").Result
    "$([int]$r.StatusCode) -> $($r.Headers.Location)"
  }
  Sondeo 'GET /dev/bandeja sin clave' {
    try { Invoke-WebRequest -UseBasicParsing "$base/dev/bandeja" -ErrorAction Stop | Out-Null; 'respondió 200 (inesperado)' }
    catch { "$([int]$_.Exception.Response.StatusCode)" }
  }
  Sondeo 'GET /dev/bandeja con la clave ficticia de .env.example' {
    $clave = ((Get-Content .env.example | Where-Object { $_ -like 'DEMO_MAILBOX_PASSWORD=*' }) -split '=', 2)[1]
    $cab = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("demo:$clave")) }
    $r = Invoke-WebRequest -UseBasicParsing "$base/dev/bandeja" -Headers $cab
    "$($r.StatusCode)"
  }
  Say ''
  Say "### 6b. Handshake WebSocket sin cookie"
  Say "> node scripts/check-ws.js $base"
  $ws = cmd.exe /c "node scripts/check-ws.js $base 2>&1"
  $codigoWs = $LASTEXITCODE
  foreach ($l in $ws) { Say "$l" }
  Say "(código de salida: $codigoWs · esperado 1: sin cookie de sesión el servidor responde UNAUTHENTICATED)"
} finally {
  if ($proc -and -not $proc.HasExited) { cmd.exe /c "taskkill /PID $($proc.Id) /T /F" | Out-Null }
}
Say ''
Say '### Salida del servidor (npm start)'
Get-Content (Join-Path $estado 'stdout.txt') | ForEach-Object { Say $_ }
$err = Get-Content (Join-Path $estado 'stderr.txt') -ErrorAction SilentlyContinue
if ($err) { Say '(stderr)'; $err | ForEach-Object { Say $_ } }

Say ''
Say '## Resumen de pasos'
foreach ($r in $resultados) { Say ("{0,-55} código {1} {2}" -f $r.Paso, $r.Codigo, $(if ($r.Ok) { 'OK' } else { 'INESPERADO' })) }
Set-Location $origen
$log | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $origen 'docs/mvp/evidencias/B3.3/clon-limpio.txt')
Say 'Registro guardado en docs/mvp/evidencias/B3.3/clon-limpio.txt'
