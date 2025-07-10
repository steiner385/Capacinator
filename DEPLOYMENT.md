# Deployment Guide for dev.capacinator.com

This guide covers deploying Capacinator to dev.capacinator.com using nginx as a reverse proxy.

## Prerequisites

- Ubuntu/Debian server with root access
- Domain `dev.capacinator.com` pointing to your server
- Node.js 18+ installed
- nginx installed
- certbot installed (for SSL certificates)

## Quick Deployment

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd Capacinator
   ```

2. **Run the deployment script**:
   ```bash
   sudo ./deploy.sh
   ```

3. **Install SSL certificate** (if first time):
   ```bash
   sudo certbot --nginx -d dev.capacinator.com
   ```

4. **Run deployment script again** (after SSL):
   ```bash
   sudo ./deploy.sh
   ```

## Manual Deployment Steps

If you prefer manual deployment or need to troubleshoot:

### 1. System Dependencies

```bash
# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2 tsx

# Install nginx (if not installed)
sudo apt-get update
sudo apt-get install nginx

# Install certbot (if not installed)
sudo apt-get install certbot python3-certbot-nginx
```

### 2. Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/capacinator
sudo chown $USER:$USER /var/www/capacinator

# Copy application files
rsync -av --exclude=node_modules --exclude=.git ./ /var/www/capacinator/

# Install dependencies
cd /var/www/capacinator
npm install --production

# Build client
cd /var/www/capacinator/client
npm install
npm run build

# Set permissions
sudo chown -R www-data:www-data /var/www/capacinator
sudo chmod -R 755 /var/www/capacinator
```

### 3. Database Setup

```bash
# Create data directory
sudo mkdir -p /var/www/capacinator/data
sudo chown www-data:www-data /var/www/capacinator/data
sudo chmod 755 /var/www/capacinator/data
```

### 4. nginx Configuration

```bash
# Copy nginx config
sudo cp nginx/dev.capacinator.com.conf /etc/nginx/sites-available/

# Enable site
sudo ln -s /etc/nginx/sites-available/dev.capacinator.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Install SSL certificate
sudo certbot --nginx -d dev.capacinator.com

# Reload nginx
sudo systemctl reload nginx
```

### 5. Start Application

**Option A: Using PM2 (Recommended)**
```bash
cd /var/www/capacinator
sudo -u www-data pm2 start ecosystem.config.js
sudo -u www-data pm2 save
sudo pm2 startup
```

**Option B: Using systemd**
```bash
# Copy service file
sudo cp systemd/capacinator.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable capacinator
sudo systemctl start capacinator
```

## Verification

1. **Check application status**:
   ```bash
   # If using PM2
   pm2 status
   pm2 logs capacitor-dev

   # If using systemd
   sudo systemctl status capacinator
   sudo journalctl -u capacinator -f
   ```

2. **Test the website**:
   ```bash
   # Run health check
   ./scripts/health-check.sh

   # Manual tests
   curl https://dev.capacinator.com
   curl https://dev.capacinator.com/api/health
   ```

3. **Check nginx**:
   ```bash
   sudo systemctl status nginx
   sudo tail -f /var/log/nginx/capacinator_access.log
   ```

## File Structure

```
/var/www/capacinator/
├── src/                    # Node.js source code
├── client/dist/           # Built React application
├── data/                  # SQLite database
├── ecosystem.config.js    # PM2 configuration
├── .env.production       # Production environment variables
└── node_modules/         # Node.js dependencies

/etc/nginx/sites-available/
└── dev.capacinator.com   # nginx configuration

/var/log/
├── capacinator/          # Application logs
└── nginx/               # nginx logs
```

## Configuration Files

- **nginx**: `/etc/nginx/sites-available/dev.capacinator.com`
- **PM2**: `ecosystem.config.js`
- **Environment**: `.env.production`
- **SSL**: `/etc/letsencrypt/live/dev.capacinator.com/`

## Maintenance

### Updates

```bash
# Pull latest code
cd /home/tony/GitHub/ProjectCapacitizer
git pull

# Redeploy
sudo ./deploy.sh
```

### Logs

```bash
# Application logs
pm2 logs capacitor-dev

# nginx logs
sudo tail -f /var/log/nginx/capacinator_access.log
sudo tail -f /var/log/nginx/capacinator_error.log

# System logs (if using systemd)
sudo journalctl -u capacinator -f
```

### Backup

```bash
# Backup database
sudo cp /var/www/capacinator/data/capacinator.db /backup/capacinator-$(date +%Y%m%d).db

# Backup configuration
sudo tar -czf /backup/capacinator-config-$(date +%Y%m%d).tar.gz \
  /etc/nginx/sites-available/dev.capacinator.com \
  /var/www/capacinator/ecosystem.config.js \
  /var/www/capacinator/.env.production
```

### SSL Certificate Renewal

SSL certificates auto-renew via certbot cron job. To manually renew:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

## Troubleshooting

### Common Issues

1. **Application won't start**:
   - Check Node.js version: `node --version`
   - Check logs: `pm2 logs capacitor-dev`
   - Verify permissions: `ls -la /var/www/capacinator`

2. **nginx errors**:
   - Test config: `sudo nginx -t`
   - Check logs: `sudo tail -f /var/log/nginx/error.log`

3. **Database issues**:
   - Check file exists: `ls -la /var/www/capacinator/data/`
   - Check permissions: Database should be owned by `www-data`

4. **SSL issues**:
   - Check certificate: `sudo certbot certificates`
   - Test SSL: `openssl s_client -connect dev.capacinator.com:443`

### Performance Monitoring

```bash
# Check system resources
htop
df -h
free -h

# Check application performance
pm2 monit

# Check nginx performance
sudo tail -f /var/log/nginx/capacinator_access.log
```

## Security Considerations

- Database file is only accessible by `www-data` user
- nginx configured with security headers
- SSL/TLS encryption enforced
- No sensitive data in logs
- Regular security updates recommended

## Support

For issues with deployment, check:
1. Application logs: `pm2 logs capacitor-dev`
2. nginx logs: `/var/log/nginx/capacitaror_*.log`
3. System logs: `sudo journalctl -u capacinator`
4. Run health check: `./scripts/health-check.sh`