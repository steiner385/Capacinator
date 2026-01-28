$app = Start-Process 'C:\Users\tony\AppData\Local\Programs\Capacinator\Capacinator.exe' -PassThru
Write-Output "App launched with PID: $($app.Id)"
Start-Sleep -Seconds 10

$logPath = 'C:\Users\tony\AppData\Roaming\capacinator\startup-debug.log'
if (Test-Path $logPath) {
  Write-Output "`nDebug log contents:"
  Get-Content $logPath
} else {
  Write-Output "`nNo debug log found at $logPath"
}

Write-Output "`nProcess status:"
$proc = Get-Process -Id $app.Id -ErrorAction SilentlyContinue
if ($proc) {
  Write-Output "Process running: $($proc.ProcessName), PID: $($proc.Id), Responding: $($proc.Responding)"
} else {
  Write-Output "Process has exited"
}

Write-Output "`nStopping process..."
Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
