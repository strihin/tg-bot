# Bulgarian Language Learning Telegram Bot 🇧🇬

A minimal MVP Telegram bot for learning Bulgarian language with multi-language support (Bulgarian → English/Ukrainian/Kharkiv Dialect).

## 🎯 Features

- 🗺️ **28 lesson categories** across 6 independent learning levels
- 📚 **602 Bulgarian sentences** with translations to English, Ukrainian, Kharkiv
- 🔄 **Multi-language support** (Bulgarian → ENG/UA/Kharkiv)
- 💾 **User progress tracking** via MongoDB with auto-mastery recording
- ✅ **Completion tracking** - see progress per category with checkmarks
- ⌨️ **Inline keyboard navigation** (next, previous, show translation)
- 📖 **Spoiler/blur effect** for translations - tap to reveal
- ⭐ **Save favourite sentences** for later practice
- 🎙️ **Audio support** for sentence pronunciation
- 📊 **Progress monitoring** across all categories

## 📚 Documentation

**Getting started?** Choose your path (all docs in `/docs`):

- **[🚀 Quick Start](docs/QUICK_START.md)** - 5 minutes to running locally
- **[💻 Local Development](docs/LOCAL_DEVELOPMENT.md)** - Full setup for Mac development
- **[🌍 Production Deployment](docs/PRODUCTION_DEPLOYMENT.md)** - Deploy to Hostinger + Cloudflare
- **[⚙️ Configuration](docs/CONFIGURATION.md)** - Environment variables reference
- **[📋 START_HERE](docs/START_HERE.md)** - Navigation guide (READ FIRST!)
- **[📂 Project Structure](PROJECT_STRUCTURE.md)** - How files are organized

## 🏗️ Project Structure

## 📂 Project Organization

```
bg-bot/
├── README.md              # You are here
├── PROJECT_STRUCTURE.md   # Detailed folder structure
├── package.json
├── src/                   # Application code
├── data/                  # Sentence datasets
├── public/                # Web interface
├── config/                # Docker & Nginx configs
├── scripts/               # Helper scripts
├── docs/                  # All documentation
└── env-templates/         # .env templates (samples)
```

For detailed structure, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## 🎮 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Begin or resume learning with language selection |
| `/help` | View complete guide (available in 🇬🇧🇷🇺🇺🇦) |
| `/progress` | See learning progress across all categories |
| `/favourite` | View and practice saved sentences |
| `/refresh` | Reset all progress and start fresh |

## 🗂️ Data Format

All data is stored in MongoDB with the following structure:

**Sentences** collection:
```json
{
  "bg": "Здравей",
  "eng": "Hello",
  "ua": "Привіт",
  "kharkiv": "Привіт (Kharkiv)",
  "folder": "basic",
  "category": "greetings"
}
```

**User Progress** collection:
```json
{
  "userId": 123456,
  "currentIndex": 5,
  "category": "greetings",
  "folder": "basic",
  "languageTo": "eng"
}
```

## 🛠️ Tech Stack

- **Node.js 18+** - Runtime
- **TypeScript** - Type safety
- **Telegram Bot API** - Bot framework
- **MongoDB Atlas** - Cloud database
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy

## 📋 Quick Links

| Goal | Guide |
|------|-------|
| Start right now | [Quick Start](docs/QUICK_START.md) |
| Develop locally | [Local Development](docs/LOCAL_DEVELOPMENT.md) |
| Deploy to production | [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md) |
| Configure settings | [Configuration](docs/CONFIGURATION.md) |
| See checklist | [START_HERE](docs/START_HERE.md) |

## 📄 License

MIT
```
src/
├── bot/                    # Telegram bot handlers
│   ├── index.ts           # Bot initialization & routing
│   ├── handlers/          # Command handlers
│   │   ├── lesson.ts      # Lesson navigation
│   │   ├── category.ts    # Category selection
│   │   └── language.ts    # Language selection
│   └── keyboards.ts       # Inline button layouts
├── data/                   # Data layer
│   ├── loader.ts          # JSON sentence loader
│   └── progress.ts        # User progress persistence
├── db/                    # MongoDB operations
│   ├── mongodb.ts         # Connection & queries
│   └── models.ts          # Data schemas
└── types.ts               # TypeScript interfaces
```
