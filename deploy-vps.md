# VPS Deployment Guide (Self-Hosted)

## Prerequisites
- VPS with Ubuntu/Debian (DigitalOcean, AWS, etc.)
- SSH access to your VPS
- Domain name (optional)

## Steps

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

### 2. Clone and Setup
```bash
# Clone your repository
git clone <your-repo-url>
cd amul-stock-bot

# Install dependencies
npm install

# Build the project
npm run build

# Create environment file
cp .env.example .env
nano .env  # Edit with your credentials
```

### 3. Configure PM2
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'amul-stock-bot',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 4. Setup Nginx (Optional, for web interface)
```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/amul-bot

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/amul-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Monitoring
```bash
# View logs
pm2 logs amul-stock-bot

# Monitor processes
pm2 monit

# Restart if needed
pm2 restart amul-stock-bot
```

## Advantages of VPS
- Full control over your server
- No usage limits
- Can run multiple bots
- More cost-effective for long-term use 