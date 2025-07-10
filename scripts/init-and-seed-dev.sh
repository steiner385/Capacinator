#!/bin/bash
set -e

echo "🔧 Initializing and seeding dev instance..."
echo "=========================================="

# Configuration
DEPLOY_PATH="/var/www/capacinator"
DATABASE_PATH="/var/www/capacinator/data/capacitizer.db"
SOURCE_PATH="/home/tony/GitHub/Capacinator"

# Check if running with proper permissions
if [[ $EUID -ne 0 ]]; then
    echo "❌ This script needs to be run with sudo"
    exit 1
fi

# Ensure data directory exists
echo "📁 Ensuring data directory exists..."
mkdir -p /var/www/capacinator/data
chown www-data:www-data /var/www/capacinator/data

# Check if database exists and has tables
echo "🔍 Checking database status..."
if [ -f "$DATABASE_PATH" ]; then
    TABLE_COUNT=$(sudo -u www-data sqlite3 "$DATABASE_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
    echo "   Found $TABLE_COUNT tables in database"
else
    TABLE_COUNT=0
    echo "   No database file found"
fi

# Run migrations if needed
if [ "$TABLE_COUNT" -lt 10 ]; then
    echo "📊 Running database migrations..."
    
    # Copy knexfile if needed
    if [ ! -f "$DEPLOY_PATH/src/server/database/knexfile.ts" ]; then
        mkdir -p $DEPLOY_PATH/src/server/database
        cp $SOURCE_PATH/src/server/database/knexfile.ts $DEPLOY_PATH/src/server/database/
        chown -R www-data:www-data $DEPLOY_PATH/src/server/database
    fi
    
    # Copy migrations
    echo "📦 Copying migration files..."
    mkdir -p $DEPLOY_PATH/src/server/database/migrations
    cp -r $SOURCE_PATH/src/server/database/migrations/* $DEPLOY_PATH/src/server/database/migrations/
    chown -R www-data:www-data $DEPLOY_PATH/src/server/database/migrations
    
    # Run migrations  
    sudo -u www-data bash -c "cd $DEPLOY_PATH && export DATABASE_PATH=$DATABASE_PATH && npx tsx node_modules/.bin/knex migrate:latest --knexfile src/server/database/knexfile.ts"
    echo "✅ Migrations completed"
else
    echo "✅ Database already initialized"
fi

# Copy and run seed script
echo "📦 Copying seed script..."
mkdir -p $DEPLOY_PATH/scripts
cp $SOURCE_PATH/scripts/seed-dev-data.ts $DEPLOY_PATH/scripts/
chown www-data:www-data $DEPLOY_PATH/scripts/seed-dev-data.ts

# Backup existing data if any
if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "💾 Creating backup..."
    BACKUP_FILE="/var/www/capacinator/data/capacitizer-backup-$(date +%Y%m%d_%H%M%S).db"
    cp "$DATABASE_PATH" "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
fi

# Run the seed script
echo "🌱 Running seed script..."
sudo -u www-data bash -c "cd $DEPLOY_PATH && export DATABASE_PATH=$DATABASE_PATH && npx tsx scripts/seed-dev-data.ts"

# Restart the application
echo "🔄 Restarting application..."
sudo -H -u www-data bash -c 'export HOME=/home/www-data && pm2 restart capacitor-dev'

# Wait for application to stabilize
sleep 5

# Verify the seeding worked
echo "🧪 Verifying seed data..."
echo "Checking API health..."
if curl -s http://localhost:3456/api/health | grep -q "ok"; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
fi

echo ""
echo "Checking data via API..."
PROJECT_COUNT=$(curl -s http://localhost:3456/api/projects | jq '. | length' 2>/dev/null || echo "0")
PEOPLE_COUNT=$(curl -s http://localhost:3456/api/people | jq '. | length' 2>/dev/null || echo "0")
LOCATION_COUNT=$(curl -s http://localhost:3456/api/locations | jq '. | length' 2>/dev/null || echo "0")

echo "Summary:"
echo "  Locations: $LOCATION_COUNT"
echo "  Projects: $PROJECT_COUNT"  
echo "  People: $PEOPLE_COUNT"

echo ""
echo "✅ Dev instance initialized and seeded successfully!"
echo "🌐 Visit http://dev.capacinator.com to explore the data"