# Complete Deployment Checklist: MongoDB → Hostinger → n8n

## 🎯 Overview: What You Need to Do

You have **3 independent services** to set up:

```
1. MongoDB Atlas (Cloud Database)
   ↓
2. Hostinger VPS (Your bot runs here)
   ↓
3. n8n (Workflows & monitoring)
```

Each one needs configuration. Let's go step-by-step.

---

## ✅ STEP 1: MongoDB Setup (10 minutes)

### What MongoDB Does
Stores user progress data (which lesson they're on, which language, etc.)

### Action Items

#### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Sign Up" (free tier available)
3. Create account with email/password or GitHub
4. **Verify email**

#### 1.2 Create a Cluster
1. After login, click "Create Deployment"
2. Select "M0 Sandbox" (free tier)
3. Select region closest to **Europe** (your Hostinger VPS location)
4. Name it: `bg-bot`
5. Click "Create"
6. Wait ~3 minutes for cluster to be ready

#### 1.3 Create Database User
1. In MongoDB Atlas, go to **Security → Database Access**
2. Click **Add New Database User**
3. Username: `bg_bot_user`
4. Password: Generate strong password (copy it!)
5. Database: Select "Specific" → `bg_bot`
6. Click **Add User**

#### 1.4 Configure IP Whitelist
1. Go to **Security → Network Access**
2. Click **Add IP Address**
3. Choose **"Allow access from anywhere"** (select `0.0.0.0/0`)
   - ⚠️ Not ideal for production, but needed for Hostinger
4. Click **Confirm**

#### 1.5 Get Connection String
1. Go to **Deployment → Clusters**
2. Click **Connect** button on your cluster
3. Choose **"Drivers"**
4. Select **Node.js** version `4.x or later`
5. Copy the connection string:
   ```
   mongodb+srv://bg_bot_user:PASSWORD@cluster0.xxxxx.mongodb.net/bg_bot?retryWrites=true&w=majority
   ```
6. Replace `PASSWORD` with the password you created in step 1.3

#### 1.6 Test Connection (Optional)
```bash
# Install MongoDB CLI (macOS):
brew install mongodb-community

# Test connection:
mongosh "mongodb+srv://bg_bot_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/bg_bot"

# Should connect without errors
```

### ✅ MongoDB Ready When:
- [ ] Account created
- [ ] Cluster visible in Atlas dashboard
- [ ] Database user created
- [ ] IP whitelist configured
- [ ] Connection string copied

**Save this connection string!** You'll need it for the VPS.

---

## ✅ STEP 2: Hostinger VPS Setup (30-40 minutes)

### What Hostinger Does
Runs your Node.js bot server that receives Telegram updates

### 2.1 SSH into Your VPS

Open terminal on **your Mac**:

```bash
ssh root@72.62.91.91
```

When prompted for password: Use your Hostinger VPS password

### 2.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

Wait for completion (~2-3 minutes)

### 2.3 Install Node.js 20

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### 2.4 Install PM2 (Process Manager)

```bash
# Install globally
sudo npm install -g pm2

# Verify
pm2 --version
```

### 2.5 Install Git

```bash
sudo apt install -y git
git --version  # Verify
```

### 2.6 Clone Your Repository

```bash
# Create app directory
sudo mkdir -p /var/www/bg-bot
cd /var/www/bg-bot

# Clone your repo
sudo git clone https://github.com/strihin/tg-bot.git .

# Fix permissions
sudo chown -R $USER:$USER /var/www/bg-bot
```

### 2.7 Install Dependencies

```bash
cd /var/www/bg-bot
npm install
```

Wait for all packages to install (~1-2 minutes)

### 2.8 Build TypeScript

```bash
npm run build
```

Should complete without errors.

### 2.9 Create `.env` File

```bash
# Create the file
nano .env
```

Paste this (replace with YOUR values):

```env
# Telegram
TELEGRAM_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER
BOT_USERNAME=@your_bot_username

# MongoDB
MONGO_URI=mongodb+srv://bg_bot_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/bg_bot?retryWrites=true&w=majority

# Server
WEBHOOK_URL=https://72.62.91.91:3000
PORT=3000
NODE_ENV=production
```

**How to save in nano:**
- Press `Ctrl+X`
- Press `Y` (yes)
- Press `Enter` (keep filename)

### 2.10 Setup SSL Certificate (Required for Telegram Webhook)

Telegram requires HTTPS for webhooks. Two options:

#### Option A: Self-Signed Cert (Quick, for testing)
```bash
cd /var/www/bg-bot
openssl req -x509 -newkey rsa:2048 -keyout private.key -out public.cert -days 365 -nodes

# When prompted, just press Enter for all fields
```

#### Option B: Let's Encrypt (Production, free)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# If you have a domain pointing to 72.62.91.91:
sudo certbot certonly --standalone -d yourdomain.com

# Copy certs to app directory:
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /var/www/bg-bot/private.key
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /var/www/bg-bot/public.cert
sudo chown $USER:$USER /var/www/bg-bot/*.key /var/www/bg-bot/*.cert
```

**For now, use Option A (self-signed).** It works for testing.

### 2.11 Start Bot with PM2

```bash
cd /var/www/bg-bot

# Start the bot
pm2 start dist/index.js --name "bg-bot" --env production

# Save PM2 config (survives reboot)
pm2 save
pm2 startup

# View logs
pm2 logs bg-bot
```

**Expected output in logs:**
```
🤖 Bot instance created
✅ Webhook server configured
🚀 Server running on port 3000
📍 Webhook URL: https://72.62.91.91:3000/telegram/webhook
```

### 2.12 Register Webhook with Telegram

Open terminal on **your Mac** (not SSH):

```bash
# Replace TOKEN with your actual token
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \
  -F "url=https://72.62.91.91:3000/telegram/webhook"
```

**Expected response:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 2.13 Verify Bot is Running

Open Telegram and:
1. Find your bot
2. Send `/start`
3. Bot should respond with "Welcome to Bulgarian Learning Bot"

Check logs on VPS:
```bash
# SSH back in
ssh root@72.62.91.91
cd /var/www/bg-bot
pm2 logs bg-bot
```

You should see:
```
📥 /start command received from chat 123456
```

### ✅ VPS Ready When:
- [ ] Node.js installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] `.env` file created with MongoDB URI
- [ ] PM2 running bot (check with `pm2 status`)
- [ ] Bot responds in Telegram to `/start`

---

## ✅ STEP 3: n8n Setup (20-30 minutes)

### What n8n Does
Runs workflows for:
- Daily lesson reminders
- User analytics
- Health monitoring
- Integration with other services

**IMPORTANT:** You said n8n is already running on your VPS. Confirm with:

```bash
# SSH into Hostinger
ssh root@72.62.91.91

# Check if n8n container exists
docker ps | grep n8n
```

If it shows a container, it's already running. Get its URL:

```bash
# Usually at:
http://72.62.91.91:5678
# or
https://your-n8n-domain.com
```

### 3.1 Access n8n

In your browser:
- Go to `http://72.62.91.91:5678` (or your domain)
- Create admin account (email/password)
- Set up 2FA if prompted

### 3.2 Add MongoDB Credentials

1. Click **Credentials** in left menu
2. Click **New** → **Create new credential**
3. Search for **"MongoDB"**
4. Fill in:
   - **Host:** `cluster0.xxxxx.mongodb.net`
   - **Port:** `27017`
   - **Database:** `bg_bot`
   - **Username:** `bg_bot_user`
   - **Password:** (the password from Step 1.3)
   - **Connection Type:** Select **Atlas**
5. Click **Test connection** → Should say "Connected"
6. Click **Save**

### 3.3 Add Telegram Credentials

1. Click **Credentials** again
2. Click **New** → **Create new credential**
3. Search for **"Telegram"**
4. Fill in:
   - **Token:** Your bot token from BotFather
5. Click **Test connection** → Should succeed
6. Click **Save**

### 3.4 Create Monitoring Workflow (Optional)

This checks if your bot is healthy every 5 minutes.

1. Click **Workflows** → **New**
2. Name it: **"Bot Health Monitor"**
3. Add nodes:

**Node 1: Cron Trigger**
- Type: Cron
- Trigger every 5 minutes: `*/5 * * * *`

**Node 2: HTTP Request**
- Method: `GET`
- URL: `https://72.62.91.91:3000/health`

**Node 3: Condition**
- If response status is not 200, send alert

**Node 4: Telegram Send Message** (only if failed)
- Chat ID: Your user ID
- Message: "⚠️ Bot is down!"

4. Click **Save & Activate**

### 3.5 Create Daily Reminder Workflow (Optional)

Send users a reminder at 9 AM to do their daily lesson.

1. Click **Workflows** → **New**
2. Name it: **"Daily Lesson Reminder"**
3. Add nodes:

**Node 1: Cron Trigger**
- Time: Every day at 9 AM: `0 9 * * *`

**Node 2: MongoDB Find**
- Collection: `user_progress`
- Query: `{ lessonActive: true }`
- Get all active users

**Node 3: Loop through Users**
- For each user, send Telegram message:
  - Text: "📚 Don't forget your daily lesson! 🎯"
  - Chat ID: `{{ $json.chatId }}`

4. Click **Save & Activate**

### ✅ n8n Ready When:
- [ ] Can access n8n dashboard
- [ ] MongoDB credentials tested
- [ ] Telegram credentials tested
- [ ] Optional: Monitoring workflow running

---

## ❓ FAQ: GitHub Push & Triggering

### "Shall I need to push code to GitHub to trigger it?"

**Short answer: NO**

**Long answer:**

- **Code is already deployed** via `git clone` in Step 2.6
- Pushing to GitHub **does NOT** automatically update your VPS
- To deploy code changes, you must manually:

```bash
# SSH into VPS
ssh root@72.62.91.91
cd /var/www/bg-bot

# Pull latest code
git pull origin main

# Rebuild
npm install
npm run build

# Restart bot
pm2 restart bg-bot
```

### But I Want Auto-Deploy When Pushing Code

If you want auto-deployment (CD), do this:

#### Option 1: GitHub Actions + Webhook (Advanced)
1. Create GitHub Actions workflow
2. On push, trigger a webhook on your VPS
3. VPS runs `git pull && npm run build && pm2 restart bg-bot`

#### Option 2: Manual Pull Script
```bash
# On VPS, create deploy.sh:
#!/bin/bash
cd /var/www/bg-bot
git pull origin main
npm install
npm run build
pm2 restart bg-bot
echo "✅ Deployed!"

# Make executable:
chmod +x deploy.sh

# Then just run:
./deploy.sh
```

#### Option 3: Simplest (Recommended Now)
Just manually pull and restart when you make code changes. For MVP, this is fine.

---

## 📋 Complete Deployment Summary

### What Runs Where

```
┌─────────────────────────────────────────────────────┐
│ MongoDB Atlas (Cloud)                               │
│ ├─ Stores: user_progress, sentences, categories     │
│ └─ Hosted: Europe region                            │
└─────────────────────────────────────────────────────┘
                      ↑
                      │ (reads/writes data)
                      │
┌─────────────────────────────────────────────────────┐
│ Hostinger VPS (72.62.91.91)                         │
│ ├─ Node.js Bot Server (port 3000)                  │
│ │  ├─ Receives Telegram webhooks                   │
│ │  ├─ Processes user commands                      │
│ │  └─ Saves progress to MongoDB                    │
│ │                                                   │
│ └─ PM2 (Process Manager)                           │
│    ├─ Keeps bot running 24/7                       │
│    └─ Auto-restart on crash                        │
└─────────────────────────────────────────────────────┘
                      ↑
                      │ (Telegram webhooks)
                      │
┌─────────────────────────────────────────────────────┐
│ Telegram Users                                      │
│ └─ Send messages → Bot responds                     │
└─────────────────────────────────────────────────────┘

Optional:
┌─────────────────────────────────────────────────────┐
│ n8n (on same Hostinger VPS)                         │
│ ├─ Monitoring workflows                            │
│ ├─ Daily reminders                                 │
│ ├─ Analytics & reports                             │
│ └─ Can trigger bot actions                         │
└─────────────────────────────────────────────────────┘
```

### Checklist: Before You Start

- [ ] Have Hostinger VPS IP: `72.62.91.91` ✅
- [ ] Have Telegram bot token from @BotFather
- [ ] Have GitHub account with your code
- [ ] SSH client on your Mac (Terminal works)
- [ ] 1-2 hours of free time

### Order of Execution

1. **MongoDB** first (data storage is needed)
2. **Hostinger VPS** next (bot needs to run somewhere)
3. **n8n** last (optional, adds features to existing bot)

### Time Estimate

- MongoDB: **10 min**
- Hostinger VPS: **30-40 min**
- n8n: **20-30 min** (optional)
- **Total: 60-80 minutes**

---

## 🚨 Troubleshooting During Setup

### "Can't SSH into VPS"
```bash
# Check IP and password
ssh root@72.62.91.91

# If connection refused, check:
# 1. VPS is running (Hostinger dashboard)
# 2. Try with -v flag for debug info:
ssh -v root@72.62.91.91
```

### "npm install fails"
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### "MongoDB connection error"
```bash
# Test connection string:
mongosh "mongodb+srv://bg_bot_user:PASSWORD@cluster0.xxxxx.mongodb.net/bg_bot"

# If fails:
# 1. Check password has no special chars (or escape them)
# 2. Check IP whitelist includes 0.0.0.0/0 in MongoDB Atlas
# 3. Check connection string format
```

### "Telegram webhook not registering"
```bash
# Verify certificate exists
ls -la /var/www/bg-bot/*.cert /var/www/bg-bot/*.key

# Test webhook registration:
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"

# Should show your webhook URL
```

### "Bot running but not responding"
```bash
# Check logs
pm2 logs bg-bot

# Check MongoDB connection in logs
# Look for: "✅ Webhook server configured"

# Test endpoint
curl https://72.62.91.91:3000/health
# Should return: {"status":"ok",...}
```

---

## 📞 Next Steps After Deployment

1. **Test thoroughly**
   - Send various commands to bot
   - Complete full lesson flow
   - Check MongoDB has saved data

2. **Monitor health**
   - Check `pm2 logs bg-bot` daily
   - Set up n8n health monitor (optional)

3. **Extend with n8n**
   - Add daily reminders
   - Add analytics tracking
   - Add user statistics

4. **Add custom features**
   - New lesson categories
   - Gamification (points, streaks)
   - Social features (sharing progress)

---

## 🎯 You Are Here

```
Step 1: MongoDB    ← START HERE
   ↓
Step 2: Hostinger VPS
   ↓
Step 3: n8n
   ↓
✅ Complete!
```

**Questions before you start?** Ask now!

Ready to begin? Start with **Step 1: MongoDB Setup** above.
