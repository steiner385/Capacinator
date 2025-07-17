#!/bin/bash
set -e

echo "🌱 Seeding dev instance with robust sample data..."
echo "================================================"

# Configuration
DEPLOY_PATH="/var/www/capacinator"
DATABASE_PATH="/var/www/capacinator/data/capacinator.db"

# Check if running with proper permissions
if [[ $EUID -ne 0 ]]; then
    echo "❌ This script needs to be run with sudo"
    exit 1
fi

# Backup existing database
echo "💾 Creating backup of existing database..."
BACKUP_FILE="/var/www/capacinator/data/capacinator-backup-$(date +%Y%m%d_%H%M%S).db"
if [ -f "$DATABASE_PATH" ]; then
    cp "$DATABASE_PATH" "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️ No existing database found, skipping backup"
fi

# Copy seed script to deployment
echo "📦 Copying seed script to deployment..."
cp /home/tony/GitHub/Capacinator/scripts/seed-dev-data.ts $DEPLOY_PATH/scripts/
chown www-data:www-data $DEPLOY_PATH/scripts/seed-dev-data.ts

# Run the seed script
echo "🌱 Running seed script..."
cd $DEPLOY_PATH
sudo -u www-data bash -c "export DATABASE_PATH=$DATABASE_PATH && npx tsx scripts/seed-dev-data.ts"

# Restart the application to ensure it picks up new data
echo "🔄 Restarting application..."
sudo -H -u www-data bash -c 'export HOME=/home/www-data && pm2 restart capacitor-dev'

# Wait for application to stabilize
sleep 3

# Verify the seeding worked
echo "🧪 Verifying seed data..."
echo "Checking API health..."
if curl -s http://localhost:3456/api/health | grep -q "ok"; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
    exit 1
fi

echo ""
echo "Checking data counts..."
# Get project count via API
PROJECT_COUNT=$(curl -s http://localhost:3456/api/projects | jq '. | length' 2>/dev/null || echo "0")
PEOPLE_COUNT=$(curl -s http://localhost:3456/api/people | jq '. | length' 2>/dev/null || echo "0")

echo "  Projects: $PROJECT_COUNT"
echo "  People: $PEOPLE_COUNT"

echo ""
echo "✅ Dev instance seeded successfully!"
echo "🌐 Visit https://dev.capacinator.com to see the data"
echo ""
echo "📝 To restore from backup if needed:"
echo "   sudo cp $BACKUP_FILE $DATABASE_PATH"
echo "   sudo chown www-data:www-data $DATABASE_PATH"
echo "   sudo -H -u www-data pm2 restart capacitor-dev"