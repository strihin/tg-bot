# Configuration Guide

Complete reference for all environment variables and configuration options.

## File Organization

| File | Purpose | In Git | When to Use |
|------|---------|--------|------------|
| `.env.example` | Template showing all variables | ✅ YES | Reference only |
| `.env.mongodb.example` | Template for local MongoDB | ✅ YES | Reference only |
| `.env` | Your actual config (local/prod) | ❌ NO | Development or VPS |
| `.env.dev` | Dev credentials if needed | ❌ NO | Optional |
| `.env.mongodb` | Local MongoDB credentials | ❌ NO | Only with Docker MongoDB |

**Golden Rule:** Never commit actual `.env` files. They're gitignored for security.

---

## Core Variables (Required)

### Telegram Configuration

```bash
# Your Telegram Bot token from @BotFather
# Get it: https://t.me/botfather → /newbot
TELEGRAM_TOKEN=<your_telegram_bot_token>

# Your bot's username (without @)
# Example: if bot is @bulgarian_bot, use: bulgarian_bot
BOT_USERNAME=<your_bot_username>
```

### MongoDB Configuration

```bash
# MongoDB connection string
# 
# Option 1: MongoDB Atlas (Cloud) - Recommended
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<db-name>?retryWrites=true&w=majority

# Option 2: Local MongoDB (if using Docker)
MONGO_URI=mongodb://<username>:<password>@localhost:27017/bg-bot

# Format breakdown:
# mongodb+srv://USER:PASSWORD@HOST/DATABASE?OPTIONS
#
# Get from MongoDB Atlas:
# 1. Dashboard → Click "Connect"
# 2. Choose "Connect your application"
# 3. Copy connection string
# 4. Replace <username> and <password> with your database user credentials
```

### Environment Type

```bash
# development = Local machine with debug output
# production = VPS with minimal logging
NODE_ENV=development  # or: production
```

---

## Network & Hosting

### Local Development

```bash
# Port for local web server
# Access at: http://localhost:PORT
PORT=3001

# Webhook mode (polling vs webhook)
# false = polling (local development)
# true = webhook (production on VPS)
WEBHOOK_MODE=false
```

### Production (Hostinger VPS)

```bash
# Port (internal, reverse proxied by Nginx)
PORT=3001

# Enable webhook mode (required for production)
WEBHOOK_MODE=true

# Your domain name
VPS_DOMAIN=<your-domain.com>

# Your VPS public IP (reference only)
VPS_IP=<your_vps_public_ip>
```

---

## Optional Features

### Translation API (DeepL)

```bash
# Optional: For translation features
# Get key: https://www.deepl.com/pro
# Free tier gives 500,000 characters/month
DEEPL_API_KEY=your_deepl_api_key
```

### Audio/Text-to-Speech (ElevenLabs)

```bash
# Optional: For audio pronunciation
# Get key: https://elevenlabs.io
# Free tier: ~1000 characters/month
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Logging

```bash
# Log level: debug, info, warn, error
# Use 'debug' for development, 'error' for production
LOG_LEVEL=debug  # or: info, warn, error
```

---

## Local Setup Examples

### Example 1: MongoDB Atlas (Recommended)

**Local machine `.env`:**
```bash
# Telegram
TELEGRAM_TOKEN=<your_telegram_token_here>
BOT_USERNAME=bulgarian_bot_test

# MongoDB Atlas (cloud)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bg-bot?retryWrites=true&w=majority

# Local dev
NODE_ENV=development
PORT=3001
WEBHOOK_MODE=false
```

### Example 2: Docker + Local MongoDB

**`.env`:**
```bash
TELEGRAM_TOKEN=<your_telegram_token_here>
BOT_USERNAME=bulgarian_bot_test
MONGO_URI=mongodb://<username>:<password>@localhost:27017/bg-bot
NODE_ENV=development
PORT=3001
WEBHOOK_MODE=false
```

**`.env.mongodb`:**
```bash
MONGO_INITDB_ROOT_USERNAME=<your_mongo_username>
MONGO_INITDB_ROOT_PASSWORD=<your_mongo_password>
MONGO_INITDB_DATABASE=bg-bot
```

---

## Production Setup (Hostinger VPS)

### .env on VPS

```bash
# Telegram (production bot token)
TELEGRAM_TOKEN=<your_production_telegram_token>
BOT_USERNAME=<your_production_bot_name>

