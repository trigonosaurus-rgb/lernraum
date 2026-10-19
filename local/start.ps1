param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$appUrl = 'http://127.0.0.1:4177'
$nodeCommand = Get-Command node -ErrorAction Stop
$major = [int]((& $nodeCommand.Source --version).TrimStart('v').Split('.')[0])
if ($major -lt 24) { throw 'Lernraum requires Node.js 24 or newer.' }
Set-Location -LiteralPath $projectPath
try { $health = Invoke-RestMethod -Uri "$appUrl/api/health" -TimeoutSec 2 } catch { $health = $null }
if ($health -and $health.app -eq 'lernraum-local') {
    if (-not $NoBrowser) { Start-Process $appUrl }
    exit 0
}
if (-not (Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) { throw 'Dependencies missing. Run npm ci in the project folder first.' }
if (-not (Test-Path -LiteralPath 'dist-local/index.html')) {
    & $nodeCommand.Source 'node_modules/vite/bin/vite.js' build --config vite.local.config.ts
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
}
$dataPath = Join-Path $projectPath 'data'
New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
$serverPath = Join-Path $projectPath 'local/http.ts'
$serverProcess = Start-Process -FilePath $nodeCommand.Source -ArgumentList @('--experimental-strip-types', ('"' + $serverPath + '"')) -WorkingDirectory $projectPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $dataPath 'server.log') -RedirectStandardError (Join-Path $dataPath 'server-error.log')
for ($attempt=0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 250
    try { $health = Invoke-RestMethod -Uri "$appUrl/api/health" -TimeoutSec 1 } catch { $health = $null }
    if ($health -and $health.app -eq 'lernraum-local') { if (-not $NoBrowser) { Start-Process $appUrl }; exit 0 }
    if ($serverProcess.HasExited) { break }
}
throw "Lernraum did not start. See $dataPath/server-error.log"
