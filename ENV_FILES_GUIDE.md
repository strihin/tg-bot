# .env Files Reference Guide

Complete overview of all environment configuration files in the project.

---

## Overview

| File | Purpose | Should Commit | Description |
|------|---------|--------------|-------------|
| `.env.example` | Template for main config | ✅ YES | Shows all available variables for local/prod setup |
| `.env.dev.example` | Template for dev setup | ✅ YES | Development environment with real credentials placeholder |
| `.env.mongodb.example` | Template for MongoDB | ✅ YES | Local MongoDB Docker credentials |
| `.env.prod.bak.example` | Template for prod backup | ✅ YES | Production configuration reference (DO NOT USE) |
| `.env` | Main config (local/prod) | ❌ NO | Your actual credentials - git ignored |
| `.env.dev` | Dev credentials | ❌ NO | Development bot credentials - git ignored |
| `.env.mongodb` | Local MongoDB creds | ❌ NO | Local MongoDB credentials - git ignored |
| `.env.prod.bak` | Production backup | ❌ NO | Production credentials backup - git ignored |

---

## When to Use Each

### `.env.example` → `.env`

**When:** Every environment (local + production)  
**Purpose:** Main application configuration

**Usage:**
```bash
cp .env.example .env
nano .env  # Fill in your values
```

**Contents:**
- TELEGRAM_TOKEN (required)
- BOT_USERNAME (required)
- MONGO_URI (required)
- NODE_ENV (required)
- Optional: DEEPL_API_KEY, ELEVENLABS_API_KEY

---

### `.env.dev.example` → `.env.dev`

**When:** Local development only  
**Purpose:** Development bot credentials reference

**Usage:**
```bash
cp .env.dev.example .env.dev
nano .env.dev  # Fill in your development bot token
```

**Contents:**
- TELEGRAM_TOKEN (dev bot)
- BOT_USERNAME (dev bot)
- MONGO_URI (can be Atlas or Docker)
- NODE_ENV=development
- WEBHOOK_MODE=false (polling for local)
- PORT=3001

**Note:** Optional - use `.env` instead if you prefer

---

### `.env.mongodb.example` → `.env.mongodb`

**When:** Local development with Docker MongoDB only  
**Purpose:** MongoDB Docker container initialization

**Usage:**
```bash
cp .env.mongodb.example .env.mongodb
nano .env.mongodb  # Set your local MongoDB user/password
```

**Contents:**
- MONGO_INITDB_ROOT_USERNAME
- MONGO_INITDB_ROOT_PASSWORD
- MONGO_INITDB_DATABASE=bg-bot

**Note:**
- Only used if running MongoDB in Docker locally
- NOT needed on Hostinger VPS (use MongoDB Atlas)
- Referenced by `docker-compose.yml` for MongoDB service
- Connection string in `.env` should be: `mongodb://localhost:27017/bg-bot`

---

### `.env.prod.bak.example` → `.env.prod.bak`

**When:** Production backup/reference only  
**Purpose:** Keep production configuration as backup (DO NOT USE DIRECTLY)

**Usage:**
```bash
cp .env.prod.bak.example .env.prod.bak
# Edit with your PRODUCTION values (for reference/backup only)
# DO NOT use this file directly - create .env on VPS instead
```

**Contents:**
- All production environment variables
- Same structure as `.env` but for production

**Important:**
- ⚠️ DO NOT deploy using this file
- ⚠️ Use this only as a reference/backup
- ⚠️ Create `.env` directly on VPS via SSH
- ⚠️ Keep this backed up securely (password manager)

---

## Complete Setup Workflow

### Local Development (MongoDB Atlas)

```bash
# 1. Copy main template
cp .env.example .env

# 2. Edit with your values
nano .env
# TELEGRAM_TOKEN=your_dev_token
# BOT_USERNAME=your_dev_bot
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db-name
# NODE_ENV=development

# 3. Run
npm install
npm run build
npm start
```

### Local Development (Docker MongoDB)

```bash
# 1. Copy main template
cp .env.example .env

# 2. Copy MongoDB template
cp .env.mongodb.example .env.mongodb

# 3. Edit both files
nano .env
# TELEGRAM_TOKEN=your_dev_token
# MONGO_URI=mongodb://devuser:devpass@localhost:27017/bg-bot
# NODE_ENV=development

nano .env.mongodb
# MONGO_INITDB_ROOT_USERNAME=devuser
# MONGO_INITDB_ROOT_PASSWORD=devpass

# 4. Run with Docker
docker-compose up --build
```

### Production Deployment (Hostinger)

