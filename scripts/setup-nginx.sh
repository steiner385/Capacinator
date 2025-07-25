#!/bin/bash

# Script to set up nginx for local.capacinator.com
# Run with: sudo ./scripts/setup-nginx.sh

set -e

DOMAIN="local.capacinator.com"
NGINX_CONF_PATH="/home/tony/GitHub/Capacinator/nginx/local.capacinator.com.conf"

echo "🔧 Setting up nginx for $DOMAIN"
echo "================================"

# 1. Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed. Please install it first with:"
    echo "   sudo apt-get update && sudo apt-get install -y nginx"
    exit 1
fi

# 2. Add domain to /etc/hosts if not already present
if ! grep -q "$DOMAIN" /etc/hosts; then
    echo "📝 Adding $DOMAIN to /etc/hosts..."
    echo "127.0.0.1   $DOMAIN" >> /etc/hosts
else
    echo "✅ $DOMAIN already in /etc/hosts"
fi

# 3. Create SSL directory
echo "📁 Creating SSL directory..."
mkdir -p /etc/nginx/ssl

# 4. Generate self-signed certificate if not exists
if [ ! -f "/etc/nginx/ssl/$DOMAIN.crt" ]; then
    echo "🔐 Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/$DOMAIN.key \
        -out /etc/nginx/ssl/$DOMAIN.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
else
    echo "✅ SSL certificate already exists"
fi

# 5. Enable the site
echo "🔗 Enabling nginx site..."
ln -sf "$NGINX_CONF_PATH" /etc/nginx/sites-enabled/$DOMAIN

# 6. Test configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# 7. Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx

echo ""
echo "✅ Nginx setup complete!"
echo ""
echo "You can now access the application at:"
echo "   🌐 https://$DOMAIN"
echo ""
echo "Note: Your browser will show a certificate warning because it's self-signed."
echo "This is normal for local development. Click 'Advanced' and 'Proceed' to continue."