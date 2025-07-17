#!/bin/bash
set -e

# Update script for Capacinator
APP_NAME="capacitor-dev"
DEPLOY_PATH="/var/www/capacinator"
SOURCE_PATH="/home/tony/GitHub/Capacinator"

echo "🔄 Updating Capacinator..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "❌ This script needs to be run with sudo"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
cd $SOURCE_PATH
git pull

# Build new version
echo "🏗️ Building new version..."
cd $SOURCE_PATH/client
npm install
npm run build

# Backup current version
echo "💾 Creating backup..."
BACKUP_DIR="/var/backups/capacinator/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r $DEPLOY_PATH/client/dist $BACKUP_DIR/
cp $DEPLOY_PATH/data/capacinator.db $BACKUP_DIR/ 2>/dev/null || echo "⚠️ No database found to backup"

# Stop application
echo "🛑 Stopping application..."
pm2 stop $APP_NAME || systemctl stop capacinator || echo "⚠️ Application may not be running"

# Update files
echo "📦 Updating application files..."
rsync -av --exclude=node_modules --exclude=.git --exclude=data $SOURCE_PATH/ $DEPLOY_PATH/

# Install any new dependencies
echo "📦 Installing dependencies..."
cd $DEPLOY_PATH
npm install --production

# Set permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data $DEPLOY_PATH
chmod -R 755 $DEPLOY_PATH

# Start application
echo "🚀 Starting application..."
cd $DEPLOY_PATH
pm2 start ecosystem.config.js || systemctl start capacinator

# Verify deployment
echo "🧪 Verifying deployment..."
sleep 5

# Check if application is running
if pm2 list | grep -q $APP_NAME; then
    echo "✅ PM2 process is running"
elif systemctl is-active --quiet capacinator; then
    echo "✅ systemd service is running"
else
    echo "❌ Application is not running!"
    echo "🔄 Attempting to restore from backup..."
    pm2 stop $APP_NAME 2>/dev/null || true
    cp -r $BACKUP_DIR/dist $DEPLOY_PATH/client/
    pm2 start $APP_NAME
    echo "⚠️ Restored from backup. Check logs for errors."
    exit 1
fi

# Test health endpoint
if curl -f -s https://dev.capacinator.com/api/health > /dev/null; then
    echo "✅ Health check passed"
else
    echo "⚠️ Health check failed - application may still be starting"
fi

# Cleanup old backups (keep last 5)
echo "🧹 Cleaning up old backups..."
find /var/backups/capacinator -type d -name "20*" | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true

echo ""
echo "✅ Update completed successfully!"
echo "🌍 Application: https://dev.capacinator.com"
echo "📊 Status: pm2 status"
echo "📝 Logs: pm2 logs $APP_NAME"