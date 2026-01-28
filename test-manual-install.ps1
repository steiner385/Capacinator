# Clean up first
& npm run test:installer:cleanup

# Install
Write-Output "Installing..."
Start-Process -FilePath 'C:\Users\tony\GitHub\Capacinator\dist-electron\Capacinator Setup 1.0.0.exe' -ArgumentList '/S' -Wait

# Create config directory
New-Item -Path 'C:\Users\tony\AppData\Roaming\capacinator' -ItemType Directory -Force | Out-Null

# Write config file
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

# Launch app
Write-Output "Launching app..."
$app = Start-Process 'C:\Users\tony\AppData\Local\Programs\Capacinator\Capacinator.exe' -PassThru
Write-Output "App PID: $($app.Id)"
Start-Sleep -Seconds 5

# Check log
Write-Output "`nDebug log:"
$logPath = 'C:\Users\tony\AppData\Roaming\capacinator\startup-debug.log'
if (Test-Path $logPath) {
  Get-Content $logPath
} else {
  Write-Output "No log file found"
}

# Kill app
Write-Output "`nKilling app..."
Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
