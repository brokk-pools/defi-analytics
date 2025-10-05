# Orca MVP Production Deployment Guide

This comprehensive guide covers deploying the Orca Whirlpools MVP to a production environment with enterprise-grade security, monitoring, and performance optimizations.

## 📋 System Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 50GB SSD (100GB+ recommended)
- **CPU**: 2 cores minimum (4 cores recommended)
- **Network**: Public IP address with 1Gbps connection
- **Domain**: Registered domain name (required for SSL)

### Recommended Production Setup
- **RAM**: 16GB for high-traffic scenarios
- **Storage**: 200GB+ NVMe SSD with backup storage
- **CPU**: 8 cores for optimal performance
- **Network**: Load balancer + CDN (Cloudflare recommended)
- **Monitoring**: External monitoring service (Datadog, New Relic, etc.)

## 🚀 Quick Start (Automated)

Use our automated scripts for rapid deployment:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd orca-mvp

# 2. Setup the server (run as root)
sudo ./scripts/server-setup.sh

# 3. Configure environment variables
cp .env.secrets.example .env.secrets
# Edit .env.secrets with your production values

# 4. Deploy the application
sudo ./scripts/deploy.sh production
```

That's it! Your Orca MVP will be running with production-grade configuration.

## 📖 Manual Deployment (Advanced Users)

#### Option A: Automated Setup
```bash
sudo ./scripts/server-setup.sh
```

#### Option B: Manual Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Environment Configuration

```bash
# Clone repository
git clone <your-repo-url>
cd orca-mvp

# Copy and configure production secrets
cp .env.secrets.example .env.secrets

# Generate secure passwords
openssl rand -base64 32  # For database passwords
openssl rand -hex 32     # For session secrets

# Edit .env.secrets with your production values:
# - POSTGRES_PASSWORD
# - REDIS_PASSWORD  
# - HELIUS_API_KEY
# - SESSION_SECRET
# - WEBHOOK_SECRET
```

### 3. Production Deployment

#### Option A: Automated Deployment
```bash
sudo ./scripts/deploy.sh production
```

#### Option B: Manual Deployment
```bash
# Deploy with Docker Compose
cd infra
docker-compose -f docker-compose.production.yml up -d --build

# Verify all services are healthy
docker-compose -f docker-compose.production.yml ps
```

### 4. SSL/TLS Configuration

```bash
# Automated SSL setup (included in deploy script)
sudo ./scripts/deploy.sh production

# Manual SSL setup
sudo certbot --nginx -d your-domain.com
sudo systemctl enable certbot.timer
```

### 5. Configure Helius Webhook

1. Go to [Helius Dashboard](https://dev.helius.xyz)
2. Create webhook with URL: `https://your-domain.com/webhook/helius`
3. Add filters for Orca program: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`
4. Configure webhook secret in your `.env.secrets` file

### 6. Backup Configuration

```bash
# Setup automated backups
sudo crontab -e

# Add backup schedule (daily at 2 AM)
0 2 * * * /opt/orca-mvp/scripts/backup.sh

# Test backup manually
sudo ./scripts/backup.sh
```

## 🔐 Environment Variables

### Production Secrets (.env.secrets)
```bash
# Database Passwords (generate with: openssl rand -base64 32)
POSTGRES_PASSWORD=your_secure_postgres_password_here
REDIS_PASSWORD=your_secure_redis_password_here

# Application Secrets (generate with: openssl rand -hex 32)
SESSION_SECRET=your_session_secret_64_chars_minimum
WEBHOOK_SECRET=your_webhook_signature_secret_32_chars

# API Keys
HELIUS_API_KEY=your_production_helius_api_key_from_dashboard

# Optional: Analytics & Monitoring
ANALYTICS_ID=your_google_analytics_id
SENTRY_DSN=your_sentry_project_dsn

# Optional: Backup Encryption
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key_here
```

### Backend Configuration (Automatic)
The backend automatically loads production settings from:
- `.env.production` (included in repo)
- `.env.secrets` (you create this)

### Frontend Configuration (Automatic)
The frontend uses:
- `.env.production` (included in repo)
- Environment-specific build optimizations

## 📊 Monitoring and Maintenance

### Check Application Status
```bash
# Overall system health
sudo ./scripts/health-check.sh

# Container status
docker-compose -f infra/docker-compose.production.yml ps

# Service logs
docker-compose -f infra/docker-compose.production.yml logs -f

# Individual service logs
docker logs orca-backend-prod
docker logs orca-postgres-prod
docker logs orca-redis-prod
docker logs orca-nginx-prod

# Nginx status
sudo systemctl status nginx
sudo nginx -t

# Resource usage
docker stats
htop
```

### Application Updates
```bash
# Automated update and deployment
git pull
sudo ./scripts/deploy.sh production

# Manual update process
git pull
cd infra
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

### Backup and Restore
```bash
# Create backup (automated)
sudo ./scripts/backup.sh

# Manual database backup
docker exec orca-postgres-prod pg_dump -U orca_user orcadata_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i orca-postgres-prod psql -U orca_user orcadata_prod < backup_file.sql
```

