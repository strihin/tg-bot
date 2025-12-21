# BG-Bot Deployment Guide

Complete guide for deploying BG-Bot to Hostinger VPS with Cloudflare Tunnel.

## Overview

This deployment uses:
- **GitHub**: Code repository + CI/CD (GitHub Actions)
- **Hostinger VPS**: Application hosting
- **Cloudflare Tunnel**: Secure, no-firewall-needed connection to your domain
- **Docker Compose**: Container orchestration
- **Nginx**: Reverse proxy + web server

---

## Stage 1: Initialize Git Repository

### 1.1 Create GitHub Repository

```bash
# Create new repo on github.com (don't initialize with README)
# Then run locally:
cd ~/Documents/code/personal/bg-bot
git init
git add .
git commit -m "Initial commit: bg-bot with stress marks and MongoDB Atlas"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bg-bot.git
git push -u origin main
```

### 1.2 Setup .gitignore (if not exists)

```bash
cat > .gitignore << 'EOF'
# Environment
.env
.env.local
.env.*.local
.env.production

# API Keys (add new files containing secrets)
certs/
keys/

# Dependencies
node_modules/
dist/
build/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
.vscode
.idea

# Docker
.dockerignore
EOF

git add .gitignore
git commit -m "Add .gitignore"
git push
```

---

## Stage 2: Hostinger VPS Setup

### 2.1 Initial VPS Access

**Get from Hostinger Dashboard:**
- VPS IP address
- SSH port (usually 22)
- Root/user credentials
- SSH key (if available)

**Connect to VPS:**
```bash
ssh -p YOUR_PORT YOUR_USERNAME@YOUR_VPS_IP

# Or with SSH key:
ssh -i ~/.ssh/your_key -p YOUR_PORT YOUR_USERNAME@YOUR_VPS_IP
```

### 2.2 Install Docker & Docker Compose

```bash
# SSH into VPS, then:

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2.3 Clone Repository on VPS

```bash
# Still SSH'd into VPS:

# Generate SSH key for GitHub (optional, for auto-pulls)
ssh-keygen -t ed25519 -C "vps@hostinger"

# Add public key to GitHub Settings → SSH Keys

# Clone repository
cd ~
git clone https://github.com/YOUR_USERNAME/bg-bot.git
cd bg-bot

# Create .env file with production values
cat > .env << 'EOF'
# Telegram Bot Configuration
TELEGRAM_TOKEN=YOUR_TELEGRAM_TOKEN
BOT_USERNAME=YOUR_BOT_NAME

# MongoDB Configuration
MONGO_URI=mongodb+srv://bulgarian_bot:YOUR_PASSWORD@cluster0.zkjt23i.mongodb.net/bulgarian-bot?retryWrites=true&w=majority

# Environment
NODE_ENV=production

# API Keys
DEEPL_API_KEY=YOUR_DEEPL_KEY
EOF

# Important: Keep .env secure
chmod 600 .env
```

### 2.4 Start Services

```bash
# Build and start all containers
docker-compose build
docker-compose up -d

# Verify services
docker-compose ps
docker-compose logs -f bg-bot

# Test health endpoint
curl http://localhost:3000/api/status
```

---

## Stage 3: Cloudflare Tunnel Setup

### 3.1 Install Cloudflare Tunnel

```bash
# SSH into VPS:

# Install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Authenticate
cloudflared tunnel login

# Follow browser prompt to login to Cloudflare account
```

### 3.2 Create Tunnel

```bash
# On VPS:

# Create tunnel named "bg-bot"
cloudflared tunnel create bg-bot

# Get tunnel ID (save this!)
cloudflared tunnel list

# Create config file
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: bg-bot
credentials-file: /home/YOUR_USERNAME/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Run tunnel
cloudflared tunnel run bg-bot
```

### 3.3 Create DNS Record in Cloudflare

1. Go to **Cloudflare Dashboard**
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add Record**
   - **Type**: `CNAME`
   - **Name**: `bot` (or your subdomain)
   - **Target**: `YOUR_TUNNEL_ID.cfargotunnel.com`
   - **Proxy Status**: `Proxied` (orange cloud)
5. Click **Save**

Now your bot is accessible at: `https://bot.your-domain.com`

