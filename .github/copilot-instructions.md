# Copilot Instructions for bg-bot

MVP: Bulgarian language learning Telegram bot (Node.js + TypeScript + MongoDB).

## Mental Model

This is **disposable MVP code optimized for speed and clarity**. STAGE 1 only: import Anki decks → MongoDB → basic sentence delivery in Telegram. No grammar, AI, audio, SRS, analytics, gamification, or complex schemas.

## Scope Constraints (MANDATORY)

❌ No grammar explanations, AI, audio/video, SRS algorithms, analytics, gamification, complex schemas  
✅ Sentence-based learning: display Bulgarian → reveal translation on button click → save user progress  
✅ n8n for background workflows (imports) ONLY—no bot logic in n8n

## Architecture

**Data model (minimal):**
- `sentences`: `{ bg: string, translation: string, source: string }`
- `user_progress`: `{ userId: number, currentIndex: number }`

**Components:**
- `src/bot/`: Telegram interaction (message handlers, inline keyboards, user state)
- `src/db/`: MongoDB client & queries (fetch sentences, save/load progress)
- `src/types/`: TypeScript interfaces (Sentence, UserProgress)
- `src/index.ts`: Bot initialization & polling setup

**Data flow:**
1. User sends `/start` → load user progress from MongoDB
2. Bot fetches next sentence by index → displays Bulgarian text
3. User clicks "Show translation" → reveals translation + next/prev buttons
4. User clicks next → increment index, save to DB, fetch next sentence

## Code Style (ENFORCE)

- **Simple, boring, readable code** — explicit logic, minimal abstractions
- **One responsibility per file** — one handler per file, one query function per file
- **Async/await only** — no callbacks, no Promises returned
- **Strong typing** — all functions have input/output types; no `any`
- **No OOP patterns** — functions over classes (except Telegram bot SDK classes)

## Common Tasks

**Adding a new bot command:**
1. Create `src/bot/handlers/{commandName}.ts` with function signature: `async (msg: TelegramBot.Message, bot: TelegramBot): Promise<void>`
2. Export from `src/bot/handlers/index.ts`
3. Register in polling setup: `bot.onText(/\/command/, async (msg) => { ... })`

**Adding a MongoDB query:**
1. Create function in `src/db/queries.ts` with explicit types
2. Always open & close connection within function (no global connection state)
3. Example: `async function getSentence(index: number): Promise<Sentence | null>`

**Debugging:**
- Use `console.log()` for inline debugging (temporary)
- Check `.env` for `MONGO_URI`, `TELEGRAM_TOKEN`, `BOT_USERNAME`
- Test locally: `npm run dev` (ts-node with watch mode)

## Key Files

- `src/index.ts` — entry point, bot polling setup
- `src/bot/handlers/` — command handlers (start, next, reveal, etc.)
- `src/db/queries.ts` — MongoDB CRUD operations
- `src/types/index.ts` — Sentence, UserProgress, Telegram message types

## Stack & Dependencies

- **telegram-bot-api** — Telegram Bot API client
- **mongodb** — MongoDB driver (no ORM—plain queries)
- **dotenv** — environment variables
- **typescript** — static typing
- **ts-node** — TypeScript execution

n8n manages background imports (separate workflow, not in this codebase).

---

**Update this file as STAGE 1 evolves. Remove this section when moving to STAGE 2.**