```bash
# 1. SSH to VPS
ssh -p PORT USERNAME@VPS_IP

# 2. Clone repository
cd ~
git clone https://github.com/YOUR_USERNAME/bg-bot.git
cd bg-bot

# 3. Create .env directly on VPS (NOT from .env.prod.bak)
cat > .env << 'EOF'
TELEGRAM_TOKEN=your_production_token
BOT_USERNAME=your_production_bot
MONGO_URI=mongodb+srv://prod_user:prod_pass@cluster0.xxxxx.mongodb.net/gb-bot
NODE_ENV=production
WEBHOOK_MODE=true
PORT=3001
EOF

chmod 600 .env

# 4. DO NOT create .env.prod.bak or .env.mongodb on VPS
# 5. Use MongoDB Atlas (cloud) only - no local MongoDB on VPS

# 6. Start services
docker-compose up -d
```

---

## Security Rules

### DO COMMIT ✅
- `.env.example`
- `.env.dev.example`
- `.env.mongodb.example`
- `.env.prod.bak.example`
- `.gitignore` (which excludes actual .env files)

### DO NOT COMMIT ❌
- `.env` (actual credentials)
- `.env.dev` (dev credentials)
- `.env.mongodb` (local MongoDB credentials)
- `.env.prod.bak` (production credentials)

### Verify in `.gitignore`
```bash
cat .gitignore | grep -E "^\.env"
```

Expected output:
```
.env
.env.local
.env.*.local
.env.production
.env.dev
.env.mongodb
.env.prod.bak
```

---

## Environment Variable Reference

### Telegram Configuration
```bash
TELEGRAM_TOKEN=your_bot_token_from_botfather
BOT_USERNAME=your_bot_username_without_@
```

### MongoDB Configuration
```bash
# Option 1: MongoDB Atlas (cloud) - Recommended
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/db-name?retryWrites=true&w=majority

# Option 2: Local MongoDB (Docker only)
MONGO_URI=mongodb://username:password@localhost:27017/db-name

# Option 3: Docker MongoDB service in compose
MONGO_URI=mongodb://username:password@mongodb:27017/db-name
```

### Optional APIs
```bash
DEEPL_API_KEY=your_deepl_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Deployment
```bash
NODE_ENV=development        # or: production
WEBHOOK_MODE=false          # false=polling (local), true=webhook (VPS)
PORT=3001                   # Internal port
VPS_IP=your.vps.ip.address  # Reference only
```

---

## Common Tasks

### Update .env variables

```bash
# Local
nano .env
npm run dev  # Auto-restarts on changes

# VPS (via SSH)
ssh -p PORT USERNAME@VPS_IP
cd ~/bg-bot
nano .env
docker-compose restart
```

### Create backup of .env

```bash
# Local
cp .env .env.backup

# VPS
ssh -p PORT USERNAME@VPS_IP
cd ~/bg-bot
cp .env .env.backup
scp -P PORT USERNAME@VPS_IP:~/bg-bot/.env.backup ./
```

### Verify .env is working

```bash
# Test MongoDB connection
node -e "
const { MongoClient } = require('mongodb');
new MongoClient(process.env.MONGO_URI).connect()
  .then(() => console.log('✅ Connected'))
  .catch(e => console.log('❌ Error:', e.message))
"

# Test Telegram token
npm run build && npm start
# Should show: "Bot polling active" or "Bot listening"
```

---

## Troubleshooting

### ".env not found" error

```bash
# Make sure file exists
ls -la .env

# If missing, create from template
cp .env.example .env
nano .env  # Add your values
```

### "MONGO_URI is not set"

```bash
# Check if .env exists
cat .env | grep MONGO_URI

# If empty or missing, add it
echo "MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db" >> .env
```

### "Cannot connect to MongoDB"

```bash
# Verify connection string format
# mongodb+srv://USERNAME:PASSWORD@HOST/DATABASE

# Check MongoDB Atlas IP whitelist
# Add your IP or use 0.0.0.0/0 for dev

# Verify credentials
# Check Database Access user exists with correct password
```

### "TELEGRAM_TOKEN invalid"

```bash
# Get new token from @BotFather
# https://t.me/botfather

# Update in .env
nano .env
# TELEGRAM_TOKEN=new_token_here

# Restart bot
npm run dev  # or docker-compose restart
```

---

## File Sizes and Examples

```bash
ls -lh .env*

# Output:
# .env.example              65 lines
# .env.dev.example          45 lines
# .env.mongodb.example      10 lines
# .env.prod.bak.example     45 lines
#
# .env                      (your values)
# .env.dev                  (your dev values)
# .env.mongodb              (your local MongoDB values)
# .env.prod.bak             (your prod backup)
```

---

## Summary

- **Always copy from `.*.example` files** - They are safe to share
- **Never commit actual `.env` files** - They contain secrets
- **Use `.env` for local and production** - Updated per environment
- **Use `.env.dev.example` for development reference**
- **Use `.env.mongodb.example` only for Docker MongoDB locally**
- **Use `.env.prod.bak.example` only as reference/backup**
- **Always `chmod 600 .env`** - Make files read-only for owner

Need help? See [CONFIGURATION.md](CONFIGURATION.md) for complete variable reference.
