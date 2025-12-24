# Start Here - Deployment Overview

Welcome! This guide helps you choose the right path for your needs.

---

## 🎯 Choose Your Path

### Just Want to Try It? (5 minutes)
→ **[Quick Start](QUICK_START.md)**

Get the bot running locally in 5 minutes with minimal setup.

### Developing Locally? (30 minutes)
→ **[Local Development](LOCAL_DEVELOPMENT.md)**

Complete guide for developing on your Mac with Docker optional.

### Ready for Production? (2-3 hours)
→ **[Production Deployment](PRODUCTION_DEPLOYMENT.md)**

Deploy to Hostinger VPS with Cloudflare Tunnel + automatic CI/CD.

### Need to Configure Stuff? (Reference)
→ **[Configuration](CONFIGURATION.md)**

Complete reference for all environment variables.

---

## 📋 Quick Decision Tree

```
What do you want to do?

├─ Try the bot right now
│  └─ Go to: QUICK_START.md
│
├─ Develop features locally
│  └─ Go to: LOCAL_DEVELOPMENT.md
│
├─ Deploy to production (Hostinger)
│  └─ Go to: PRODUCTION_DEPLOYMENT.md
│
└─ Configure environment variables
   └─ Go to: CONFIGURATION.md
```

---

```bash
npm install
npm run build
npm start
```

**Done in 5 minutes!** Test in Telegram.

---

## 🚀 Production Deployment Overview (2-3 hours)

If deploying to Hostinger VPS:

1. **GitHub** - Create repository
2. **VPS Setup** - Install Docker, clone code, create `.env`
3. **Cloudflare** - Set up tunnel for HTTPS
4. **CI/CD** - Configure automatic deployment
5. **Verify** - Test everything

See [Production Deployment](PRODUCTION_DEPLOYMENT.md) for detailed steps.

---

## 📚 Documentation Files

```
README.md                       # Project overview & features
├─ QUICK_START.md              # Fastest path (5 min)
├─ LOCAL_DEVELOPMENT.md        # Local setup (30 min)
├─ PRODUCTION_DEPLOYMENT.md    # VPS setup (2-3 hours)
├─ CONFIGURATION.md            # Environment variables
└─ START_HERE.md               # This file (navigation)
```

---

## 🔧 Common Commands

**Local:**
```bash
npm run dev           # Auto-reload development
npm start            # Run bot
npm run build        # Compile TypeScript
docker-compose up    # With Docker MongoDB
```

**Production (on VPS):**
```bash
docker-compose logs -f     # View logs
docker-compose restart     # Restart services
git pull && docker-compose up -d  # Manual update
```

**Deployment:**
```bash
git push origin main  # Auto-deploys via GitHub Actions
```

---

## 📋 Reading Order

**First Time?**
1. This file (you are here)
2. [Quick Start](QUICK_START.md) or [Local Development](LOCAL_DEVELOPMENT.md)
3. Try the bot!

**Going to Production?**
1. [Local Development](LOCAL_DEVELOPMENT.md) - confirm it works locally
2. [Production Deployment](PRODUCTION_DEPLOYMENT.md) - step by step
3. [Configuration](CONFIGURATION.md) - reference as needed

---

## 🎯 Next Steps

Pick one:

1. **Try it now** → [Quick Start](QUICK_START.md)
2. **Set up locally** → [Local Development](LOCAL_DEVELOPMENT.md)  
3. **Deploy to VPS** → [Production Deployment](PRODUCTION_DEPLOYMENT.md)
4. **Configure vars** → [Configuration](CONFIGURATION.md)

---

**You've got this! 🚀**
docker-compose up -d
docker-compose logs -f
```

**Option C: Read Full Guide**
- Open `DEPLOYMENT.md` for complete instructions

---

**You've got this! 💪**

All the infrastructure is ready. You just need to follow the steps above and your bot will be live in production!

Questions? Check the docs or run: `docker-compose logs -f`



TOP commands on vps:
1. Restart app:
docker-compose -f config/docker-compose.yml down && docker-compose -f config/docker-compose.yml build --no-cache && docker-compose -f config/docker-compose.yml up -d
2. lofg

docker-compose logs bg-bot --tail=200 2>&1 | grep -A 20 "API endpoints"

0.0.0.0/0
(includes your current IP address)

mongodb+srv://<db_username>:<db_password>@cluster0.zkjt23i.mongodb.net/{bot-name}?retryWrites=true&w=majority
