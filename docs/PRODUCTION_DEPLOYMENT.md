# Production Deployment - Hostinger VPS + Cloudflare

Complete guide for deploying BG-Bot to production on Hostinger VPS with Cloudflare Tunnel.

---

## Overview

This deployment uses:
- **GitHub** - Code repository + CI/CD (GitHub Actions)
- **Hostinger VPS** - Application hosting
- **MongoDB Atlas** - Cloud database (no local MongoDB on VPS)
- **Cloudflare Tunnel** - Secure HTTPS connection (no firewall needed)
- **Docker Compose** - Container orchestration
- **Nginx** - Reverse proxy

---

## Prerequisites

Before starting, ensure you have:

1. **GitHub Account** - For code repository
2. **Hostinger VPS** - With SSH access
3. **MongoDB Atlas** - Free cloud database
4. **Cloudflare Account** - Free tier works
5. **Custom Domain** - Pointing to Cloudflare (optional but recommended)
6. **Telegram Bot Token** - From [@BotFather](https://t.me/botfather)

---

## Stage 1: GitHub Repository Setup (15 minutes)

### 1.1 Create Repository

```bash
# Locally on your Mac:
cd ~/Documents/code/personal/bg-bot

git init
git add .
git commit -m "Initial commit: production-ready bg-bot"
git branch -M main

# Go to https://github.com/new and create a new repository
# Then:
git remote add origin https://github.com/YOUR_USERNAME/bg-bot.git
git push -u origin main
```

### 1.2 Verify .gitignore

Already configured to ignore `.env` files (secrets).

---

## Stage 2: Hostinger VPS Setup (1-2 hours)

### 2.1 Initial VPS Access

**Get from Hostinger Dashboard:**
- VPS IP address
- SSH port (usually 22)
- Username & password (or SSH key)

**Connect:**
```bash
ssh -p YOUR_PORT YOUR_USERNAME@YOUR_VPS_IP
```

### 2.2 Update System

```bash
# On VPS:
sudo apt update && sudo apt upgrade -y
```

### 2.3 Install Docker & Docker Compose

```bash
# Download and install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### 2.4 Clone Repository

```bash
# Still on VPS:
cd ~
git clone https://github.com/YOUR_USERNAME/bg-bot.git
cd bg-bot

# Create .env file (NOT gitignored, must create manually on VPS)
cat > .env << 'EOF'
# Telegram Bot Configuration
TELEGRAM_TOKEN=your_production_telegram_token_here
BOT_USERNAME=your_production_bot_username

# MongoDB Configuration (MUST use MongoDB Atlas - cloud, not local)
MONGO_URI=mongodb+srv://prod_username:prod_password@cluster0.mongodb.net/bg-bot?retryWrites=true&w=majority

# Environment
NODE_ENV=production
PORT=3001
WEBHOOK_MODE=true

# Optional
DEEPL_API_KEY=your_deepl_api_key_if_needed
ELEVENLABS_API_KEY=your_elevenlabs_api_key_if_needed
LOG_LEVEL=error
EOF

# Secure the .env file (readable only by owner)
chmod 600 .env

# OPTIONAL: Add to .env so you don't have to use -f flag every time
echo "COMPOSE_FILE=config/docker-compose.yml" >> .env
```

### 2.5 Build and Start Services

```bash
# Still on VPS in ~/bg-bot:
docker-compose -f config/docker-compose.yml build

# Stop any existing containers first
docker-compose -f config/docker-compose.yml down

# Start services
docker-compose -f config/docker-compose.yml up -d

# Verify services are running
docker-compose -f config/docker-compose.yml ps
docker-compose -f config/docker-compose.yml logs -f bg-bot
```

**If container name conflict:** Use `docker rm -f bg-bot-app` to force remove old container, then `docker-compose -f config/docker-compose.yml up -d`

**Expected output:** Bot starts and connects to MongoDB.

**Check health:**
```bash
curl http://localhost:3001/api/status
```

---

## Stage 3: Cloudflare Tunnel Setup (30 minutes)

Cloudflare Tunnel creates a secure HTTPS connection without needing firewall rules.

### 3.1 Install Cloudflared

```bash
# On VPS:
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb
```

### 3.2 Create Cloudflare Tunnel

```bash
# Log in to Cloudflare
cloudflared tunnel login

# Follow browser prompt to:
# 1. Log in to Cloudflare
# 2. Select your domain
# 3. Confirm authorization

# Create tunnel named "bg-bot"
cloudflared tunnel create bg-bot

# Save tunnel ID (you'll need it)
cloudflared tunnel list
# Output: Name     ID                                    Status
#         bg-bot   a1b2c3d4-e5f6-7890-abcd-ef1234567890  ...
```

### 3.3 Configure Tunnel

```bash
# Create config file
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: bg-bot
credentials-file: /home/YOUR_USERNAME/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3001
  - hostname: bot.your-domain.com
    service: http://localhost:3001
  - service: http_status:404
EOF
```

**Replace:**
- `YOUR_USERNAME` - Your VPS username
- `YOUR_TUNNEL_ID` - The ID from `cloudflared tunnel list`
- `your-domain.com` & `bot.your-domain.com` - Your actual domain

### 3.4 Make Tunnel Persistent

```bash
# Install as system service
sudo cloudflared service install

# Start and enable
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Verify
sudo systemctl status cloudflared
```

### 3.5 Create DNS Records (Cloudflare Dashboard)

1. **Log in to Cloudflare Dashboard**
2. **Select your domain**
3. **Go to DNS → Records**
4. **Add Record:**
   - Type: `CNAME`
   - Name: `bot` (or whatever subdomain you want)
   - Target: `YOUR_TUNNEL_ID.cfargotunnel.com`
   - Proxy Status: **Proxied** (orange cloud)
   - TTL: Auto
   - Save

**Result:** Your bot is now at `https://bot.your-domain.com`

---

## Stage 4: GitHub Actions CI/CD Setup (15 minutes)

Automatic deployment on every `git push`.

### 4.1 Generate SSH Key on VPS

```bash
# On VPS:
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions -N ""

# Get the private key (you'll need this)
cat ~/.ssh/github_actions

# Add public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
```

### 4.2 Add GitHub Secrets

1. **Go to GitHub** → Your repository
2. **Settings → Secrets and variables → Actions**
3. **Add these 6 secrets:**

| Secret Name | Value |
|------------|-------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | Your VPS username |
| `VPS_PORT` | SSH port (usually 22) |
| `VPS_SSH_KEY` | Output from `cat ~/.ssh/github_actions` (copy all) |
| `TELEGRAM_TOKEN` | Your bot token |
| `MONGO_URI` | Your MongoDB Atlas connection string |

### 4.3 Create GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Hostinger VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          port: ${{ secrets.VPS_PORT }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd ~/bg-bot
            git pull origin main
            
            # Update .env if needed (optional)
            # echo "TELEGRAM_TOKEN=${{ secrets.TELEGRAM_TOKEN }}" >> .env
            
            # Rebuild and restart
            docker-compose down
            docker-compose -f config/docker-compose.yml build --no-cache
            docker-compose -f config/docker-compose.yml up -d
            
            # Wait and check health
            sleep 10
            curl http://localhost:3001/api/status || exit 1
      
      - name: Notify deployment
        if: success()
        run: echo "✅ Deployment successful!"
```

### 4.4 Test Deployment

```bash
# Locally on Mac:
git add .
git commit -m "Test deployment"
git push origin main

# Watch GitHub Actions tab for deployment progress
# Go to: GitHub → Your repo → Actions tab
```

---

## Stage 5: Verification (15 minutes)

### 5.1 Test in Telegram

```
Open Telegram
Search for: @YOUR_BOT_NAME
Send: /start
```

Your bot should respond!

### 5.2 Test via API

```bash
# From your Mac:
curl https://bot.your-domain.com/api/status

# Should return:
# {"status":"ok","botUsername":"your_bot_name","environment":"production"}
```

### 5.3 Check VPS Logs

```bash
# SSH to VPS:
ssh -p YOUR_PORT YOUR_USERNAME@YOUR_VPS_IP
cd bg-bot
docker-compose logs -f bg-bot

# Should show: "Bot polling active" or similar
```

---

## Monitoring & Maintenance

### View Logs

```bash
# SSH to VPS, then:
docker-compose logs -f bg-bot          # Latest logs
docker-compose logs -f                 # All services
docker stats                           # Resource usage
```

### Update Application

```bash
# Locally on Mac:
git add .
git commit -m "Your changes"
git push origin main

# GitHub Actions automatically:
# 1. Connects to VPS
# 2. Pulls latest code
# 3. Rebuilds Docker image
# 4. Restarts containers
# Done! Changes live in ~2 minutes
```

### Manual Restart

```bash
# SSH to VPS:
cd ~/bg-bot
docker-compose restart bg-bot
```

### Backup MongoDB

Since you're using MongoDB Atlas, backups are automatic. But you can:

```bash
# Export data locally (optional)
# This requires mongodump tool, which is advanced
# MongoDB Atlas provides free snapshots
```

---

## Troubleshooting

### Bot not responding in Telegram

```bash
# SSH to VPS:
cd ~/bg-bot

# Check container status (use SERVICE NAME, not container name)
docker-compose ps

# View logs (use service name: bg-bot, not container name: bg-bot-app)
docker-compose logs bg-bot

# Fix docker-compose.yml if you see "version is obsolete" warning
sed -i '/^version:/d' config/docker-compose.yml

# Common error messages:
# - "Cannot find module" → Missing dependency (run: docker-compose build)
# - "TELEGRAM_TOKEN is not set" → .env file missing or not sourced
# - "MongoDB connection failed" → Check MONGO_URI and IP whitelist in MongoDB Atlas
# - "no such service: bg-bot-app" → Use service name 'bg-bot' not container name 'bg-bot-app'
# - "Exited with code 1" → Bot crashed, check logs for details

# Restart
docker-compose restart bg-bot

# Watch logs in real-time
docker-compose logs -f bg-bot
```

### Cloudflare tunnel not working

```bash
# SSH to VPS:
cloudflared tunnel list            # Check tunnel status
sudo journalctl -u cloudflared -f  # View tunnel logs
sudo systemctl restart cloudflared # Restart tunnel
```

### Cannot SSH to VPS

```bash
# Local Mac:
# 1. Verify IP address is correct
# 2. Verify port is correct
# 3. Check SSH key has right permissions
chmod 600 ~/.ssh/your_key

# Try again:
ssh -i ~/.ssh/your_key -p YOUR_PORT YOUR_USERNAME@YOUR_VPS_IP
```

### Docker out of disk space

```bash
# SSH to VPS:
docker system prune -a  # Remove unused images/containers
df -h                  # Check disk usage
```

### MongoDB connection failing

**Error: "bad auth: authentication failed"**

```bash
# SSH to VPS:
cd ~/bg-bot

# 1. Check current MONGO_URI
cat .env | grep MONGO_URI

# 2. Get your VPS IP to add to whitelist
curl ifconfig.me

# 3. Go to MongoDB Atlas and:
#    - Click your cluster → Connect
#    - Choose Drivers → Node.js
#    - Copy the connection string
#    - Replace <username> and <password> with ACTUAL credentials
#    - Verify the password doesn't have special characters that need escaping

# 4. Update .env on VPS:
nano .env
# Find MONGO_URI line, paste the correct connection string, save (Ctrl+X, Y, Enter)

# 5. Add VPS IP to MongoDB Atlas whitelist:
#    - Go to Network Access in MongoDB Atlas
#    - Add your VPS IP (from step 2)
#    - Wait ~5 minutes for changes to propagate

# 6. Restart the container:
docker-compose restart bg-bot

# 7. Check logs:
docker-compose logs -f bg-bot
```

**Common issues:**
- **Wrong password** - Verify it matches MongoDB Atlas user credentials
- **IP not whitelisted** - Add your VPS IP to MongoDB Atlas Network Access
- **Special characters in password** - URI encode special chars: `@` → `%40`, `:` → `%3A`
- **Wrong cluster** - Ensure the cluster name in URI matches your MongoDB Atlas cluster

---

## Security Checklist

Before going live, verify:

**Code & Credentials:**
- [ ] `.env` file NOT in Git (check `.gitignore`)
- [ ] No hardcoded credentials in code
- [ ] No credentials in commit history (`git log`)

**GitHub Security:**
- [ ] GitHub Secrets configured (not in logs)
- [ ] Repository is private (or secrets-only)
- [ ] Branch protection enabled on `main`

**Server Security:**
- [ ] SSH key permissions: `chmod 600`
- [ ] SSH password authentication disabled
- [ ] Firewall allows only ports 22, 80, 443
- [ ] System updates installed

**Database Security:**
- [ ] MongoDB user has minimal permissions
- [ ] IP whitelist configured (not `0.0.0.0/0`)
- [ ] Strong password (16+ characters)
- [ ] Connection uses SSL/TLS

**API Security:**
- [ ] HTTPS enforced (Cloudflare)
- [ ] Rate limiting configured (optional)
- [ ] Tokens rotated regularly

---

## Quick Reference Commands

```bash
# Deploy
git push origin main

# SSH to VPS
ssh -p YOUR_PORT YOUR_USERNAME@YOUR_VPS_IP

# View logs (on VPS)
docker-compose logs -f

# Restart services (on VPS)
docker-compose restart

# Check health (from Mac)
curl https://bot.your-domain.com/api/status

# Check tunnel status (on VPS)
cloudflared tunnel list
```

---

## Next Steps

Once deployed:

1. **Test thoroughly** in Telegram
2. **Monitor logs** for errors: `docker-compose logs -f`
3. **Set up monitoring** (optional) - Use UptimeRobot, StatusPage, etc.
4. **Document your setup** - Keep notes on VPS IP, domain, etc.
5. **Backup secrets** - Store `.env` values securely (password manager)
6. **Plan updates** - Establish how to deploy new features

---

## Still Need Help?

- **Configuration issues?** → See [Configuration](CONFIGURATION.md)
- **Local development?** → See [Local Development](LOCAL_DEVELOPMENT.md)
- **Quick reference?** → See [Quick Start](QUICK_START.md)
