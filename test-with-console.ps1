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

# Launch app with console visible (not as background process)
Write-Output "Launching app in visible mode - check the console window for errors..."
& 'C:\Users\tony\GitHub\Capacinator\dist-electron\win-unpacked\Capacinator.exe'
