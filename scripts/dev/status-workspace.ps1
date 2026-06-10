. (Join-Path $PSScriptRoot "common.ps1")

$dockerComposeFile = Join-Path $RepoRoot "docker-compose.yml"

$frontendRunning = Test-PortListening -Port 5175
$backendRunning = Test-PortListening -Port 8010
$postgresRunning = Test-PortListening -Port 55433
$redisRunning = Test-PortListening -Port 56380

Write-Host ("Frontend 5175 : " + ($(if ($frontendRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Backend 8010  : " + ($(if ($backendRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Postgres 55433: " + ($(if ($postgresRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Redis 56380   : " + ($(if ($redisRunning) { "RUNNING" } else { "STOPPED" })))

try {
    & docker compose -f $dockerComposeFile ps
}
catch {
    Write-Warning "Khong doc duoc docker compose ps: $($_.Exception.Message)"
}
