# Clean up first
& npm run test:installer:cleanup

# Create config
New-Item -Path 'C:\Users\tony\AppData\Roaming\capacinator' -ItemType Directory -Force | Out-Null

$config = @"
{
  "isFirstRun": false,
  "config": {
    "database": {
      "location": "C:\\Users\\tony\\AppData\\Roaming\\capacinator",
      "filename": "capacinator-test.db",
      "autoBackup": false,
      "backupInterval": "daily",
      "backupRetention": 7
    },
    "server": {
      "port": 3456,
      "host": "localhost",
      "requireAuth": false
    },
    "git": {
      "enabled": false
    },
    "advanced": {
      "logLevel": "debug",
      "enableDevTools": true,
      "maxConnections": 10,
      "enableCache": true,
      "compressResponses": true
    }
  }
}
"@

$config | Set-Content 'C:\Users\tony\AppData\Roaming\capacinator\capacinator-config.json'

# Launch unpacked app
Write-Output "Launching unpacked app..."
$app = Start-Process 'C:\Users\tony\GitHub\Capacinator\dist-electron\win-unpacked\Capacinator.exe' -PassThru
Write-Output "App PID: $($app.Id)"

# Wait longer and check health endpoint
Write-Output "`nWaiting 15 seconds for server to start..."
Start-Sleep -Seconds 15

# Try to connect to health endpoint
try {
  $response = Invoke-WebRequest -Uri "http://localhost:3456/api/health" -TimeoutSec 5
  Write-Output "`nServer is UP! Health check response:"
  Write-Output $response.Content
} catch {
  Write-Output "`nServer health check failed: $($_.Exception.Message)"
}

# Check process status
$proc = Get-Process -Id $app.Id -ErrorAction SilentlyContinue
if ($proc) {
  Write-Output "`nProcess is still running: $($proc.ProcessName)"
} else {
  Write-Output "`nProcess has exited"
}

# Check debug log
Write-Output "`nDebug log:"
$logPath = 'C:\Users\tony\AppData\Roaming\capacinator\startup-debug.log'
if (Test-Path $logPath) {
  Get-Content $logPath | Select-Object -Last 30
} else {
  Write-Output "No log file found"
}

# Kill app
Write-Output "`nKilling app..."
Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