# MongoDB Atlas (NEVER local on VPS)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<prod-db>

# Production
NODE_ENV=production
PORT=3001
WEBHOOK_MODE=true

# Domain
VPS_DOMAIN=<your-domain.com>
```

**⚠️ Security Notes:**
- `.env` should **NOT** be in Git (it's gitignored)
- Create `.env` directly on VPS by editing the file
- Use strong passwords for MongoDB
- Restrict MongoDB Atlas IP whitelist (not `0.0.0.0/0`)
- Store secrets in GitHub Secrets for CI/CD, not in code

---

## Quick Decision Tree

```
Local development on Mac?
├─ Using MongoDB Atlas (cloud)?
│  └─ .env with MONGO_URI=mongodb+srv://...
│
├─ Using Docker + Local MongoDB?
│  ├─ .env with MONGO_URI=mongodb://localhost:27017/...
│  └─ .env.mongodb with MONGO_INITDB_ROOT_USERNAME=...
│
└─ Run: npm start or npm run dev

Setting up Hostinger VPS?
├─ SSH to VPS
├─ Create .env with production values
├─ NEVER create .env.mongodb on VPS (use MongoDB Atlas only)
└─ Run: docker-compose up -d
```

---

## Debugging Configuration Issues

### Check if variables are loaded:

```bash
# Option 1: Node.js REPL
node -e "console.log('TELEGRAM_TOKEN:', process.env.TELEGRAM_TOKEN)"

# Option 2: In code
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI ? '✓ set' : '✗ missing'
});
```

### Common mistakes:

| Issue | Fix |
|-------|-----|
| TELEGRAM_TOKEN not recognized | Restart bot after editing `.env` |
| MONGO_URI not found | `.env` file missing or in wrong directory |
| Port already in use | Change PORT=3002 or kill process on 3001 |
| MongoDB Auth Failed | Wrong username/password in connection string |

---

## Environment Variable Checklist

### Minimal Setup (to run locally)
- [ ] TELEGRAM_TOKEN set
- [ ] BOT_USERNAME set
- [ ] MONGO_URI set and working
- [ ] NODE_ENV=development
- [ ] .env file exists in project root

### Full Setup (all features)
- [ ] All above ✓
- [ ] DEEPL_API_KEY set (optional)
- [ ] ELEVENLABS_API_KEY set (optional)
- [ ] LOG_LEVEL configured

### Production Setup (VPS)
- [ ] All minimal + full ✓
- [ ] NODE_ENV=production
- [ ] WEBHOOK_MODE=true
- [ ] MONGO_URI points to MongoDB Atlas (not localhost)
- [ ] VPS_DOMAIN set
- [ ] Credentials are strong passwords
- [ ] IP whitelist configured in MongoDB

---

## Security Best Practices

1. **Never share `.env`** - It contains secrets
2. **Rotate tokens regularly** - If exposed, regenerate immediately
3. **Use strong passwords** - Minimum 16 characters for MongoDB
4. **Whitelist MongoDB IPs** - Don't use `0.0.0.0/0` in production
5. **Store secrets in GitHub Secrets** - For CI/CD pipelines, not in code
6. **Use environment variables** - Never hardcode credentials
7. **Log carefully** - Don't log token or password values

---

## More Help

- **Having issues?** → Check [Local Development](LOCAL_DEVELOPMENT.md) troubleshooting
- **Deploying?** → See [Production Deployment](PRODUCTION_DEPLOYMENT.md)
- **Getting started?** → Try [Quick Start](QUICK_START.md)
