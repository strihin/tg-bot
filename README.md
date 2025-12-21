# Bulgarian Language Learning Telegram Bot 🇧🇬

A minimal MVP Telegram bot for learning Bulgarian language with multi-language support (Bulgarian → English/Russian/Ukrainian).

## Features

- 🗺️ 5 lesson categories: direction, greetings, help, restaurant, shopping
- 📚 600+ Bulgarian sentences with translations to English, Russian, Ukrainian
- 🔄 Language pair selection (Bulgarian as source, choose target language)
- 💾 User progress tracking via JSON files
- ⌨️ Inline keyboard navigation (next, previous, show translation)
- ✨ Simple, fast, no external dependencies (no MongoDB, no AI)

## Quick Start

### Prerequisites

- Node.js 18+
- Telegram Bot token (get from [@BotFather](https://t.me/botfather))

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd bg-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set environment variables:
```bash
cp .env.example .env
# Edit .env and add your TELEGRAM_TOKEN
```

4. Run the bot:
```bash
npm run dev        # Development (ts-node with watch)
npm run build      # TypeScript build
npm run moskovian  # Run compiled bot
```

### Docker (Local Verification)

1. Ensure Docker Desktop is running
2. Build and run with Docker Compose:
```bash
docker-compose up --build
```
3. Or manually:
```bash
docker build -t bg-bot .
docker run --env-file .env -v $(pwd)/data:/app/data bg-bot
```

## Web Testing Interface

For debugging and testing without Telegram, the bot includes a web interface:

```bash
# Access the web interface
open http://localhost:3000
```

**Features:**
- ✅ **Bot Status Monitoring** - Check if bot is running
- ✅ **User Progress Inspection** - View user learning data
- ✅ **Level/Category Browser** - Explore available content
- ✅ **API Endpoints** - RESTful API for testing

**API Endpoints:**
- `GET /api/status` - Bot status and configuration
- `GET /api/user/:userId` - User progress data
- `POST /api/user/:userId/reset` - Reset user progress
- `GET /api/categories/:folder` - Available categories per level

## Bot Commands

- `/start` - Show language selection (Bulgarian → target language)
- `/clear` - Remove all user progress files except the most recent
- `/test` - Show complete bot flow status (for debugging)

## Learning Flow

1. **Language Selection**: 🇧🇬 → 🇬🇧/🇺🇦/🇷🇺
2. **Level Selection**: 🌱 Basic, 🌿 Middle, 🔗 Middle Slavic, 📖 Misc, 🌍 Language Comparison, 💬 Expressions
3. **Category Selection**: Greetings, Restaurant, Shopping, etc.
4. **Lesson**: Show translation, navigate next/previous
5. **Navigation**: Back to menu, change level, exit lesson

## Project Structure

```
src/
├── bot/                    # Telegram bot handlers
│   ├── index.ts           # Bot initialization & callback routing
│   ├── handlers/          # Command handlers
│   │   ├── lesson.ts      # Lesson navigation (next, prev, translate, exit)
│   │   ├── category.ts    # Category selection
│   │   └── language.ts    # Target language selection
│   ├── keyboards.ts       # Inline button layouts
│   └── index.ts          # Main bot entry
├── data/                   # Data layer
│   ├── loader.ts          # JSON sentence loader with caching
│   ├── progress.ts        # User progress persistence
│   └── *.json             # Sentence data (5 categories)
├── constants.ts           # Languages & categories metadata
├── types.ts               # TypeScript interfaces
├── config.ts              # Environment config
└── index.ts               # App entry point
```

## Bot Commands

- `/start` - Show language selection (Bulgarian is source language, select target)

## Data Format

**Sentence files** (`data/*.json`):
```json
[
  {
    "bg": "Здравей",
    "eng": "Hello",
    "ru": "Привет",
    "ua": "Привіт",
    "source": "greetings"
  }
]
```

**User progress** (`data/.progress/{userId}.json`):
```json
{
  "userId": 123456,
  "currentIndex": 5,
  "languageFrom": "bg",
  "languageTo": "eng"
}
```

## Development

```bash
npm run build       # Compile TypeScript → dist/
npm run dev         # Watch + ts-node (auto-restart on changes)
npm run type-check  # Type checking only
```

## 🚀 Production Deployment

Ready to deploy to production? See the **deployment guides**:

- **[DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md)** - High-level overview & timeline
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed step-by-step instructions
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Progress tracking
- **[QUICK_COMMANDS.md](./QUICK_COMMANDS.md)** - Command reference

### Quick Deployment (TL;DR)

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **GitHub Actions automatically:**
   - Connects to VPS
   - Pulls latest code
   - Rebuilds Docker containers
   - Restarts services

3. **Access via Cloudflare Tunnel:**
   ```
   https://your-domain.com
   ```

### Tech Stack

- **Docker** - Containerization
- **Docker Compose** - Multi-service orchestration
- **Nginx** - Reverse proxy
- **MongoDB Atlas** - Cloud database
- **Cloudflare Tunnel** - Secure domain access
- **GitHub Actions** - Automated deployment
- **Hostinger VPS** - Application hosting

## Stage 1 Scope (MVP)

✅ Sentence-based learning (28 categories, 602+ sentences)  
✅ Multi-language support (BG → ENG/RU/UA)  
✅ User progress tracking (MongoDB)  
✅ Stress marks on Bulgarian words  
✅ Docker containerization  
✅ Automated CI/CD deployment  
✅ Cloudflare Tunnel support  

❌ Grammar explanations  
❌ AI/audio/video  
❌ SRS algorithms  
❌ Analytics/gamification  
❌ Complex schemas  

## License

MIT
