# Quick Start - 5 Minutes to Running Locally

Want to get the bot running immediately? This is the fastest path.

## Prerequisites (1 minute)

- Node.js 18+ installed
- Telegram Bot token (from [@BotFather](https://t.me/botfather))
- MongoDB Atlas free account (2 minutes at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas))

## Setup (4 minutes)

```bash
# 1. Clone and install
git clone <repo-url>
cd bg-bot
npm install

# 2. Create .env file
cp .env.example .env

# 3. Edit .env with your credentials
nano .env
# Add:
#   TELEGRAM_TOKEN=your_bot_token
#   BOT_USERNAME=your_bot_name
#   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/bg-bot

# 4. Build and run
npm run build
npm start
```

## Test Your Bot

Open Telegram and message: `/start`

Your bot should respond!

## Next Steps

- **Need more details?** → [Local Development](LOCAL_DEVELOPMENT.md)
- **Ready to deploy?** → [Production Deployment](PRODUCTION_DEPLOYMENT.md)
- **Configure settings?** → [Configuration](CONFIGURATION.md)

---

**💡 Tip:** Use `npm run dev` for auto-reload during development
