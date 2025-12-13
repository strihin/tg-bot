# Bulgarian Language Learning Telegram Bot 🇧🇬

A minimal MVP Telegram bot for learning Bulgarian language with multi-language support (Bulgarian → English/Russian/Ukrainian).

## Features

- 🗺️ 5 lesson categories: direction, greetings, help, restaurant, shopping
- 📚 250+ Bulgarian sentences with translations to English, Russian, Ukrainian
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

## Stage 1 Scope (MVP)

✅ Sentence-based learning (5 categories, 250+ sentences)  
✅ Multi-language support (BG → ENG/RU/UA)  
✅ User progress tracking  
✅ Simple JSON-based storage  

❌ Grammar explanations  
❌ AI/audio/video  
❌ SRS algorithms  
❌ Analytics/gamification  
❌ Complex schemas  

## License

MIT
