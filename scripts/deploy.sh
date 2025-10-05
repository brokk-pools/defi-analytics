#!/bin/bash

# ===========================================
# ORCA MVP PRODUCTION DEPLOYMENT SCRIPT
# ===========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV=${1:-production}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="/var/backups/orca-mvp"
LOG_FILE="/var/log/orca-deploy.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "${LOG_FILE}"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_FILE}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_FILE}"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${LOG_FILE}"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
}

# Check required dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    local deps=("docker" "docker-compose" "git" "nginx" "certbot")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "Required dependency '$dep' is not installed"
        fi
    done
    
    success "All dependencies are installed"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    local dirs=(
        "/var/lib/orca"
        "/var/log/orca/postgres"
        "/var/log/orca/redis"
        "/var/log/orca/backend"
        "/var/log/orca/nginx"
        "${BACKUP_DIR}"
        "/etc/nginx/sites-available"
        "/etc/nginx/sites-enabled"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        chown -R 1001:1001 "$dir" 2>/dev/null || true
    done
    
    success "Directories created"
}

# Backup existing data
backup_data() {
    log "Creating backup..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${BACKUP_DIR}/backup_${backup_timestamp}"
    
    mkdir -p "$backup_path"
    
    # Backup database if it exists
    if docker ps | grep -q orca-postgres-prod; then
        log "Backing up database..."
        docker exec orca-postgres-prod pg_dump -U orca_user orcadata_prod > "${backup_path}/database.sql"
    fi
    
    # Backup configurations
    if [[ -d "/etc/nginx/sites-enabled" ]]; then
        cp -r /etc/nginx/sites-enabled "${backup_path}/nginx-sites"
    fi
    
    # Backup SSL certificates
    if [[ -d "/etc/letsencrypt" ]]; then
        cp -r /etc/letsencrypt "${backup_path}/ssl-certs"
    fi
    
    success "Backup created at ${backup_path}"
}

# Load environment variables
load_environment() {
    log "Loading environment variables..."
    
    local env_file="${PROJECT_ROOT}/.env.secrets"
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
    fi
    
    # shellcheck source=/dev/null
    source "$env_file"
    
    # Validate required variables
    local required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "HELIUS_API_KEY"
        "SESSION_SECRET"
        "WEBHOOK_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable '$var' is not set"
        fi
    done
    
    success "Environment variables loaded"
}

# Build and deploy containers
deploy_containers() {
    log "Building and deploying containers..."
    
    cd "${PROJECT_ROOT}"
    
    # Stop existing containers gracefully
    if docker-compose -f infra/docker-compose.production.yml ps -q 2>/dev/null | grep -q .; then
        log "Stopping existing containers..."
        docker-compose -f infra/docker-compose.production.yml down --timeout 30
    fi
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f infra/docker-compose.production.yml pull
    
    # Build and start containers
    log "Building and starting containers..."
    docker-compose -f infra/docker-compose.production.yml up -d --build
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    local max_attempts=60
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if docker-compose -f infra/docker-compose.production.yml ps | grep -q "healthy"; then
            break
        fi
        
        sleep 5
        ((attempt++))
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "Services failed to become healthy within timeout"
        fi
    done
    
    success "Containers deployed successfully"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Copy Nginx configuration
    cp "${PROJECT_ROOT}/infra/nginx/nginx.conf" /etc/nginx/nginx.conf
    cp "${PROJECT_ROOT}/infra/nginx/sites/orca-mvp.conf" /etc/nginx/sites-available/orca-mvp
    
    # Enable site
    ln -sf /etc/nginx/sites-available/orca-mvp /etc/nginx/sites-enabled/orca-mvp
    
    # Remove default site if exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    if ! nginx -t; then
        error "Nginx configuration test failed"
    fi
    
    # Reload Nginx
    systemctl reload nginx
    
    success "Nginx configured successfully"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    local domain="${DOMAIN:-your-domain.com}"
    local email="${SSL_EMAIL:-admin@${domain}}"
    
    if [[ "$domain" == "your-domain.com" ]]; then
        warning "Domain not configured, skipping SSL setup"
        return 0
    fi
    
    # Check if certificate already exists
    if [[ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ]]; then
        log "SSL certificate already exists for ${domain}"
        return 0
    fi
    
    # Obtain certificate
    if ! certbot --nginx -d "$domain" --non-interactive --agree-tos --email "$email"; then
        warning "Failed to obtain SSL certificate, continuing without SSL"
        return 0
    fi
    
    # Setup auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    success "SSL certificates configured"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        ufw --force enable
    fi
    
    # Configure firewall rules
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw allow from 10.0.0.0/8 to any port 5432  # PostgreSQL from private networks
    ufw allow from 172.16.0.0/12 to any port 5432
    ufw allow from 192.168.0.0/16 to any port 5432
    
    success "Firewall configured"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    local health_url="http://localhost/health"
    local max_attempts=10
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -sf "$health_url" > /dev/null; then
            success "Health check passed"
            return 0
        fi
        
        sleep 5
        ((attempt++))
    done
    
    error "Health check failed after ${max_attempts} attempts"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    find "${BACKUP_DIR}" -type d -name "backup_*" -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    success "Old backups cleaned up"
}

# Print deployment summary
print_summary() {
    log "Deployment Summary:"
    log "=================="
    log "Environment: ${DEPLOY_ENV}"
    log "Project Root: ${PROJECT_ROOT}"
    log "Backup Directory: ${BACKUP_DIR}"
    log "Log File: ${LOG_FILE}"
    log ""
    log "Services Status:"
    docker-compose -f "${PROJECT_ROOT}/infra/docker-compose.production.yml" ps
    log ""
    log "Nginx Status:"
    systemctl status nginx --no-pager -l
    log ""
    success "Deployment completed successfully!"
}

# Main deployment function
main() {
    log "Starting Orca MVP deployment..."
    
    check_permissions
    check_dependencies
    setup_directories
    backup_data
    load_environment
    deploy_containers
    configure_nginx
    setup_ssl
    configure_firewall
    verify_deployment
    cleanup_backups
    print_summary
}

# Trap errors
trap 'error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"