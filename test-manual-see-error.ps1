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

# Launch app - it will show error dialog
Write-Output "Launching app - an error dialog will appear showing the server startup error..."
Write-Output "Press Ctrl+C after you've seen the error dialog"
Start-Process 'C:\Users\tony\GitHub\Capacinator\dist-electron\win-unpacked\Capacinator.exe'

# Wait for user to see the dialog
Start-Sleep -Seconds 60

# Clean up
Write-Output "Cleaning up..."
Stop-Process -Name Capacinator -Force -ErrorAction SilentlyContinue