### 3.4 Make Tunnel Persistent (systemd service)

```bash
# SSH into VPS:

sudo cloudflared service install --token YOUR_TOKEN
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Verify
sudo systemctl status cloudflared
```

---

## Stage 4: GitHub Actions CI/CD Setup

### 4.1 Add GitHub Secrets

1. Go to GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `VPS_HOST`: Your VPS IP address
   - `VPS_USER`: Your VPS username
   - `VPS_PORT`: SSH port (usually 22)
   - `VPS_SSH_KEY`: Private SSH key (generate on VPS, copy content)
   - `TELEGRAM_TOKEN`: Your Telegram bot token
   - `MONGO_URI`: MongoDB connection string

### 4.2 Deploy Workflow

The `.github/workflows/deploy.yml` file is already created.

**How it works:**
1. You push code to `main` branch
2. GitHub Actions automatically:
   - SSH into VPS
   - Pulls latest code
   - Rebuilds Docker images
   - Restarts containers
   - Verifies health

**Manual deployment:**
```bash
# Push changes to main
git add .
git commit -m "Your message"
git push origin main

# Watch deployment on GitHub Actions tab
```

---

## Stage 5: Test Telegram Bot

Once everything is deployed:

1. **Test via Telegram:**
   ```
   @YOUR_BOT_NAME start
   ```

2. **Test via API:**
   ```bash
   curl https://bot.your-domain.com/api/status
   ```

3. **Monitor logs on VPS:**
   ```bash
   ssh YOUR_USERNAME@YOUR_VPS_IP
   cd bg-bot
   docker-compose logs -f bg-bot
   ```

---

## Troubleshooting

### Bot not responding in Telegram
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs bg-bot

# Restart
docker-compose restart bg-bot
```

### Cloudflare tunnel not working
```bash
# Check tunnel status
cloudflared tunnel list

# View tunnel logs
sudo journalctl -u cloudflared -f
```

### Cannot SSH into VPS
- Verify IP and port
- Check firewall allows port 22
- Verify SSH key permissions: `chmod 600 ~/.ssh/your_key`

### MongoDB connection failing
- Verify connection string in `.env`
- Check IP whitelist in MongoDB Atlas
- Confirm credentials are correct

---

## Monitoring & Maintenance

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f bg-bot

# Real-time monitoring
docker stats
```

### Update application
```bash
# SSH into VPS, then:
cd ~/bg-bot
git pull origin main
docker-compose build
docker-compose up -d
```

### Backup data
```bash
# Backup MongoDB (if using local MongoDB)
docker-compose exec mongodb mongodump --out /data/db/backup

# Or just backup .env and data/ locally
scp -r YOUR_USERNAME@YOUR_VPS_IP:~/bg-bot/data ./backup/
```

---

## Quick Reference

**Common commands:**
```bash
# Deploy (from local machine)
git push origin main

# SSH into VPS
ssh -p YOUR_PORT YOUR_USERNAME@YOUR_VPS_IP

# View logs (on VPS)
docker-compose logs -f bg-bot

# Restart services (on VPS)
docker-compose restart

# Check health (anywhere)
curl https://bot.your-domain.com/api/status
```

---

## Security Checklist

- [ ] `.env` file not committed to Git
- [ ] SSH key has 600 permissions
- [ ] MongoDB user has minimal required permissions
- [ ] Firewall allows only necessary ports (22, 80, 443)
- [ ] Telegram token not exposed in logs
- [ ] HTTPS enabled (Cloudflare provides this)
- [ ] Regular backups configured
- [ ] Monitoring/alerts set up (optional)

---

**Questions?** Check logs first: `docker-compose logs -f`
