# Webhook Deployment Guide: Node.js + n8n on Hostinger VPS

This guide covers deploying the Bulgarian Learning Bot with webhook mode on your Hostinger VPS (Ubuntu 24.04) and integrating it with n8n.

## Architecture Overview

```
Telegram User
    ↓
Telegram API
    ↓
Your VPS (webhook receiver)
    ↓
Express Server (port 3000)
    ↓
Bot Logic
    ↓
MongoDB (user progress)
    
n8n (optional)
    ↓ (can trigger actions via /n8n/action endpoint)
```

## Prerequisites

- Hostinger VPS with Ubuntu 24.04 (already have this ✅)
- MongoDB Atlas account (free tier available at https://www.mongodb.com/cloud/atlas)
- Your domain or public IP with SSL (for webhook security)
- Telegram Bot Token (from @BotFather)

## Step 1: Setup MongoDB Atlas (Cloud Database)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account and cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/bg_bot?retryWrites=true&w=majority`
4. Copy this string for later

## Step 2: SSH into VPS and Install Dependencies

```bash
ssh root@72.62.91.91

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Verify installations
node --version
npm --version
pm2 --version
```

## Step 3: Clone and Setup Project

```bash
# Create app directory
sudo mkdir -p /var/www/bg-bot
cd /var/www/bg-bot

# Clone repository (replace with your repo URL)
sudo git clone <your-repo-url> .

# Set permissions
sudo chown -R $USER:$USER /var/www/bg-bot

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Step 4: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add these variables:

```env
TELEGRAM_TOKEN=your_token_from_botfather
BOT_USERNAME=@your_bot_username
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bg_bot?retryWrites=true&w=majority
WEBHOOK_URL=https://72.62.91.91:3000
PORT=3000
NODE_ENV=production
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 5: Setup SSL Certificate (Required for Telegram Webhook)

Telegram requires HTTPS for webhooks. Use Let's Encrypt:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# If you have a domain, use:
sudo certbot certonly --standalone -d yourdomain.com

# For IP-based (self-signed, less secure but works for testing):
cd /var/www/bg-bot
openssl req -x509 -newkey rsa:2048 -keyout private.key -out public.cert -days 365 -nodes
```

Update `.env` with certificate paths if using self-signed.

## Step 6: Start Bot with PM2

```bash
# Start the bot
pm2 start dist/index.js --name "bg-bot" --env production

# Save PM2 config
pm2 save
pm2 startup

# View logs
pm2 logs bg-bot
```

## Step 7: Register Webhook with Telegram

Once the server is running, register the webhook:

```bash
# Register webhook
curl -X POST https://your-domain.com:3000/telegram/register-webhook \
  -H "Content-Type: application/json"

# Or check webhook status
curl https://your-domain.com:3000/telegram/webhook-info
```

**Expected response:**
```json
{
  "ok": true,
  "message": "Webhook registered successfully",
  "webhook_url": "https://72.62.91.91:3000/telegram/webhook"
}
```

## Step 8: Test the Bot

1. Open Telegram and find your bot
2. Send `/start` command
3. Check PM2 logs: `pm2 logs bg-bot`

You should see:
```
📥 /start command received
```

## Step 9: Integrate with n8n

### Option A: n8n triggers bot action

Create n8n workflow:

1. **Trigger**: Cron schedule or HTTP webhook
2. **Action**: HTTP request node
   - Method: `POST`
   - URL: `https://72.62.91.91:3000/n8n/action`
   - Body: 
   ```json
   {
     "action": "notify_users",
     "message": "Daily lesson available!"
   }
   ```

### Option B: Bot triggers n8n

Your bot can POST to n8n webhook. Update bot handlers:

```typescript
// In any handler, after user action:
await fetch('https://your-n8n.app/webhook/learn-event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, action: 'lesson_completed' })
});
```

## Step 10: Monitor and Maintain

```bash
# View all PM2 processes
pm2 status

# View detailed logs
pm2 logs bg-bot --lines 100

# Restart bot
pm2 restart bg-bot

# Monitor system resources
pm2 monit

# View PM2 config
pm2 show bg-bot
```

## Health Check Endpoints

Your bot exposes these endpoints for monitoring:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health check |
| `/telegram/webhook` | POST | Receives Telegram updates |
| `/telegram/register-webhook` | POST | Setup webhook with Telegram |
| `/telegram/webhook-info` | GET | Get webhook status |
| `/telegram/remove-webhook` | POST | Remove webhook (switch to polling) |
| `/n8n/action` | POST | Receive triggers from n8n |

### Setup health monitoring in n8n

Create a workflow that checks `/health` every 5 minutes and alerts if down:

1. **Trigger**: Interval (5 min)
2. **HTTP request**: `GET https://72.62.91.91:3000/health`
3. **Condition**: Check response status
4. **Action**: Send alert to Telegram if fails

## Troubleshooting

### Webhook not receiving updates

```bash
# Check webhook status
pm2 logs bg-bot | grep -i webhook

# Remove and re-register
curl -X POST https://your-domain:3000/telegram/remove-webhook
sleep 2
curl -X POST https://your-domain:3000/telegram/register-webhook
```

### MongoDB connection error

```bash
# Verify MONGO_URI in .env
cat .env | grep MONGO_URI

# Check connection
node -e "
const { MongoClient } = require('mongodb');
new MongoClient(process.env.MONGO_URI).connect()
  .then(() => console.log('✅ Connected'))
  .catch(e => console.error('❌', e.message));
"
```

### SSL certificate issues

```bash
# If using Let's Encrypt, renew certificate
sudo certbot renew

# Check certificate expiration
sudo certbot certificates
```

## Updating Code

```bash
cd /var/www/bg-bot
git pull
npm install
npm run build
pm2 restart bg-bot
```

## Switching Back to Polling Mode

If webhook setup fails:

1. Edit `src/bot/index.ts`: Change webhook setup back to `{ polling: true }`
2. `npm run build`
3. `pm2 restart bg-bot`

This mode uses more resources but requires no SSL/domain setup.

## Support

- Telegram Bot API docs: https://core.telegram.org/bots/api
- n8n webhook docs: https://docs.n8n.io/
- MongoDB docs: https://docs.mongodb.com/

---

**Summary of Key Changes:**
- ✅ Polling → Webhook mode
- ✅ Local JSON → MongoDB Atlas
- ✅ Plain Node → Express server with multiple endpoints
- ✅ Ready for n8n integration
- ✅ Health monitoring ready
