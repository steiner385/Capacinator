# Capacinator Installation Guide

## Overview

Capacinator is a standalone Windows application for project capacity planning. It runs completely offline with a local database and built-in web server.

## System Requirements

- **Windows**: Windows 10 or later (64-bit)
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 500MB for application + space for database
- **Display**: 1024x768 minimum resolution

## Installation Process

### 1. Download the Installer

Download `Capacinator-Setup-1.0.0.exe` from the releases page.

### 2. Run the Installer

1. Double-click the installer file
2. If Windows Defender SmartScreen appears, click "More info" then "Run anyway"
3. Follow the installation wizard:
   - Choose installation directory (default: `C:\Program Files\Capacinator`)
   - Select start menu folder
   - Choose whether to create desktop shortcut

### 3. First-Time Setup Wizard

When you first launch Capacinator, a setup wizard will guide you through configuration:

#### Welcome Screen
- Introduction to Capacinator
- Overview of setup process

#### Database Configuration
- **Database Location**: Choose where to store your data
  - Default: `%APPDATA%\Capacinator`
  - Custom: Any folder with write permissions
- **Database Name**: Default is `capacinator.db`
- **Backup Settings**:
  - Enable/disable automatic backups
  - Backup interval (daily, weekly, monthly)
  - Backup retention period (1-365 days)

#### Server Configuration
- **Port**: Internal server port (default: 3456)
  - Must be between 1024-65535
  - Avoid common ports (80, 443, 3000, 8080)
- **Host**: 
  - Localhost only (recommended for single-user)
  - All interfaces (for network access)
- **Security**:
  - Enable/disable authentication
  - Recommended for network installations

#### Advanced Settings (Optional)
- **Log Level**: Error, Warning, Info, Debug
- **Performance**:
  - Connection pool size
  - Enable caching
  - Response compression
- **Developer Options**:
  - Enable Developer Tools (F12)

#### Review & Install
- Review all settings before finalizing
- Settings are saved to `%APPDATA%\Capacinator\config.json`

## Post-Installation

### Starting Capacinator

1. **From Desktop**: Double-click the Capacinator icon
2. **From Start Menu**: Programs → Capacinator
3. **First Launch**: 
   - Server starts automatically
   - Browser window opens to the application
   - Profile selection dialog appears

### Default Locations

- **Application**: `C:\Program Files\Capacinator\`
- **User Data**: `%APPDATA%\Capacinator\`
- **Database**: `%APPDATA%\Capacinator\capacinator.db`
- **Backups**: `%APPDATA%\Capacinator\backups\`
- **Logs**: `%APPDATA%\Capacinator\logs\`
- **Configuration**: `%APPDATA%\Capacinator\config.json`

### Configuration Files

#### config.json
```json
{
  "database": {
    "location": "C:\\Users\\Username\\AppData\\Roaming\\Capacinator",
    "filename": "capacinator.db",
    "autoBackup": true,
    "backupInterval": "daily",
    "backupRetention": 30
  },
  "server": {
    "port": 3456,
    "host": "localhost",
    "requireAuth": true
  },
  "advanced": {
    "logLevel": "info",
    "maxConnections": 10,
    "enableCache": true,
    "compressResponses": true,
    "enableDevTools": false
  }
}
```

### Changing Settings After Installation

1. **From Application**: File → Settings
2. **Manual Edit**: Edit `config.json` (requires restart)
3. **Reset Settings**: Help → Reset Settings (shows setup wizard again)

## Troubleshooting

### Application Won't Start

1. **Check Port Availability**:
   ```cmd
   netstat -ano | findstr :3456
   ```
   If port is in use, change it in settings

2. **Check Windows Firewall**:
   - Allow Capacinator through firewall
   - Or run on localhost only

3. **Check Logs**:
   - Location: `%APPDATA%\Capacinator\logs\`
   - Look for error messages

### Database Issues

1. **Permission Errors**:
   - Ensure write permissions for database folder
   - Run as administrator if needed

2. **Corruption**:
   - Restore from automatic backup
   - File → Restore Database

3. **Location Change**:
   - Database location cannot be changed after setup
   - Export data → Reinstall → Import data

### Server Errors

1. **Port Already in Use**:
   - Change port in Settings → Server
   - Restart application

2. **Connection Refused**:
   - Check if server is running
   - Verify firewall settings
   - Check server logs

## Security Considerations

### Single User Installation
- Use localhost only
- Disable authentication if desired
- Keep automatic backups enabled

### Multi-User/Network Installation
- Enable authentication
- Use HTTPS if exposing to network
- Regular backups to network location
- Consider firewall rules

### Data Security
- Database is not encrypted by default
- Use Windows BitLocker for disk encryption
- Backup files inherit folder permissions
- No data is sent outside your computer

## Backup & Recovery

### Automatic Backups
- Configured during setup
- Run on schedule (daily/weekly/monthly)
- Stored in `backups` folder
- Automatic cleanup based on retention

### Manual Backup
1. File → Backup Database
2. Choose save location
3. Backup includes all data

### Restore Process
1. File → Restore Database
2. Select backup file
3. Application restarts
4. All data restored to backup point

## Uninstallation

### Standard Uninstall
1. Control Panel → Programs → Uninstall
2. Select Capacinator
3. Follow uninstall wizard

### Complete Removal
1. Uninstall via Control Panel
2. Delete `%APPDATA%\Capacinator` folder
3. Remove any custom database locations

### Data Preservation
- Backup database before uninstalling
- User data is NOT removed automatically
- Manual deletion required for complete removal

## Advanced Configuration

### Environment Variables
Set before launching for overrides:
```
SET CAPACINATOR_PORT=8080
SET CAPACINATOR_DB_PATH=D:\Data
SET CAPACINATOR_LOG_LEVEL=debug
```

### Command Line Options
```
Capacinator.exe --port 8080 --config custom.json
```

### Network Deployment
For IT administrators deploying to multiple machines:
1. Pre-configure `config.json`
2. Deploy to `%APPDATA%\Capacinator\`
3. Set `isFirstRun: false` to skip wizard
4. Use Group Policy for firewall rules

## Support

- **Documentation**: [GitHub Wiki](https://github.com/steiner385/Capacinator/wiki)
- **Issues**: [GitHub Issues](https://github.com/steiner385/Capacinator/issues)
- **Email**: support@capacinator.com

## License

Capacinator is licensed under the MIT License. See LICENSE file for details.