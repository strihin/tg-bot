# Bulgarian Language Learning Telegram Bot 🇧🇬

A minimal MVP Telegram bot for learning Bulgarian language with multi-language support (Bulgarian → English/Ukrainian/Kharkiv Dialect).

## Features

- 🗺️ 28 lesson categories across 6 learning levels
- 📚 602 Bulgarian sentences with translations to English, Ukrainian, Kharkiv
- 🔄 Multi-language support (Bulgarian → ENG/UA/Kharkiv)
- 💾 User progress tracking via MongoDB
- ⌨️ Inline keyboard navigation (next, previous, show translation)
- 🌍 6 independent learning levels: Basic, Middle, Middle Slavic, Misc, Language Comparison, Expressions

## Quick Start

### Prerequisites

- Docker & Docker Compose (for containerized deployment)
- Node.js 18+ (for local development)
- Telegram Bot token (get from [@BotFather](https://t.me/botfather))
- MongoDB Atlas account (free tier available)

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

3. Set up MongoDB Atlas:
   - Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Add your IP to Network Access (or use 0.0.0.0/0 for dev)
   - Create a database user in Database Access

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with:
#   TELEGRAM_TOKEN=your_bot_token
#   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/bg-bot
```

5. Run the bot:
```bash
npm run build      # TypeScript compilation
node dist/db/migrate.js  # Load data into MongoDB
npm start          # Start the bot
```

### Docker Deployment

#### Using Shell Scripts (Recommended)

The project includes convenient shell scripts for building and running:

**Build the Docker image:**
```bash
./build.sh
```
This script:
- ✅ Verifies Docker is running
- ✅ Cleans up old containers and images
- ✅ Builds a fresh image with `docker-compose build --no-cache`
- ✅ Optionally starts the container interactively

**Run the bot container:**
```bash
./run.sh
```
This script:
- ✅ Verifies Docker is running
- ✅ Checks .env file exists
- ✅ Verifies image exists
- ✅ Cleans up any conflicting containers
- ✅ Starts the bot with environment variables from .env

#### Using docker-compose directly

```bash
docker-compose up --build    # Build and start all services
docker-compose down          # Stop all services
docker-compose logs          # View logs
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

1. **Language Selection**: 🇧🇬 → 🇬🇧 English / 🇺🇦 Ukrainian / 🎭 Kharkiv Dialect
2. **Level Selection**: Choose from 6 independent levels
   - 🌱 Basic (fundamental phrases)
   - 🌿 Middle (grammar + complexity)
   - 🔗 Middle Slavic (Slavic connections)
   - 📖 Misc (idioms, slang, folklore)
   - 🌍 Language Comparison (grammar, vocabulary)
   - 💬 Expressions (food, love, culture)
3. **Category Selection**: Pick from 28 available categories
4. **Lesson**: Bulgarian text → Click to reveal translation → Navigate with buttons
5. **Navigation**: Next/Previous, change level, change category, exit

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

**Sentences in MongoDB** (`sentences` collection):
```json
{
  "bg": "Здравей",
  "eng": "Hello",
  "ua": "Привіт",
  "kharkiv": "Привіт (Kharkiv dialect)",
  "folder": "basic",
  "category": "greetings"
}
```

**Categories in MongoDB** (`categories` collection):
```json
{
  "id": "greetings",
  "name": "Greetings",
  "emoji": "👋",
  "folder": "basic",
  "sentenceCount": 50
}
```

**User progress in MongoDB** (`user_progress` collection):
```json
{
  "userId": 123456,
  "currentIndex": 5,
  "category": "greetings",
  "folder": "basic",
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

For production deployment, use Docker and docker-compose:

```bash
# Build and push image to registry
docker build -t bg-bot:latest .
docker push your-registry/bg-bot:latest

# Deploy with docker-compose
docker-compose -f docker-compose.yml up -d
```

### Tech Stack

- **Docker** - Containerization
- **Docker Compose** - Multi-service orchestration
- **Nginx** - Reverse proxy
- **MongoDB Atlas** - Cloud database
- **Node.js** - Runtime

## Stage 1 Scope (MVP)

✅ Sentence-based learning (28 categories, 602 sentences)  
✅ Multi-language support (BG → ENG/UA/Kharkiv)  
✅ 6 independent learning levels  
✅ User progress tracking (MongoDB Atlas)  
✅ Docker containerization & docker-compose  
✅ Web testing interface  
✅ REST API for content browsing  
✅ Automated data migration from JSON to MongoDB  

❌ Grammar explanations  
❌ AI/audio/video  
❌ SRS algorithms  
❌ Analytics/gamification  
❌ Complex schemas  

## License

MIT
