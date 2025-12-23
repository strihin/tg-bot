# Project Structure

Organized for clarity and maintainability.

```
bg-bot/
├── README.md                    # Main project documentation
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
│
├── src/                         # Application source code
│   ├── bot/                     # Telegram bot logic
│   ├── data/                    # Data loading & persistence
│   ├── db/                      # Database operations
│   ├── utils/                   # Utility functions
│   └── index.ts                 # Entry point
│
├── data/                        # Bulgarian sentence datasets
│   ├── basic/                   # Basic level lessons
│   ├── middle/                  # Intermediate level
│   ├── expressions/             # Common expressions
│   ├── misc/                    # Miscellaneous
│   ├── language-comparison/     # Grammar & vocabulary
│   └── middle-slavic/           # Slavic language features
│
├── public/                      # Static web files
│   └── index.html               # Web interface
│
├── docs/                        # Documentation (read these!)
│   ├── README.md                # Start here → START_HERE.md
│   ├── START_HERE.md            # Navigation guide (READ FIRST)
│   ├── QUICK_START.md           # 5-minute setup
│   ├── LOCAL_DEVELOPMENT.md     # Local development guide
│   ├── PRODUCTION_DEPLOYMENT.md # VPS deployment (Hostinger)
│   ├── CONFIGURATION.md         # Environment variables
│   ├── ENV_FILES_GUIDE.md       # .env files explained
│   ├── DOCUMENTATION_CHANGES.md # What changed
│   └── DOCS_GUIDE.txt           # Documentation structure
│
├── config/                      # Docker & server configuration
│   ├── docker-compose.yml       # Production setup
│   ├── docker-compose.dev.yml   # Development setup
│   ├── Dockerfile               # Container definition
│   ├── docker-entrypoint.sh     # Container startup script
│   └── nginx.conf               # Nginx reverse proxy config
│
├── scripts/                     # Shell scripts for common tasks
│   ├── build.sh                 # Build Docker image
│   ├── run.sh                   # Run production container
│   ├── dev.sh                   # Development setup
│   ├── run-dev.sh               # Run development container
│   └── start-dev.sh             # Start development environment
│
├── env-templates/               # Environment variable templates
│   ├── .env.example             # Template for main config
│   ├── .env.dev.example         # Template for dev setup
│   ├── .env.mongodb.example     # Template for local MongoDB
│   ├── .env.prod.bak.example    # Template for production backup
│   └── (actual .env files - git ignored)
│
└── .gitignore                   # Git ignore rules
```

---

## Quick Reference

### Documentation

Start with `docs/START_HERE.md` - it will guide you to the right place.

- **Quick setup?** → `docs/QUICK_START.md`
- **Local development?** → `docs/LOCAL_DEVELOPMENT.md`
- **Production deployment?** → `docs/PRODUCTION_DEPLOYMENT.md`
- **Configure variables?** → `docs/CONFIGURATION.md`
- **Environment files?** → `docs/ENV_FILES_GUIDE.md` or `env-templates/`

### Scripts

```bash
./scripts/build.sh       # Build Docker image
./scripts/run.sh         # Run production container
./scripts/dev.sh         # Setup development
./scripts/run-dev.sh     # Run dev container
./scripts/start-dev.sh   # Start dev environment
```

### Docker

```bash
# Use scripts or direct docker-compose:
docker-compose -f config/docker-compose.yml up -d          # Production
docker-compose -f config/docker-compose.dev.yml up --build # Development
```

### Environment Setup

```bash
# Copy a template
cp env-templates/.env.example .env
nano .env  # Fill in your values

# For local MongoDB (optional)
cp env-templates/.env.mongodb.example .env.mongodb
```

---

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/` | Application code (TypeScript) |
| `data/` | Bulgarian sentence datasets (JSON) |
| `public/` | Static web files |
| `docs/` | **All documentation** |
| `config/` | Docker & Nginx configuration |
| `scripts/` | Helper shell scripts |
| `env-templates/` | Environment variable templates |

---

## Getting Started

1. **Read** `docs/START_HERE.md`
2. **Choose your path:**
   - Quick try? → `docs/QUICK_START.md`
   - Local dev? → `docs/LOCAL_DEVELOPMENT.md`
   - Deploy? → `docs/PRODUCTION_DEPLOYMENT.md`
3. **Copy templates** from `env-templates/`
4. **Run the bot!**

---

## Clean Root Directory

The root directory is now clean with only essential files:
- ✅ `README.md` - Project overview
- ✅ `package.json` - Dependencies
- ✅ `tsconfig.json` - TypeScript config
- ✅ Folders for code, config, docs, etc.

Everything else is organized into proper subdirectories for easy navigation!
