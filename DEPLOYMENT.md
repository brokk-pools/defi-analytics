# Deployment Guide

This guide covers deploying the Orca Whirlpools MVP to a VPS.

## VPS Requirements

- Ubuntu 20.04+ or Debian 11+
- 2GB RAM minimum (4GB recommended)
- 20GB storage
- Public IP address
- Domain name (optional but recommended)

## Step-by-Step Deployment

### 1. Server Setup

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

# Install Nginx (for frontend serving)
sudo apt install nginx -y
```

### 2. Clone and Setup Project

```bash
# Clone repository
git clone <your-repo-url>
cd orca-mvp

# Set up environment files
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

### 3. Database Setup

```bash
# Start PostgreSQL with Docker Compose
cd infra
docker compose up -d

# Verify database is running
docker compose ps
```

### 4. Backend Deployment

```bash
cd ../backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start backend with PM2
pm2 start dist/index.js --name "orca-backend"
pm2 startup
pm2 save
```

### 5. Frontend Deployment

```bash
cd ../frontend

# Install dependencies
npm install

# Build for production
npm run build

# Copy build files to nginx directory
sudo cp -r dist/* /var/www/html/

# Configure Nginx
sudo tee /etc/nginx/sites-available/orca-mvp > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    root /var/www/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/orca-mvp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Configuration (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 7. Firewall Configuration

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5432  # PostgreSQL (if needed externally)
sudo ufw enable
```

### 8. Configure Helius Webhook

1. Go to [Helius Dashboard](https://dev.helius.xyz)
2. Create webhook with URL: `https://your-domain.com/webhook/helius`
3. Add filters for Orca program: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`

## Environment Variables for Production

### Backend (.env)
```bash
PORT=3001
NODE_ENV=production
HELIUS_API_KEY=your_production_helius_key
HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
DATABASE_URL=postgres://orca:orca@localhost:5432/orcadata
ORCA_WHIRLPOOLS_PROGRAM_ID=whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc
```

### Frontend (.env)
```bash
VITE_API_URL=https://your-domain.com
```

## Monitoring and Maintenance

### Check Application Status
```bash
# Backend status
pm2 status
pm2 logs orca-backend

# Database status
docker compose ps
docker compose logs db

# Nginx status
sudo systemctl status nginx
sudo nginx -t
```

### Update Application
```bash
# Pull latest changes
git pull

# Update backend
cd backend
npm install
npm run build
pm2 restart orca-backend

# Update frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/html/
```

### Backup Database
```bash
# Create backup
docker exec -t orca-mvp-db-1 pg_dump -c -U orca orcadata > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i orca-mvp-db-1 psql -U orca orcadata < backup_file.sql
```

## Troubleshooting

### Backend Issues
```bash
# Check logs
pm2 logs orca-backend

# Restart backend
pm2 restart orca-backend

# Check if port is in use
sudo netstat -tlnp | grep :3001
```

### Database Issues
```bash
# Check database container
docker compose logs db

# Access database directly
docker exec -it orca-mvp-db-1 psql -U orca orcadata

# Restart database
cd infra
docker compose restart db
```

### Frontend Issues
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Webhook Issues
```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/webhook/helius \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check backend logs for webhook events
pm2 logs orca-backend | grep webhook
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to git
2. **Database**: Use strong passwords and restrict access
3. **Firewall**: Only open necessary ports
4. **SSL**: Always use HTTPS in production
5. **Updates**: Keep system and dependencies updated
6. **Backups**: Regular database backups
7. **Monitoring**: Set up log monitoring and alerts

## Performance Optimization

1. **Backend**: Use connection pooling for database
2. **Frontend**: Enable gzip compression in Nginx
3. **Database**: Add indexes for frequently queried fields
4. **Caching**: Implement Redis for API caching
5. **CDN**: Use CDN for static assets