#!/bin/bash

# ===========================================
# ORCA MVP BACKUP SCRIPT
# ===========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/var/backups/orca-mvp"
RETENTION_DAYS=30
REMOTE_BACKUP_ENABLED=${REMOTE_BACKUP_ENABLED:-false}
REMOTE_BACKUP_HOST=${REMOTE_BACKUP_HOST:-""}
REMOTE_BACKUP_PATH=${REMOTE_BACKUP_PATH:-""}
ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-""}

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Create backup directory
setup_backup_dir() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="${BACKUP_DIR}/backup_${timestamp}"
    
    mkdir -p "$BACKUP_PATH"
    chmod 750 "$BACKUP_PATH"
    
    log "Backup directory created: $BACKUP_PATH"
}

# Backup database
backup_database() {
    log "Backing up PostgreSQL database..."
    
    if ! docker ps | grep -q orca-postgres-prod; then
        warning "PostgreSQL container not running, skipping database backup"
        return 0
    fi
    
    # Create database dump
    docker exec orca-postgres-prod pg_dump \
        -U orca_user \
        -d orcadata_prod \
        --no-password \
        --verbose \
        --format=custom \
        --compress=9 > "${BACKUP_PATH}/database.dump"
    
    # Also create SQL dump for readability
    docker exec orca-postgres-prod pg_dump \
        -U orca_user \
        -d orcadata_prod \
        --no-password \
        --verbose > "${BACKUP_PATH}/database.sql"
    
    # Get database size
    local db_size=$(docker exec orca-postgres-prod psql -U orca_user -d orcadata_prod -t -c "SELECT pg_size_pretty(pg_database_size('orcadata_prod'));")
    log "Database size: $db_size"
    
    success "Database backup completed"
}

# Backup Redis data
backup_redis() {
    log "Backing up Redis data..."
    
    if ! docker ps | grep -q orca-redis-prod; then
        warning "Redis container not running, skipping Redis backup"
        return 0
    fi
    
    # Create Redis dump
    docker exec orca-redis-prod redis-cli --rdb /data/dump.rdb
    docker cp orca-redis-prod:/data/dump.rdb "${BACKUP_PATH}/redis.rdb"
    
    success "Redis backup completed"
}

# Backup application files
backup_application() {
    log "Backing up application files..."
    
    local app_backup_dir="${BACKUP_PATH}/application"
    mkdir -p "$app_backup_dir"
    
    # Backup Docker Compose configuration
    cp -r /opt/orca-mvp/infra "$app_backup_dir/"
    
    # Backup environment files (excluding secrets)
    find /opt/orca-mvp -name "*.env*" -not -name "*.secrets*" -exec cp {} "$app_backup_dir/" \;
    
    # Backup Nginx configuration
    if [[ -d "/etc/nginx/sites-enabled" ]]; then
        mkdir -p "${app_backup_dir}/nginx"
        cp -r /etc/nginx/sites-enabled "${app_backup_dir}/nginx/"
        cp /etc/nginx/nginx.conf "${app_backup_dir}/nginx/"
    fi
    
    success "Application files backup completed"
}

# Backup SSL certificates
backup_ssl() {
    log "Backing up SSL certificates..."
    
    if [[ -d "/etc/letsencrypt" ]]; then
        mkdir -p "${BACKUP_PATH}/ssl"
        cp -r /etc/letsencrypt "${BACKUP_PATH}/ssl/"
        success "SSL certificates backup completed"
    else
        warning "No SSL certificates found, skipping SSL backup"
    fi
}

# Backup logs
backup_logs() {
    log "Backing up recent logs..."
    
    local logs_backup_dir="${BACKUP_PATH}/logs"
    mkdir -p "$logs_backup_dir"
    
    # Backup application logs (last 7 days)
    if [[ -d "/var/log/orca" ]]; then
        find /var/log/orca -name "*.log" -mtime -7 -exec cp {} "$logs_backup_dir/" \;
    fi
    
    # Backup Nginx logs (last 3 days)
    if [[ -d "/var/log/nginx" ]]; then
        find /var/log/nginx -name "*.log" -mtime -3 -exec cp {} "$logs_backup_dir/" \;
    fi
    
    success "Logs backup completed"
}

