. (Join-Path $PSScriptRoot "common.ps1")

$dockerComposeFile = Join-Path $RepoRoot "docker-compose.yml"

Stop-ManagedPortProcess -Port 5175 -Name "Frontend Vite"
Stop-ManagedPortProcess -Port 8010 -Name "Backend Uvicorn"

try {
    & docker compose -f $dockerComposeFile stop
    Write-Host "Docker services da duoc stop."
}
catch {
    Write-Warning "Khong stop duoc docker compose: $($_.Exception.Message)"
}
