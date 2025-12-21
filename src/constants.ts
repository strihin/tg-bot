/**
 * Language metadata - centralized constants
 */
export const LANGUAGES = {
  bg: {
    code: 'bg',
    name: 'Bulgarian',
    emoji: '🇧🇬',
  },
  eng: {
    code: 'eng',
    name: 'English',
    emoji: '🇬🇧',
  },
  kharkiv: {
    code: 'kharkiv',
    name: 'Kharkiv (Ukrainian Dialect)',
    emoji: '1654',
  },
  ua: {
    code: 'ua',
    name: 'Українська',
    emoji: '🇺🇦',
  },
} as const;

/**
 * Data modules
 */
export const MODULES = {
  core: {
    name: 'Core',
    emoji: '📚',
    description: 'Learning levels (Basic, Middle, Middle-Slavic)',
  },
  misc: {
    name: 'Miscellaneous',
    emoji: '📖',
    description: 'Folk lore, idioms, names, slang, weather',
  },
  'language-comparison': {
    name: 'Language Comparison',
    emoji: '🌍',
    description: 'Compare Bulgarian with other languages (grammar, vocabulary, phonetics, syntax)',
  },
  expressions: {
    name: 'Expressions',
    emoji: '💬',
    description: 'Phrases and expressions (food, love, rakiya, soft insults)',
  },
} as const;

/**
 * Learning levels (folders) - 6 independent, parallel levels
 */
export const LEVELS = {
  basic: {
    name: 'Basic',
    emoji: '🌱',
    description: 'Simple sentences - no grammar explanation',
  },
  middle: {
    name: 'Middle',
    emoji: '🌿',
    description: 'Sentences with grammar tags and explanations',
  },
  'middle-slavic': {
    name: 'Middle Slavic',
    emoji: '🔗',
    description: 'Advanced: false friends, Slavic comparisons, cultural notes',
  },
  misc: {
    name: 'Miscellaneous',
    emoji: '📖',
    description: 'Folklore, idioms, names, slang, weather',
  },
  'language-comparison': {
    name: 'Language Comparison',
    emoji: '🌍',
    description: 'Grammar, vocabulary, phonetics, syntax comparisons',
  },
  expressions: {
    name: 'Expressions',
    emoji: '💬',
    description: 'Food, love, rakiya, soft insults',
  },
} as const;

/**
 * Category metadata with emojis for CORE module
 */
const CORE_CATEGORIES = {
  direction: {
    name: 'Direction',
    emoji: '🗺️',
  },
  greetings: {
    name: 'Greetings',
    emoji: '👋',
  },
  help: {
    name: 'Help',
    emoji: '🆘',
  },
  restaurant: {
    name: 'Restaurant',
    emoji: '🍽️',
  },
  shopping: {
    name: 'Shopping',
    emoji: '🛒',
  },
  // Middle level categories
  'aorist-past': {
    name: 'Aorist Past',
    emoji: '⏮️',
  },
  future: {
    name: 'Future',
    emoji: '⏭️',
  },
  'imperfect-past': {
    name: 'Imperfect Past',
    emoji: '⏪',
  },
  present: {
    name: 'Present',
    emoji: '⏱️',
  },
  question: {
    name: 'Question',
    emoji: '❓',
  },
  // Middle-Slavic categories
  'false-friends': {
    name: 'False Friends',
    emoji: '⚠️',
  },
  'modern-lexicon': {
    name: 'Modern Lexicon',
    emoji: '📱',
  },
  'swear-words': {
    name: 'Swear Words',
    emoji: '🤬',
  },
} as const;

/**
 * Category metadata for MISC module
 */
const MISC_CATEGORIES = {
  folkclore: {
    name: 'Folklore',
    emoji: '🎭',
  },
  idioms: {
    name: 'Idioms',
    emoji: '💭',
  },
  names: {
    name: 'Names',
    emoji: '👤',
  },
  'political-slang': {
    name: 'Political Slang',
    emoji: '🗣️',
  },
  weather: {
    name: 'Weather',
    emoji: '⛅',
  },
  'youth-slang': {
    name: 'Youth Slang',
    emoji: '👨‍🎓',
  },
} as const;

/**
 * Category metadata for LANGUAGE-COMPARISON module
 */
const COMPARISON_CATEGORIES = {
  grammar: {
    name: 'Grammar',
    emoji: '📝',
  },
  vocabulary: {
    name: 'Vocabulary',
    emoji: '📖',
  },
  phonetics: {
    name: 'Phonetics',
    emoji: '🔊',
  },
  syntax: {
    name: 'Syntax',
    emoji: '⚙️',
  },
} as const;

/**
 * Category metadata for EXPRESSIONS module
 */
const EXPRESSIONS_CATEGORIES = {
  food: {
    name: 'Food',
    emoji: '🍕',
  },
  love: {
    name: 'Love',
    emoji: '❤️',
  },
  rakiya: {
    name: 'Rakiya',
    emoji: '🥃',
  },
  'soft-insult': {
    name: 'Soft Insults',
    emoji: '😏',
  },
} as const;

/**
 * Merged categories by module
 */
export const CATEGORIES = {
  ...CORE_CATEGORIES,
  ...MISC_CATEGORIES,
  ...COMPARISON_CATEGORIES,
  ...EXPRESSIONS_CATEGORIES,
} as const;

export type LanguageCode = keyof typeof LANGUAGES;
export type CategoryName = keyof typeof CATEGORIES;
