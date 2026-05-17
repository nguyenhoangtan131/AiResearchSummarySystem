Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$LogsDir = Join-Path $RepoRoot ".logs"

function Ensure-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Get-ListeningProcessIdsByPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $pattern = "LISTENING\s+(\d+)$"
    $lines = netstat -ano -p tcp | Select-String -Pattern "[:\.]$Port\s+.*LISTENING\s+\d+$"
    $ids = @()

    foreach ($line in $lines) {
        if ($line.Line -match $pattern) {
            $ids += [int]$Matches[1]
        }
    }

    return $ids | Select-Object -Unique
}

function Test-PortListening {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $ids = @(Get-ListeningProcessIdsByPort -Port $Port)
    return $ids.Count -gt 0
}

function Wait-ForPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        if (Test-PortListening -Port $Port) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Ensure-DockerEngine {
    param(
        [switch]$DryRun
    )

    $dockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
    if (-not $dockerCommand) {
        Write-Warning "Khong tim thay docker.exe trong PATH."
        return $false
    }

    if ($DryRun) {
        Write-Host "[DryRun] Se kiem tra Docker engine va khoi dong neu can."
        return $true
    }

    try {
        & $dockerCommand.Source info *> $null
        return $true
    }
    catch {
        $candidates = @(
            "C:\Program Files\Docker\Docker\Docker Desktop.exe",
            "C:\Program Files\Docker\Docker\com.docker.backend.exe"
        )

        foreach ($candidate in $candidates) {
            if (Test-Path -LiteralPath $candidate) {
                Start-Process -FilePath $candidate -WindowStyle Hidden
                Start-Sleep -Seconds 8
                try {
                    & $dockerCommand.Source info *> $null
                    return $true
                }
                catch {
                    continue
                }
            }
        }
    }

    Write-Warning "Docker Desktop chua san sang. Hay mo Docker Desktop mot lan neu day la may moi."
    return $false
}

function Start-ManagedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$StdOutPath,
        [Parameter(Mandatory = $true)]
        [string]$StdErrPath,
        [switch]$DryRun
    )

    Ensure-Directory -Path (Split-Path -Parent $StdOutPath)

    if (Test-PortListening -Port $Port) {
        Write-Host "$Name da chay san tren cong $Port."
        return
    }

    if ($DryRun) {
        Write-Host "[DryRun] Se mo $Name tren cong $Port."
        Write-Host "[DryRun] Command: $FilePath $($ArgumentList -join ' ')"
        return
    }

    Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $StdOutPath `
        -RedirectStandardError $StdErrPath

    if (Wait-ForPort -Port $Port -TimeoutSeconds 30) {
        Write-Host "$Name da san sang tren cong $Port."
    }
    else {
        Write-Warning "$Name da duoc bat, nhung cong $Port chua san sang trong 30s. Kiem tra log tai $StdErrPath"
    }
}

function Stop-ManagedPortProcess {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [string]$Name = "Service"
    )

    $pids = Get-ListeningProcessIdsByPort -Port $Port
    if (-not $pids -or $pids.Count -eq 0) {
        Write-Host "$Name khong dang lang nghe cong $Port."
        return
    }

    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "Da dung $Name (PID $pid) o cong $Port."
        }
        catch {
            Write-Warning "Khong the dung $Name (PID $pid) o cong ${Port}: $($_.Exception.Message)"
        }
    }
}
