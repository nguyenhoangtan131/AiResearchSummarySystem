. (Join-Path $PSScriptRoot "common.ps1")

$dockerComposeFile = Join-Path $RepoRoot "docker-compose.yml"

$frontendRunning = Test-PortListening -Port 5173
$backendRunning = Test-PortListening -Port 8000
$postgresRunning = Test-PortListening -Port 5432
$redisRunning = Test-PortListening -Port 6379

Write-Host ("Frontend 5173: " + ($(if ($frontendRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Backend 8000 : " + ($(if ($backendRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Postgres 5432: " + ($(if ($postgresRunning) { "RUNNING" } else { "STOPPED" })))
Write-Host ("Redis 6379   : " + ($(if ($redisRunning) { "RUNNING" } else { "STOPPED" })))

try {
    & docker compose -f $dockerComposeFile ps
}
catch {
    Write-Warning "Khong doc duoc docker compose ps: $($_.Exception.Message)"
}
