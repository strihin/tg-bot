# Extended Learning Levels - Update Summary

## New Structure

### Three Learning Levels Now Supported:

1. **🌱 Basic** - Simple sentences, clean UI
2. **🌿 Middle** - Grammar tags + explanations  
3. **🔗 Middle Slavic** - False friends + Slavic comparisons + cultural notes

### Data Organization:
```
data/
├── basic/                  # Basic level sentences
├── middle/                 # Middle level (grammar enhanced)
└── middle-slavic/          # Middle-slavic specific content
    ├── false-friends.json
    ├── modern-lexicon.json
    ├── present.json
    └── swear-words.json
```

## Enhanced Sentence Interface

### New Fields Added:

```typescript
interface Sentence {
  bg: string;
  eng: string;
  ru: string;
  ua: string;
  source: string;
  
  // Middle level fields
  grammar?: string[];       // e.g., ['imperative', 'informal']
  explanation?: string;     // Grammar explanation
  
  // Middle-Slavic level fields
  tag?: string;             // e.g., 'false-friend'
  ruleEng?: string;         // Rule in English
  ruleRu?: string;          // Rule in Russian
  ruleUA?: string;          // Rule in Ukrainian
  comparison?: string;      // Slavic comparison
  falseFriend?: string;     // False friend note
}
```

## Updated User Types

### UserProgress Now Includes:
```typescript
interface UserProgress {
  level: 'basic' | 'middle' | 'middle-slavic';  // Extended!
  // ... other fields remain same
}
```

## Display Logic by Level

### Basic Level → Shows:
```
📚 GREETINGS | 🇧🇬 → 🇬🇧
⏳ 1/50
Здравей
🎯 Hello
```

### Middle Level → Adds:
```
📝 Grammar: #imperative #informal
💡 Informal command form. Used with friends.
```

### Middle-Slavic Level → Adds:
```
⚠️ FALSE FRIEND!
🔴 Looks like 'стол' (table), but means 'chair'!

🔗 Slavic Bridge: Русский стол = болгарский маса.

📖 (Language-specific rule for selected language)
```

## Modified Files

| File | Changes |
|------|---------|
| `src/types.ts` | Added falseFriend, comparison, rules fields; updated level type |
| `src/constants.ts` | Added middle-slavic level metadata (emoji: 🔗) |
| `src/data/loader.ts` | Support for middle-slavic directory structure |
| `src/data/progress.ts` | Accept 'middle-slavic' in initializeUserProgress |
| `src/bot/keyboards.ts` | Added middle-slavic option to levelSelect |
| `src/bot/handlers/level.ts` | Accept 'middle-slavic' type |
| `src/bot/handlers/lesson.ts` | Display falseFriend, comparison, and rules for middle-slavic |
| `src/bot/index.ts` | No changes needed (level_ prefix catches all) |

## Example: False Friend Display

When user selects Middle-Slavic and reveals translation:

```
📚 FALSE-FRIENDS | 🇧🇬 → 🇬🇧
⏳ 1/79

стол

🎯 chair

⚠️ FALSE FRIEND!
🔴 Классический ложный друг №1.

🔗 Slavic Bridge: Русский стол = болгарский маса.

📖 Looks like 'стол' (table), but means 'chair'.
```

## TypeScript Compilation
✅ All types properly updated  
✅ No compilation errors  
✅ Full backward compatibility maintained

## Ready to Use
- Users can now select Middle-Slavic level
- All 3 middle-slavic categories available
- Grammar, false friends, and Slavic notes display correctly
- Language-specific rules shown based on target language

---

**Next Steps**: Content creators can add more Slavic-focused content to middle-slavic categories as needed.
