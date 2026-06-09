param(
    [switch]$DryRun
)

. (Join-Path $PSScriptRoot "common.ps1")

$dockerComposeFile = Join-Path $RepoRoot "docker-compose.yml"
$backendPython = Join-Path $RepoRoot "backend\env\Scripts\python.exe"
$backendDir = Join-Path $RepoRoot "backend"
$frontendDir = Join-Path $RepoRoot "frontend"
$frontendNpm = "C:\Program Files\nodejs\npm.cmd"
$backendStdOut = Join-Path $LogsDir "backend-dev.log"
$backendStdErr = Join-Path $LogsDir "backend-dev-error.log"
$frontendStdOut = Join-Path $LogsDir "frontend-dev.log"
$frontendStdErr = Join-Path $LogsDir "frontend-dev-error.log"

Ensure-Directory -Path $LogsDir

if (-not (Test-Path -LiteralPath $backendPython)) {
    throw "Khong tim thay Python backend tai $backendPython"
}

if (-not (Test-Path -LiteralPath $frontendNpm)) {
    throw "Khong tim thay npm.cmd tai $frontendNpm"
}

if (-not (Ensure-DockerEngine -DryRun:$DryRun)) {
    if (-not $DryRun) {
        throw "Docker engine chua san sang."
    }
}

if ($DryRun) {
    Write-Host "[DryRun] Se chay: docker compose up -d"
}
else {
    & docker compose -f $dockerComposeFile up -d
}

if (-not $DryRun) {
    [void](Wait-ForPort -Port 5433 -TimeoutSeconds 30)
    [void](Wait-ForPort -Port 6380 -TimeoutSeconds 30)

    Push-Location $backendDir
    try {
        & $backendPython -m alembic upgrade head
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "[DryRun] Se chay alembic upgrade head trong backend."
}

Start-ManagedProcess `
    -Name "Backend Uvicorn" `
    -Port 8000 `
    -FilePath $backendPython `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory $backendDir `
    -StdOutPath $backendStdOut `
    -StdErrPath $backendStdErr `
    -DryRun:$DryRun

Start-ManagedProcess `
    -Name "Frontend Vite" `
    -Port 5173 `
    -FilePath $frontendNpm `
    -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") `
    -WorkingDirectory $frontendDir `
    -StdOutPath $frontendStdOut `
    -StdErrPath $frontendStdErr `
    -DryRun:$DryRun

if (-not $DryRun) {
    Write-Host "Workspace dev stack da san sang."
    Write-Host "Frontend: http://127.0.0.1:5173"
    Write-Host "Backend:  http://127.0.0.1:8000"
}
