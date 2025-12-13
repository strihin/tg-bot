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
  ru: {
    code: 'ru',
    name: 'Харьковский диалект',
    emoji: '1️⃣6️⃣5️⃣4️⃣',
  },
  ua: {
    code: 'ua',
    name: 'Українська',
    emoji: '🇺🇦',
  },
} as const;

/**
 * Category metadata with emojis
 */
export const CATEGORIES = {
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
} as const;

export type LanguageCode = keyof typeof LANGUAGES;
export type CategoryName = keyof typeof CATEGORIES;
