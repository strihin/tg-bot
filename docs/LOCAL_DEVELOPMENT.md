# Local Development Guide

Complete setup for developing BG-Bot on your Mac.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org)
- **Docker** (optional) - [Download](https://www.docker.com/products/docker-desktop)
- **Telegram Bot token** - Get from [@BotFather](https://t.me/botfather)
- **MongoDB** - Use MongoDB Atlas (cloud) OR local Docker container

## Path 1: Local Development (Recommended for Simplicity)

### 1. Clone Repository
```bash
git clone <repo-url>
cd bg-bot
npm install
```

### 2. Set Up MongoDB Atlas (Cloud)

**Fast setup (2 minutes):**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account and cluster
3. Create database user (Database Access → Add User)
4. Whitelist your IP (Network Access → Add IP Address)
   - For development: use `0.0.0.0/0` (allows all)
5. Get connection string:
   - Click "Connect" on your cluster
   - Copy "Connection String"
   - Format: `mongodb+srv://user:password@cluster.mongodb.net/bg-bot`

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Fill in:**
```bash
TELEGRAM_TOKEN=your_bot_token_from_botfather
BOT_USERNAME=your_bot_username
MONGO_URI=mongodb+srv://your_user:your_password@cluster0.mongodb.net/gb-bot
NODE_ENV=development
PORT=3001
```

### 4. Build and Run

```bash
npm run build        # Compile TypeScript
npm start           # Start bot (polling mode)
```

**Or with auto-reload:**
```bash
npm run dev         # Watch mode with ts-node
```

### 5. Test in Telegram

Open Telegram → Search for your bot → Send `/start`

---

## Path 2: Local Development with Docker MongoDB

Use this if you want MongoDB running locally in Docker instead of cloud.

### 1. Set Up Docker MongoDB

```bash
# Copy MongoDB environment template
cp .env.mongodb.example .env.mongodb

# Edit with your local credentials
nano .env.mongodb
```

**Content example:**
```bash
MONGO_INITDB_ROOT_USERNAME=devuser
MONGO_INITDB_ROOT_PASSWORD=devpass123
MONGO_INITDB_DATABASE=bg-bot
```

### 2. Configure Application

```bash
cp .env.example .env
nano .env
```

**Fill in (note: localhost for local MongoDB):**
```bash
TELEGRAM_TOKEN=your_bot_token
BOT_USERNAME=your_bot_username
MONGO_URI=mongodb://devuser:devpass123@localhost:27017/bg-bot
NODE_ENV=development
PORT=3001
```

### 3. Start Services with Docker Compose

```bash
# Start MongoDB + app
docker-compose up --build

# Or in background:
docker-compose up -d

# View logs:
docker-compose logs -f bg-bot
```

### 4. Stop Services

```bash
docker-compose down
```

---

## Development Workflow

### Running the Bot

**Option A: Node.js directly (local MongoDB)**
```bash
npm start           # Single run
npm run dev         # Auto-reload on file changes
```

**Option B: Docker Compose (local MongoDB)**
```bash
docker-compose up          # Foreground
docker-compose up -d       # Background
docker-compose logs -f     # View logs
```

### Building TypeScript

```bash
npm run build           # Compile once
npm run type-check      # Check types only
npm run dev            # Watch + compile + run
```

### Data Management

**Migrate data to MongoDB (first time only):**
```bash
npm run build
node dist/db/migrate.js
```

**View web interface:**
```bash
# Once bot is running, open:
open http://localhost:3001
```

---

## Troubleshooting

### "Cannot find module mongodb"
```bash
npm install
npm run build
```

### "MONGO_URI is not set"
- Verify `.env` file exists
- Check value is correct: `mongodb+srv://user:pass@cluster.mongodb.net/db-name`
- Use MongoDB Atlas whitelist: `0.0.0.0/0` for dev

### "Cannot connect to MongoDB"
```bash
# Test connection string directly:
npm run build
node -e "
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI;
new MongoClient(uri).connect()
  .then(() => console.log('✅ Connected'))
  .catch(e => console.log('❌ Error:', e.message))
"
```

### "Telegram bot not responding"
1. Verify `TELEGRAM_TOKEN` is correct
2. Check `BOT_USERNAME` matches your Telegram bot username
3. View logs: `npm run dev`
4. Restart bot

### Docker issues
```bash
# Remove old containers
docker-compose down -v

# Rebuild fresh
docker-compose build --no-cache
docker-compose up
```

---

## Environment Variables Reference

See [Configuration](CONFIGURATION.md) for complete reference of all variables.

**Most important for local dev:**
- `TELEGRAM_TOKEN` - Your bot token
- `BOT_USERNAME` - Your bot username
- `MONGO_URI` - MongoDB connection string
- `NODE_ENV` - Set to `development`
- `PORT` - Local port (default: 3001)

---

## Next Steps

- **Need production setup?** → [Production Deployment](PRODUCTION_DEPLOYMENT.md)
- **Configure all options?** → [Configuration](CONFIGURATION.md)
- **Deploy checklist?** → [START_HERE](START_HERE.md)
