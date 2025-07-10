#!/bin/bash

# Monitoring script for Capacinator
DOMAIN="dev.capacinator.com"
APP_NAME="capacitor-dev"
LOG_FILE="/var/log/capacinator-monitor.log"

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to send alert (customize as needed)
send_alert() {
    local message="$1"
    log_message "ALERT: $message"
    # Add notification logic here (email, Slack, etc.)
    # echo "$message" | mail -s "Capacinator Alert" admin@example.com
}

# Check if application is running
check_application() {
    if pm2 list | grep -q $APP_NAME; then
        if pm2 list | grep $APP_NAME | grep -q "online"; then
            log_message "✅ Application is running (PM2)"
            return 0
        else
            send_alert "❌ Application is not online in PM2"
            return 1
        fi
    elif systemctl is-active --quiet capacinator; then
        log_message "✅ Application is running (systemd)"
        return 0
    else
        send_alert "❌ Application is not running"
        return 1
    fi
}

# Check website response
check_website() {
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN --max-time 10)
    if [ "$http_code" = "200" ]; then
        log_message "✅ Website responding (HTTP $http_code)"
        return 0
    else
        send_alert "❌ Website not responding (HTTP $http_code)"
        return 1
    fi
}

# Check API health
check_api() {
    local api_response=$(curl -s https://$DOMAIN/api/health --max-time 10)
    local api_status=$(echo $api_response | jq -r '.status' 2>/dev/null)
    
    if [ "$api_status" = "ok" ]; then
        log_message "✅ API health check passed"
        return 0
    else
        send_alert "❌ API health check failed: $api_response"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage=$(df /var/www/capacinator | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$usage" -lt 90 ]; then
        log_message "✅ Disk usage: ${usage}%"
        return 0
    else
        send_alert "❌ High disk usage: ${usage}%"
        return 1
    fi
}

# Check memory usage
check_memory() {
    local usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$usage" -lt 90 ]; then
        log_message "✅ Memory usage: ${usage}%"
        return 0
    else
        send_alert "❌ High memory usage: ${usage}%"
        return 1
    fi
}

# Check SSL certificate expiry
check_ssl() {
    local expiry_date=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ "$days_until_expiry" -gt 30 ]; then
        log_message "✅ SSL certificate valid for $days_until_expiry days"
        return 0
    elif [ "$days_until_expiry" -gt 7 ]; then
        log_message "⚠️ SSL certificate expires in $days_until_expiry days"
        return 0
    else
        send_alert "❌ SSL certificate expires in $days_until_expiry days"
        return 1
    fi
}

# Main monitoring function
main() {
    log_message "Starting monitoring check..."
    
    local failures=0
    
    check_application || ((failures++))
    check_website || ((failures++))
    check_api || ((failures++))
    check_disk_space || ((failures++))
    check_memory || ((failures++))
    check_ssl || ((failures++))
    
    if [ $failures -eq 0 ]; then
        log_message "✅ All checks passed"
    else
        log_message "❌ $failures checks failed"
        
        # Attempt automatic recovery for application issues
        if ! check_application; then
            log_message "🔄 Attempting to restart application..."
            pm2 restart $APP_NAME || systemctl restart capacinator
            sleep 10
            if check_application; then
                log_message "✅ Application restart successful"
            else
                send_alert "❌ Application restart failed"
            fi
        fi
    fi
    
    log_message "Monitoring check completed"
    echo "---"
}

# Run monitoring
main

# If run with --continuous flag, run every 5 minutes
if [ "$1" = "--continuous" ]; then
    log_message "Starting continuous monitoring (5-minute intervals)"
    while true; do
        sleep 300  # 5 minutes
        main
    done
fi