# Create backup manifest
create_manifest() {
    log "Creating backup manifest..."
    
    local manifest_file="${BACKUP_PATH}/manifest.json"
    
    cat > "$manifest_file" << EOF
{
    "backup_timestamp": "$(date -Iseconds)",
    "backup_type": "full",
    "hostname": "$(hostname)",
    "backup_size": "$(du -sh "$BACKUP_PATH" | cut -f1)",
    "components": {
        "database": $(test -f "${BACKUP_PATH}/database.dump" && echo "true" || echo "false"),
        "redis": $(test -f "${BACKUP_PATH}/redis.rdb" && echo "true" || echo "false"),
        "application": $(test -d "${BACKUP_PATH}/application" && echo "true" || echo "false"),
        "ssl": $(test -d "${BACKUP_PATH}/ssl" && echo "true" || echo "false"),
        "logs": $(test -d "${BACKUP_PATH}/logs" && echo "true" || echo "false")
    },
    "retention_days": $RETENTION_DAYS,
    "encryption_enabled": $(test -n "$ENCRYPTION_KEY" && echo "true" || echo "false")
}
EOF
    
    success "Backup manifest created"
}

# Encrypt backup
encrypt_backup() {
    if [[ -z "$ENCRYPTION_KEY" ]]; then
        warning "No encryption key provided, skipping encryption"
        return 0
    fi
    
    log "Encrypting backup..."
    
    local encrypted_file="${BACKUP_PATH}.tar.gz.enc"
    
    # Create compressed archive
    tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "$(basename "$BACKUP_PATH")"
    
    # Encrypt archive
    openssl enc -aes-256-cbc -salt -in "${BACKUP_PATH}.tar.gz" -out "$encrypted_file" -k "$ENCRYPTION_KEY"
    
    # Remove unencrypted files
    rm -rf "$BACKUP_PATH" "${BACKUP_PATH}.tar.gz"
    
    BACKUP_PATH="$encrypted_file"
    
    success "Backup encrypted"
}

# Upload to remote storage
upload_remote() {
    if [[ "$REMOTE_BACKUP_ENABLED" != "true" ]] || [[ -z "$REMOTE_BACKUP_HOST" ]]; then
        log "Remote backup not configured, skipping upload"
        return 0
    fi
    
    log "Uploading backup to remote storage..."
    
    local backup_file="$(basename "$BACKUP_PATH")"
    local remote_path="${REMOTE_BACKUP_PATH}/${backup_file}"
    
    # Upload using rsync over SSH
    if rsync -avz --progress "$BACKUP_PATH" "${REMOTE_BACKUP_HOST}:${remote_path}"; then
        success "Backup uploaded to remote storage"
    else
        warning "Failed to upload backup to remote storage"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "backup_*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    # Remote cleanup (if configured)
    if [[ "$REMOTE_BACKUP_ENABLED" == "true" ]] && [[ -n "$REMOTE_BACKUP_HOST" ]]; then
        ssh "$REMOTE_BACKUP_HOST" "find ${REMOTE_BACKUP_PATH} -name 'backup_*' -mtime +$RETENTION_DAYS -delete" 2>/dev/null || true
    fi
    
    success "Old backups cleaned up"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    local errors=0
    
    # Check if backup directory exists and is not empty
    if [[ ! -d "$BACKUP_PATH" ]] && [[ ! -f "$BACKUP_PATH" ]]; then
        error "Backup path does not exist: $BACKUP_PATH"
        ((errors++))
    fi
    
    # Check database backup
    if [[ -f "${BACKUP_PATH}/database.dump" ]]; then
        if ! file "${BACKUP_PATH}/database.dump" | grep -q "PostgreSQL custom database dump"; then
            warning "Database backup may be corrupted"
            ((errors++))
        fi
    fi
    
    # Check backup size
    local backup_size=$(du -sb "$BACKUP_PATH" 2>/dev/null | cut -f1 || echo "0")
    if [[ $backup_size -lt 1024 ]]; then
        warning "Backup size is suspiciously small: $backup_size bytes"
        ((errors++))
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "Backup verification passed"
    else
        warning "Backup verification completed with $errors warnings"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Log the notification
    log "BACKUP $status: $message"
    
    # Send email notification if configured
    if command -v mail &> /dev/null && [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$message" | mail -s "Orca MVP Backup $status" "$NOTIFICATION_EMAIL"
    fi
    
    # Send webhook notification if configured
    if [[ -n "${NOTIFICATION_WEBHOOK:-}" ]]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"$status\", \"message\": \"$message\"}" \
            2>/dev/null || true
    fi
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    log "Starting Orca MVP backup..."
    
    # Trap errors for notification
    trap 'send_notification "FAILED" "Backup failed at line $LINENO"' ERR
    
    setup_backup_dir
    backup_database
    backup_redis
    backup_application
    backup_ssl
    backup_logs
    create_manifest
    encrypt_backup
    verify_backup
    upload_remote
    cleanup_old_backups
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local backup_size=$(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1 || "unknown")
    
    success "Backup completed successfully!"
    log "Duration: ${duration}s"
    log "Backup size: $backup_size"
    log "Backup location: $BACKUP_PATH"
    
    send_notification "SUCCESS" "Backup completed successfully. Duration: ${duration}s, Size: $backup_size"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root or with sudo"
fi

# Run main function
main "$@"