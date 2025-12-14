# Refactoring Summary: Polling → Webhook Mode

## What Changed

Your bot has been refactored to use **webhook mode** instead of polling, making it compatible with n8n and deployable on Hostinger VPS.

### Key Changes

#### 1. **Polling → Webhook Architecture**
- ❌ Removed: `{ polling: true }` from TelegramBot initialization
- ✅ Added: Express.js HTTP server to receive webhook updates from Telegram
- ✅ Webhook endpoint: `POST /telegram/webhook`

#### 2. **Database: Local JSON → MongoDB**
- ❌ Removed: Local file-based progress storage (`data/.progress/*.json`)
- ✅ Added: MongoDB driver with async/await functions
- ✅ New file: `src/db/mongo.ts` with `getUserProgress()` and `saveUserProgress()`
- 💾 Storage: MongoDB Atlas (cloud, free tier available)

#### 3. **Dependencies Added**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^6.3.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
```

#### 4. **New HTTP Server** (`src/server.ts`)
Exposes multiple endpoints:
- `GET /health` — Server health check (for monitoring)
- `POST /telegram/webhook` — Receives Telegram updates
- `POST /telegram/register-webhook` — Registers webhook with Telegram
- `GET /telegram/webhook-info` — Get webhook status
- `POST /telegram/remove-webhook` — Switch back to polling
- `POST /n8n/action` — Receive events from n8n

#### 5. **Async/Await Updates**
All handlers now use async MongoDB functions:
- `getUserProgress(userId)` → async, returns `Promise<UserProgress | null>`
- `saveUserProgress(progress)` → async, returns `Promise<void>`
- Updated files:
  - `src/bot/index.ts`
  - `src/bot/handlers/lesson.ts`
  - `src/bot/handlers/level.ts`
  - `src/bot/handlers/language.ts`

## File Structure Changes

```
src/
├── bot/
│   ├── index.ts                    (✏️ Updated: async calls, no polling)
│   └── handlers/
│       ├── lesson.ts               (✏️ Updated: async DB calls)
│       ├── level.ts                (✏️ Updated: async DB calls)
│       └── language.ts             (✏️ Updated: async DB calls)
├── db/
│   └── mongo.ts                    (✨ NEW: MongoDB async functions)
├── server.ts                       (✨ NEW: Express webhook server)
├── index.ts                        (✏️ Updated: uses Express server)
└── data/
    └── progress.ts                 (Kept: initializeUserProgress helper)
```

## Next Steps

### 1. Install Dependencies
```bash
npm install
npm run build
```

### 2. Setup MongoDB Atlas
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account and cluster
3. Get connection string: `mongodb+srv://...`
4. Add to `.env`:
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bg_bot?retryWrites=true&w=majority
   ```

### 3. Deploy to Hostinger VPS
Follow `WEBHOOK_DEPLOYMENT.md` for step-by-step setup on Ubuntu 24.04

### 4. Integrate with n8n
Your n8n instance on the VPS can now:
- **Trigger bot actions** via `POST /n8n/action`
- **Monitor bot health** via `GET /health`
- **Schedule messages** using n8n's cron workflows

## Key Advantages

✅ **No long-running polling** — Efficient webhook processing  
✅ **Cloud database** — Reliable data persistence  
✅ **n8n ready** — Trigger workflows from external services  
✅ **HTTP monitoring** — Health checks for uptime monitoring  
✅ **Scalable** — Easy to add more bot features via n8n workflows  
✅ **Graceful updates** — Can update code without losing user sessions  

## Troubleshooting

### MongoDB Connection Error
```bash
# Check MONGO_URI in .env
cat .env | grep MONGO_URI

# Verify connection works
npm install -g mongodb-cli  # or use MongoDB Compass GUI
```

### Webhook Not Registering
```bash
# After deploying, register webhook:
curl -X POST https://your-domain:3000/telegram/register-webhook

# Check status:
curl https://your-domain:3000/telegram/webhook-info
```

### Port Already in Use
```bash
# Change port in .env
PORT=3001

# Or kill process using port 3000
lsof -i :3000 | awk 'NR==2 {print $2}' | xargs kill -9
```

## Files to Review

1. **`WEBHOOK_DEPLOYMENT.md`** — Full deployment guide (recommended reading!)
2. **`src/server.ts`** — HTTP endpoints
3. **`src/db/mongo.ts`** — Database layer
4. **`.env`** example → Create your own with MongoDB URI

---

**Status: ✅ Ready for deployment to Hostinger VPS + n8n integration**
