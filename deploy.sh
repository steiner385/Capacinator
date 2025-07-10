#!/bin/bash
set -e

# Configuration
APP_NAME="capacitor-dev"
DEPLOY_PATH="/var/www/capacinator"
NGINX_CONFIG_PATH="/etc/nginx/sites-available/dev.capacinator.com"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled/dev.capacinator.com"
DOMAIN="dev.capacinator.com"

echo "🚀 Starting deployment for $DOMAIN..."

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    echo "✅ Running with root privileges"
else
    echo "❌ This script needs to be run with sudo privileges"
    exit 1
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p $DEPLOY_PATH
mkdir -p $DEPLOY_PATH/data
mkdir -p /var/log/capacinator
mkdir -p /var/log/nginx

# Copy application files
echo "📦 Copying application files..."
rsync -av --exclude=node_modules --exclude=.git --exclude=dist /home/tony/GitHub/Capacinator/ $DEPLOY_PATH/

# Install dependencies
echo "📦 Installing Node.js dependencies..."
cd $DEPLOY_PATH
npm install --production

# Build client
echo "🏗️ Building client..."
cd $DEPLOY_PATH/client
npm install
npm run build

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data $DEPLOY_PATH
chmod -R 755 $DEPLOY_PATH
chmod 644 $DEPLOY_PATH/.env.production

# Install global dependencies if not present
echo "🌍 Checking global dependencies..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

if ! command -v tsx &> /dev/null; then
    echo "Installing TSX..."
    npm install -g tsx
fi

# Copy nginx configuration
echo "🌐 Configuring nginx..."
cp $DEPLOY_PATH/nginx/dev.capacinator.com.conf $NGINX_CONFIG_PATH

# Enable nginx site
if [ ! -L $NGINX_ENABLED_PATH ]; then
    ln -s $NGINX_CONFIG_PATH $NGINX_ENABLED_PATH
    echo "✅ Nginx site enabled"
fi

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Install SSL certificate with certbot (if not exists)
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "🔒 Installing SSL certificate..."
    echo "Please run: sudo certbot --nginx -d $DOMAIN"
    echo "After SSL is configured, run this script again"
    exit 1
fi

# Stop existing PM2 process if running
echo "🛑 Stopping existing processes..."
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start application with PM2
echo "🚀 Starting application..."
cd $DEPLOY_PATH
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx

# Show status
echo "📊 Application status:"
pm2 status
echo ""
echo "🌐 Nginx status:"
systemctl status nginx --no-pager -l

echo ""
echo "✅ Deployment completed successfully!"
echo "🌍 Your application should be available at: https://$DOMAIN"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: pm2 logs $APP_NAME"
echo "  - Restart app: pm2 restart $APP_NAME"
echo "  - Stop app: pm2 stop $APP_NAME"
echo "  - Nginx logs: tail -f /var/log/nginx/capacinator_access.log"