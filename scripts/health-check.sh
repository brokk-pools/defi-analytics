#!/bin/bash

# ===========================================
# ORCA MVP HEALTH CHECK SCRIPT
# ===========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HEALTH_LOG="/var/log/orca-health.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90
TIMEOUT=10

# Functions
log() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $1"
    echo "[$timestamp] $1" >> "$HEALTH_LOG"
}

success() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[✓]${NC} $1"
    echo "[$timestamp] SUCCESS: $1" >> "$HEALTH_LOG"
}

warning() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[⚠]${NC} $1"
    echo "[$timestamp] WARNING: $1" >> "$HEALTH_LOG"
}

error() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[✗]${NC} $1"
    echo "[$timestamp] ERROR: $1" >> "$HEALTH_LOG"
}

# Check Docker containers
check_containers() {
    log "Checking Docker containers..."
    
    local containers=("orca-postgres-prod" "orca-redis-prod" "orca-backend-prod" "orca-nginx-prod")
    local failed_containers=()
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            # Check if container is healthy
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
            
            if [[ "$health_status" == "healthy" ]] || [[ "$health_status" == "no-healthcheck" ]]; then
                success "Container $container is running"
            else
                error "Container $container is unhealthy (status: $health_status)"
                failed_containers+=("$container")
            fi
        else
            error "Container $container is not running"
            failed_containers+=("$container")
        fi
    done
    
    if [[ ${#failed_containers[@]} -eq 0 ]]; then
        success "All containers are healthy"
        return 0
    else
        error "${#failed_containers[@]} containers have issues: ${failed_containers[*]}"
        return 1
    fi
}

# Check web services
check_web_services() {
    log "Checking web services..."
    
    local endpoints=(
        "http://localhost/health"
        "http://localhost:3001/health"
    )
    
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        if curl -sf --max-time "$TIMEOUT" "$endpoint" > /dev/null; then
            success "Endpoint $endpoint is responding"
        else
            error "Endpoint $endpoint is not responding"
            failed_endpoints+=("$endpoint")
        fi
    done
    
    if [[ ${#failed_endpoints[@]} -eq 0 ]]; then
        success "All web services are responding"
        return 0
    else
        error "${#failed_endpoints[@]} endpoints are down: ${failed_endpoints[*]}"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if docker exec orca-postgres-prod pg_isready -U orca_user -d orcadata_prod -h localhost > /dev/null 2>&1; then
        success "Database is accepting connections"
        
        # Check database size and connections
        local db_size=$(docker exec orca-postgres-prod psql -U orca_user -d orcadata_prod -t -c "SELECT pg_size_pretty(pg_database_size('orcadata_prod'));" 2>/dev/null | xargs || "unknown")
        local active_connections=$(docker exec orca-postgres-prod psql -U orca_user -d orcadata_prod -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs || "unknown")
        
        log "Database size: $db_size, Active connections: $active_connections"
        return 0
    else
        error "Database is not accepting connections"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis connectivity..."
    
    if docker exec orca-redis-prod redis-cli ping > /dev/null 2>&1; then
        success "Redis is responding"
        
        # Check Redis memory usage
        local memory_usage=$(docker exec orca-redis-prod redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r' || "unknown")
        local connected_clients=$(docker exec orca-redis-prod redis-cli info clients | grep connected_clients | cut -d: -f2 | tr -d '\r' || "unknown")
        
        log "Redis memory usage: $memory_usage, Connected clients: $connected_clients"
        return 0
    else
        error "Redis is not responding"
        return 1
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    
    if [[ $cpu_usage -gt $ALERT_THRESHOLD_CPU ]]; then
        warning "High CPU usage: ${cpu_usage}%"
    else
        success "CPU usage: ${cpu_usage}%"
    fi
    
    # Check memory usage
    local memory_info=$(free | grep Mem)
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_memory * 100 / total_memory))
    
    if [[ $memory_usage -gt $ALERT_THRESHOLD_MEMORY ]]; then
        warning "High memory usage: ${memory_usage}%"
    else
        success "Memory usage: ${memory_usage}%"
    fi
    
    # Check disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt $ALERT_THRESHOLD_DISK ]]; then
        warning "High disk usage: ${disk_usage}%"
    else
        success "Disk usage: ${disk_usage}%"
    fi
    
    # Check load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}')
    log "Load average:$load_avg"
}

# Check SSL certificate expiration
check_ssl_certificate() {
    local domain="${DOMAIN:-localhost}"
    
    if [[ "$domain" == "localhost" ]] || [[ "$domain" == "your-domain.com" ]]; then
        log "Skipping SSL check (domain not configured)"
        return 0
    fi
    
    log "Checking SSL certificate for $domain..."
    
    local cert_file="/etc/letsencrypt/live/${domain}/fullchain.pem"
    
    if [[ -f "$cert_file" ]]; then
        local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [[ $days_until_expiry -lt 7 ]]; then
            warning "SSL certificate expires in $days_until_expiry days"
        elif [[ $days_until_expiry -lt 30 ]]; then
            log "SSL certificate expires in $days_until_expiry days"
        else
            success "SSL certificate is valid (expires in $days_until_expiry days)"
        fi
    else
        warning "SSL certificate file not found: $cert_file"
    fi
}

# Check backup status
check_backup_status() {
    log "Checking backup status..."
    
    local backup_dir="/var/backups/orca-mvp"
    
    if [[ -d "$backup_dir" ]]; then
        local latest_backup=$(find "$backup_dir" -name "backup_*" -type d -o -name "backup_*.tar.gz.enc" -type f | sort | tail -1)
        
        if [[ -n "$latest_backup" ]]; then
            local backup_age=$(( ($(date +%s) - $(stat -c %Y "$latest_backup")) / 86400 ))
            
            if [[ $backup_age -gt 1 ]]; then
                warning "Latest backup is $backup_age days old"
            else
                success "Latest backup is recent (${backup_age} days old)"
            fi
        else
            warning "No backups found"
        fi
    else
        warning "Backup directory not found: $backup_dir"
    fi
}

# Send notifications
send_notification() {
    local status=$1
    local summary=$2
    
    # Log notification
    log "HEALTH CHECK $status: $summary"
    
    # Send email if configured
    if command -v mail &> /dev/null && [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$summary" | mail -s "Orca MVP Health Check $status" "$NOTIFICATION_EMAIL"
    fi
    
    # Send webhook if configured
    if [[ -n "${NOTIFICATION_WEBHOOK:-}" ]]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"$status\", \"message\": \"$summary\"}" \
            2>/dev/null || true
    fi
}

# Generate health report
generate_report() {
    local start_time=$1
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "Health check completed in ${duration}s"
    
    # Count issues
    local error_count=$(grep -c "ERROR:" "$HEALTH_LOG" || echo "0")
    local warning_count=$(grep -c "WARNING:" "$HEALTH_LOG" || echo "0")
    
    if [[ $error_count -gt 0 ]]; then
        local status="CRITICAL"
        local summary="Health check found $error_count errors and $warning_count warnings"
        error "$summary"
        send_notification "$status" "$summary"
        return 1
    elif [[ $warning_count -gt 0 ]]; then
        local status="WARNING" 
        local summary="Health check found $warning_count warnings"
        warning "$summary"
        send_notification "$status" "$summary"
        return 0
    else
        local status="HEALTHY"
        local summary="All systems are healthy"
        success "$summary"
        return 0
    fi
}

# Main health check function
main() {
    local start_time=$(date +%s)
    
    log "Starting Orca MVP health check..."
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$HEALTH_LOG")"
    
    # Rotate log if it's too large (>10MB)
    if [[ -f "$HEALTH_LOG" ]] && [[ $(stat -c%s "$HEALTH_LOG") -gt 10485760 ]]; then
        mv "$HEALTH_LOG" "${HEALTH_LOG}.old"
        touch "$HEALTH_LOG"
    fi
    
    # Run all checks
    check_containers
    check_web_services
    check_database
    check_redis
    check_system_resources
    check_ssl_certificate
    check_backup_status
    
    # Generate final report
    generate_report "$start_time"
}

# Run main function
main "$@"