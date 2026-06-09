. (Join-Path $PSScriptRoot "common.ps1")

$dockerComposeFile = Join-Path $RepoRoot "docker-compose.yml"

$frontendRunning = Test-PortListening -Port 5173
$backendRunning = Test-PortListening -Port 8000
$postgresRunning = Test-PortListening -Port 5433
$redisRunning = Test-PortListening -Port 6380

Write-Host ("Frontend 5173: " + ($(if ($frontendRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Backend 8000 : " + ($(if ($backendRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Postgres 5433: " + ($(if ($postgresRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Redis 6380   : " + ($(if ($redisRunning) { "RUNNING" } else { "STOPPED" })))

try {
    & docker compose -f $dockerComposeFile ps
}
catch {
    Write-Warning "Khong doc duoc docker compose ps: $($_.Exception.Message)"
}
