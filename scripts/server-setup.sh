#!/bin/bash

# ===========================================
# ORCA MVP SERVER SETUP SCRIPT
# ===========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get upgrade -y
    apt-get autoremove -y
    apt-get autoclean
    
    success "System packages updated"
}

# Install essential packages
install_essentials() {
    log "Installing essential packages..."
    
    local packages=(
        "curl"
        "wget"
        "git"
        "unzip"
        "software-properties-common"
        "apt-transport-https"
        "ca-certificates"
        "gnupg"
        "lsb-release"
        "ufw"
        "fail2ban"
        "htop"
        "vim"
        "nano"
        "tree"
        "jq"
        "netcat"
        "telnet"
        "ntp"
        "logrotate"
    )
    
    apt-get install -y "${packages[@]}"
    
    success "Essential packages installed"
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add user to docker group
    usermod -aG docker ubuntu 2>/dev/null || true
    
    success "Docker installed"
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."
    
    local version="v2.24.0"
    curl -L "https://github.com/docker/compose/releases/download/${version}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink for compatibility
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    success "Docker Compose installed"
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js..."
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    # Install global packages
    npm install -g pm2 npm@latest
    
    success "Node.js installed"
}

# Install Nginx
install_nginx() {
    log "Installing Nginx..."
    
    apt-get install -y nginx
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Create directories
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    mkdir -p /var/log/nginx
    
    success "Nginx installed"
}

# Install Certbot
install_certbot() {
    log "Installing Certbot..."
    
    apt-get install -y certbot python3-certbot-nginx
    
    success "Certbot installed"
}

# Configure security settings
configure_security() {
    log "Configuring security settings..."
    
    # Configure SSH
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
    systemctl restart ssh
    
    # Configure fail2ban
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
    
    systemctl enable fail2ban
    systemctl start fail2ban
    
    # Configure automatic updates
    apt-get install -y unattended-upgrades
    echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
    
    success "Security settings configured"
}

# Configure system limits
configure_limits() {
    log "Configuring system limits..."
    
    # Increase file descriptor limits
    cat >> /etc/security/limits.conf << 'EOF'
# Orca MVP limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF
    
    # Configure sysctl
    cat >> /etc/sysctl.conf << 'EOF'
# Orca MVP system settings
net.core.somaxconn = 65535
net.ipv4.ip_local_port_range = 1024 65000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.core.netdev_max_backlog = 4000
net.ipv4.tcp_max_syn_backlog = 20480
net.ipv4.tcp_max_tw_buckets = 400000
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = cubic
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF
    
    sysctl -p
    
    success "System limits configured"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/orca-mvp << 'EOF'
/var/log/orca/*/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker kill -s USR1 $(docker ps -q --filter name=orca) 2>/dev/null || true
    endscript
}

/var/log/orca-deploy.log {
    weekly
    missingok
    rotate 8
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    success "Log rotation configured"
}

# Configure monitoring
setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Create monitoring script
    cat > /usr/local/bin/orca-health-check.sh << 'EOF'
#!/bin/bash

# Simple health check script
LOG_FILE="/var/log/orca-health.log"
TIMESTAMP=$(date +'%Y-%m-%d %H:%M:%S')

# Check if containers are running
if ! docker ps | grep -q orca; then
    echo "[$TIMESTAMP] ERROR: Orca containers not running" >> "$LOG_FILE"
    exit 1
fi

# Check if web service responds
if ! curl -sf http://localhost/health > /dev/null; then
    echo "[$TIMESTAMP] ERROR: Web service not responding" >> "$LOG_FILE"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 90 ]]; then
    echo "[$TIMESTAMP] WARNING: Disk usage is ${DISK_USAGE}%" >> "$LOG_FILE"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [[ $MEM_USAGE -gt 90 ]]; then
    echo "[$TIMESTAMP] WARNING: Memory usage is ${MEM_USAGE}%" >> "$LOG_FILE"
fi

echo "[$TIMESTAMP] INFO: Health check passed" >> "$LOG_FILE"
EOF
    
    chmod +x /usr/local/bin/orca-health-check.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/orca-health-check.sh") | crontab -
    
    success "Basic monitoring configured"
}

# Create deployment user
create_deploy_user() {
    log "Creating deployment user..."
    
    # Create orca user if it doesn't exist
    if ! id "orca" &>/dev/null; then
        useradd -m -s /bin/bash orca
        usermod -aG docker orca
        usermod -aG sudo orca
        
        # Setup SSH directory
        mkdir -p /home/orca/.ssh
        chmod 700 /home/orca/.ssh
        chown orca:orca /home/orca/.ssh
    fi
    
    success "Deployment user created"
}

# Print final instructions
print_instructions() {
    log "Server setup complete!"
    log "====================="
    log ""
    log "Next steps:"
    log "1. Copy your SSH public key to /home/orca/.ssh/authorized_keys"
    log "2. Configure your domain name in the deployment scripts"
    log "3. Set up your environment variables in .env.secrets"
    log "4. Run the deployment script: ./scripts/deploy.sh"
    log ""
    log "Important files:"
    log "- SSH config: /etc/ssh/sshd_config"
    log "- Nginx config: /etc/nginx/"
    log "- Docker logs: docker logs <container_name>"
    log "- System logs: /var/log/"
    log ""
    warning "Don't forget to:"
    warning "- Configure your firewall rules"
    warning "- Set up SSL certificates"
    warning "- Configure monitoring and alerts"
    warning "- Test your backup and restore procedures"
    log ""
    success "Server is ready for deployment!"
}

# Main function
main() {
    log "Starting Orca MVP server setup..."
    
    check_root
    update_system
    install_essentials
    install_docker
    install_docker_compose
    install_nodejs
    install_nginx
    install_certbot
    configure_security
    configure_limits
    setup_log_rotation
    setup_monitoring
    create_deploy_user
    print_instructions
}

# Trap errors
trap 'error "Server setup failed at line $LINENO"' ERR

# Run main function
main "$@"