### Performance Monitoring
```bash
# Application metrics (production only)
curl https://your-domain.com/metrics

# Database performance
docker exec orca-postgres-prod psql -U orca_user -d orcadata_prod -c "SELECT * FROM pg_stat_activity;"

# Redis statistics
docker exec orca-redis-prod redis-cli info stats

# System performance
iostat -x 1
vmstat 1
free -h
df -h
```

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check container status
docker-compose -f infra/docker-compose.production.yml ps

# Check logs for errors
docker-compose -f infra/docker-compose.production.yml logs

# Check environment variables
sudo cat .env.secrets

# Restart all services
sudo ./scripts/deploy.sh production
```

#### Database Connection Issues
```bash
# Check database container
docker logs orca-postgres-prod

# Test database connection
docker exec orca-postgres-prod pg_isready -U orca_user

# Access database directly
docker exec -it orca-postgres-prod psql -U orca_user orcadata_prod

# Restart database
docker restart orca-postgres-prod
```

#### Performance Issues
```bash
# Check resource usage
docker stats
htop
iostat -x 1

# Check application metrics
curl https://your-domain.com/metrics

# Analyze slow queries
docker exec orca-postgres-prod psql -U orca_user -d orcadata_prod -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### SSL/HTTPS Issues
```bash
# Check SSL certificate
sudo certbot certificates

# Test SSL configuration
sudo nginx -t
ssl-cert-check -c /etc/letsencrypt/live/your-domain.com/fullchain.pem

# Renew SSL certificate
sudo certbot renew
```

#### Webhook Issues
```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/webhook/helius \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test" \
  -d '{"test": "data"}'

# Check webhook logs
docker logs orca-backend-prod | grep webhook
sudo tail -f /var/log/nginx/webhook_access.log
```

## 🔒 Security Best Practices

### Implemented Security Features
- ✅ **Rate Limiting**: API and webhook endpoints protected
- ✅ **CORS Configuration**: Proper cross-origin resource sharing
- ✅ **Security Headers**: Helmet.js with comprehensive security headers
- ✅ **SSL/TLS**: Automatic HTTPS with Let's Encrypt
- ✅ **Firewall**: UFW configured with minimal attack surface
- ✅ **Container Security**: Non-root users, read-only filesystems
- ✅ **Input Validation**: Request size limits and validation
- ✅ **Logging**: Comprehensive audit trails

### Additional Recommendations
1. **Secrets Management**: Use environment variables, never commit secrets
2. **Database Security**: Strong passwords, connection encryption
3. **Network Security**: VPC, private subnets, security groups
4. **Monitoring**: Set up intrusion detection and log analysis
5. **Updates**: Automated security updates for OS and dependencies
6. **Backups**: Encrypted, tested backup and restore procedures
7. **Access Control**: SSH key authentication, disable root login

## ⚡ Performance Optimizations

### Implemented Optimizations
- ✅ **Database**: Connection pooling, optimized PostgreSQL config
- ✅ **Caching**: Redis for session storage and API caching
- ✅ **Compression**: Gzip compression in Nginx
- ✅ **Frontend**: Code splitting, asset optimization, CDN-ready
- ✅ **Backend**: Clustered processes, graceful shutdowns
- ✅ **Monitoring**: Health checks, metrics endpoints

### Additional Optimizations
1. **CDN**: CloudFlare or AWS CloudFront for static assets
2. **Load Balancing**: Multiple application instances
3. **Database**: Read replicas for scaling reads
4. **Monitoring**: APM tools (New Relic, Datadog)
5. **Caching**: Application-level caching strategies

## 📞 Support and Maintenance

### Automated Tasks
- **Daily Backups**: Automated database and application backups
- **Log Rotation**: Automatic log cleanup and archival
- **Health Monitoring**: Continuous application health checks
- **SSL Renewal**: Automatic certificate renewal
- **Security Updates**: Automated OS security patches

### Manual Tasks
- **Dependency Updates**: Monthly review and update of npm packages
- **Performance Review**: Quarterly performance analysis
- **Security Audit**: Annual security review and penetration testing
- **Disaster Recovery**: Quarterly backup restore testing

### Getting Help
- **Application Logs**: `/var/log/orca/`
- **System Logs**: `/var/log/`
- **Health Check**: `https://your-domain.com/health`
- **Metrics**: `https://your-domain.com/metrics` (internal networks only)

---

## 🎉 Deployment Complete!

Your Orca MVP is now running in production with:
- 🔒 Enterprise-grade security
- 📊 Comprehensive monitoring
- 🚀 High-performance configuration
- 🔄 Automated backups and updates
- 📝 Complete audit trails

**Next Steps:**
1. Configure monitoring alerts
2. Set up external monitoring
3. Test disaster recovery procedures
4. Configure CI/CD pipeline
5. Plan for scaling

**Remember to:**
- Monitor application performance
- Keep dependencies updated
- Review logs regularly
- Test backup procedures
- Plan for growth and scaling