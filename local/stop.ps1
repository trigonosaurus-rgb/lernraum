$ErrorActionPreference='Stop'
$projectPath=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$recordPath=Join-Path $projectPath 'data/server-control.json'
if (-not (Test-Path -LiteralPath $recordPath)) { Write-Output 'Lernraum is not running from this folder.'; exit 0 }
$record=Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
$uri=[uri]$record.origin
if ($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1') { throw 'Invalid local server address.' }
Invoke-RestMethod -Uri ($record.origin + '/api/shutdown') -Method Post -Headers @{'X-Lernraum-Control'=$record.controlToken} -TimeoutSec 5 | Out-Null
for ($attempt=0; $attempt -lt 30; $attempt++) {
    if (-not (Test-Path -LiteralPath $recordPath)) { Write-Output 'Lernraum stopped. Data is preserved.'; exit 0 }
    Start-Sleep -Milliseconds 100
}
throw 'Shutdown is still in progress. Try again in a few seconds.'
