# Quick Start: Webhook Bot + n8n + Hostinger VPS

## 🚀 5-Minute Overview

Your bot has been refactored from **polling to webhook mode**. This means:
- ✅ Telegram sends updates to your VPS (not the other way around)
- ✅ Runs efficiently with n8n integration
- ✅ User data stored in MongoDB (not local files)
- ✅ Ready for Hostinger deployment

## 📋 Prerequisites

Before you deploy, have these ready:
1. **MongoDB Atlas account** (free tier) — https://www.mongodb.com/cloud/atlas
2. **Hostinger VPS credentials** (you have: `root@72.62.91.91`)
3. **Telegram Bot Token** (from @BotFather)
4. **Domain or public IP** with SSL certificate (for webhook security)

## ⚡ Local Testing (Optional)

Test locally before deploying to VPS:

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env  # (or create manually)

# 3. Add your values to .env
TELEGRAM_TOKEN=your_token_here
BOT_USERNAME=@your_bot_name
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/bg_bot
WEBHOOK_URL=http://localhost:3000
PORT=3000
NODE_ENV=development

# 4. Run in development
npm run dev

# Server starts on port 3000
```

## 🌐 Deploy to Hostinger VPS

**Full guide:** See `WEBHOOK_DEPLOYMENT.md` (detailed 10-step process)

**Quick version:**

```bash
# SSH into VPS
ssh root@72.62.91.91

# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Clone and setup your repo
mkdir -p /var/www/bg-bot
cd /var/www/bg-bot
git clone <your-repo-url> .
npm install
npm run build

# Create .env with your secrets
nano .env
# Paste these (with your actual values):
# TELEGRAM_TOKEN=...
# BOT_USERNAME=@...
# MONGO_URI=mongodb+srv://...
# WEBHOOK_URL=https://72.62.91.91:3000
# PORT=3000

# Start with PM2
pm2 start dist/index.js --name "bg-bot"
pm2 save
pm2 startup

# Register webhook with Telegram
curl -X POST https://72.62.91.91:3000/telegram/register-webhook

# Check logs
pm2 logs bg-bot
```

## 🔗 Webhook Endpoints

Once deployed, your bot exposes these endpoints:

| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|----------|
| `/health` | GET | Health check | n8n monitoring |
| `/telegram/webhook` | POST | Receive Telegram updates | Telegram API |
| `/telegram/register-webhook` | POST | Setup webhook | Manual setup |
| `/telegram/webhook-info` | GET | Check webhook status | Debugging |
| `/telegram/remove-webhook` | POST | Disable webhook | Fallback to polling |
| `/n8n/action` | POST | Receive n8n triggers | n8n workflows |

## 🔄 n8n Integration

### Trigger Bot from n8n

Create n8n workflow:

1. **Trigger:** Cron (daily, etc.) or HTTP
2. **Node: HTTP Request**
   - Method: `POST`
   - URL: `https://72.62.91.91:3000/n8n/action`
   - Body:
   ```json
   {
     "action": "send_notification",
     "message": "Daily lesson ready!",
     "userId": 123456
   }
   ```

### Monitor Bot Health from n8n

1. **Trigger:** Interval (every 5 min)
2. **Node: HTTP Request**
   - Method: `GET`
   - URL: `https://72.62.91.91:3000/health`
3. **Node: Condition** — Alert if status != "ok"

## 📁 New/Changed Files

### New Files
- **`src/db/mongo.ts`** — MongoDB async functions
- **`src/server.ts`** — Express HTTP server
- **`WEBHOOK_DEPLOYMENT.md`** — Full deployment guide
- **`REFACTORING_SUMMARY.md`** — Technical changes

### Updated Files
- **`src/index.ts`** — Now initializes Express server
- **`src/bot/index.ts`** — Removed polling, updated to async
- **`src/bot/handlers/*`** — All use async MongoDB calls
- **`package.json`** — Added express, mongodb dependencies

## 🛠️ Maintenance Commands

```bash
# SSH into VPS
ssh root@72.62.91.91
cd /var/www/bg-bot

# View bot logs
pm2 logs bg-bot

# Restart bot after code update
git pull
npm install
npm run build
pm2 restart bg-bot

# Check bot status
pm2 status

# Monitor resources
pm2 monit
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "MONGO_URI not found" | Check `.env` file has correct MongoDB connection string |
| "Webhook not registering" | Ensure SSL cert is valid, then run `curl -X POST https://your-domain:3000/telegram/register-webhook` |
| "Bot not responding" | Check `pm2 logs bg-bot`, ensure Telegram updated webhook |
| "Port 3000 in use" | Change PORT in `.env` or kill process with `lsof -i :3000` |
| MongoDB connection timeout | Verify IP whitelist in MongoDB Atlas (allow all: `0.0.0.0/0`) |

## 📚 Important Files to Read

1. **`WEBHOOK_DEPLOYMENT.md`** — Step-by-step deployment (READ THIS!)
2. **`REFACTORING_SUMMARY.md`** — What changed technically
3. **`src/server.ts`** — HTTP endpoints available
4. **`.env.example`** — Environment variable template

## ✅ Deployment Checklist

- [ ] MongoDB Atlas cluster created & connection string ready
- [ ] `.env` file created with all required variables
- [ ] Local build passes: `npm run build`
- [ ] Hostinger VPS SSH access confirmed
- [ ] Node.js 20 installed on VPS
- [ ] Code pushed to Git repo
- [ ] PM2 started with `pm2 start dist/index.js --name "bg-bot"`
- [ ] Webhook registered: `curl -X POST https://your-domain:3000/telegram/register-webhook`
- [ ] Test bot on Telegram: send `/start`
- [ ] Verify `pm2 logs bg-bot` shows activity

## 🎓 Next Steps After Deployment

1. **Add n8n workflows** — Automate daily lessons, notifications
2. **Setup monitoring** — Health checks every 5 minutes
3. **Add analytics** — Log user interactions to MongoDB
4. **Backup data** — Configure MongoDB Atlas backup

## 📞 Support Resources

- **Telegram Bot API:** https://core.telegram.org/bots/api
- **n8n Docs:** https://docs.n8n.io/
- **MongoDB Docs:** https://docs.mongodb.com/
- **Node.js Best Practices:** https://nodejs.org/en/docs/guides/

---

**Status:** ✅ Refactoring complete, ready for deployment!

**Next:** Follow `WEBHOOK_DEPLOYMENT.md` for step-by-step VPS setup.
