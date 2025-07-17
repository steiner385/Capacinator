#!/bin/bash

# Health check script for Project Capacinator
DOMAIN="dev.capacinator.com"
API_URL="https://$DOMAIN/api/health"
EXPECTED_STATUS="ok"

echo "🏥 Health Check for $DOMAIN"
echo "================================"

# Check if domain resolves
echo "🌐 Checking DNS resolution..."
if host $DOMAIN > /dev/null 2>&1; then
    echo "✅ DNS resolution: OK"
else
    echo "❌ DNS resolution: FAILED"
    exit 1
fi

# Check SSL certificate
echo "🔒 Checking SSL certificate..."
SSL_EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
if [ $? -eq 0 ]; then
    echo "✅ SSL certificate: OK (expires: $SSL_EXPIRY)"
else
    echo "❌ SSL certificate: FAILED"
fi

# Check website response
echo "🌍 Checking website response..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Website: OK (HTTP $HTTP_STATUS)"
else
    echo "❌ Website: FAILED (HTTP $HTTP_STATUS)"
fi

# Check API health endpoint
echo "🔧 Checking API health..."
API_RESPONSE=$(curl -s $API_URL)
API_STATUS=$(echo $API_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$API_STATUS" = "$EXPECTED_STATUS" ]; then
    echo "✅ API health: OK"
    echo "   Response: $API_RESPONSE"
else
    echo "❌ API health: FAILED"
    echo "   Expected status: $EXPECTED_STATUS"
    echo "   Actual response: $API_RESPONSE"
fi

# Check database connectivity (if API is working)
if [ "$API_STATUS" = "$EXPECTED_STATUS" ]; then
    echo "💾 Checking database connectivity..."
    DB_RESPONSE=$(curl -s https://$DOMAIN/api/locations)
    if echo $DB_RESPONSE | jq . > /dev/null 2>&1; then
        echo "✅ Database: OK"
    else
        echo "❌ Database: FAILED"
        echo "   Response: $DB_RESPONSE"
    fi
fi

# Check system resources on server (if run locally)
if [ -f "/var/www/capacinator/data/capacinator.db" ]; then
    echo "📊 System Resources:"
    echo "   Disk usage: $(df -h /var/www/capacinator | tail -1 | awk '{print $5}')"
    echo "   Memory usage: $(free -h | grep Mem | awk '{print $3"/"$2}')"
    echo "   Database size: $(ls -lh /var/www/capacinator/data/capacinator.db | awk '{print $5}')"
fi

echo "================================"
echo "✅ Health check completed"