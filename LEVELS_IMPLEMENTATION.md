# Learning Levels System - Implementation Summary

## Overview
Implemented a **two-level learning system** (Basic and Middle) that separates learning paths based on grammar awareness:

- **🌱 Basic Level**: Simple sentences without grammar explanations (original behavior)
- **🌿 Middle Level**: Same sentences + grammar tags + short explanations

## Data Structure

### Directory Organization
```
data/
├── basic/           # Original sentences (no grammar)
│   ├── greetings.json
│   ├── direction.json
│   ├── help.json
│   ├── restaurant.json
│   └── shopping.json
├── middle/          # Enhanced sentences with grammar (to be filled)
│   ├── greetings.json
│   ├── direction.json
│   ├── help.json
│   ├── restaurant.json
│   └── shopping.json
├── .progress/       # User progress files
└── greetings.json   # Root copies (for backward compatibility)
```

### Sentence Structure (Enhanced)
```json
{
  "bg": "Здравей",
  "eng": "Hello (informal)",
  "ru": "Привет",
  "ua": "Привіт",
  "source": "greetings",
  "grammar": ["imperative", "informal"],
  "explanation": "Informal command form. Used with friends."
}
```

## User Flow Changes

### New Flow (with Levels)
```
/start 
  ↓
Select Language (eng/ru/ua)
  ↓
Select Level (Basic/Middle) ← NEW
  ↓
Select Category
  ↓
Start Lesson (with level-specific sentences)
```

## Type Updates

### UserProgress Interface
```typescript
export interface UserProgress {
  userId: number;
  currentIndex: number;
  category: string;
  level: 'basic' | 'middle';  // NEW
  languageFrom: 'bg';
  languageTo: 'eng' | 'ru' | 'ua';
  lessonMessageId?: number;
  lessonActive?: boolean;
}
```

### Sentence Interface
```typescript
export interface Sentence {
  bg: string;
  eng: string;
  ru: string;
  ua: string;
  source: string;
  grammar?: string[];     // NEW: Grammar tags
  explanation?: string;   // NEW: Short explanation
}
```

## Modified Files

### Data Loading (`src/data/loader.ts`)
- ✅ `loadSentences(category, level)` - supports level parameter
- ✅ `getSentenceByIndex(category, index, level)` - loads level-specific sentences
- ✅ `getTotalSentences(category, level)` - returns count for level

### Types (`src/types.ts`)
- ✅ Added `level: 'basic' | 'middle'` to `UserProgress`
- ✅ Added `grammar?: string[]` and `explanation?: string` to `Sentence`

### Constants (`src/constants.ts`)
- ✅ Added `LEVELS` constant with metadata:
  ```typescript
  basic: { name: 'Basic', emoji: '🌱', description: '...' }
  middle: { name: 'Middle', emoji: '🌿', description: '...' }
  ```

### Lesson Handlers (`src/bot/handlers/lesson.ts`)
- ✅ `handleStartLessonButton`: Passes `progress.level` to loaders
- ✅ `handleShowTranslation`: Shows grammar tags and explanation for middle level
- ✅ `handleNext/handlePrevious`: Load level-specific sentences

### New Level Handler (`src/bot/handlers/level.ts`)
- ✅ `handleSelectLevel`: Processes level selection and updates user progress
- ✅ Shows level description and routes to category selection

### Bot Logic (`src/bot/index.ts`)
- ✅ Added level selection callback handling (`level_basic`, `level_middle`)
- ✅ Integrated `handleSelectLevel` into callback routing

### Keyboards (`src/bot/keyboards.ts`)
- ✅ Added `levelSelect` keyboard with two options

### Progress (`src/data/progress.ts`)
- ✅ Updated `initializeUserProgress` to accept and store level (default: 'basic')

## Features

### Grammar Display (Middle Level Only)
When user selects "Show translation" in Middle level:
```
📚 GREETINGS | 🇧🇬 → 🇬🇧

⏳ 1/50

Здравей

🎯 Hello (informal)

📝 Grammar: #imperative #informal
💡 Informal command form. Used with friends.
```

### Basic Level (Unchanged)
Same as before - no grammar tags or explanations shown.

## Next Steps to Complete Middle Level

1. **Add Grammar Data**: Update `data/middle/*.json` with actual grammar tags and explanations
2. **Quality Assurance**: Ensure grammar explanations are accurate and helpful
3. **Testing**: Test switching between levels, verify grammar displays correctly

## Backward Compatibility
- Root-level JSON files remain for fallback
- Existing lessons work unchanged on Basic level
- Users can switch levels anytime via new `/start` command flow

---

**Status**: ✅ Architecture complete, ready for grammar data integration
