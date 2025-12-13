export const lessonKeyboards = {
  showTranslation: {
    inline_keyboard: [
      [{ text: '📖 Show translation', callback_data: 'show_translation' }],
      [{ text: '⏭️ Skip to next', callback_data: 'next' }],
    ],
  },

  withNavigation: {
    inline_keyboard: [
      [
        { text: '⬅️ Previous', callback_data: 'prev' },
        { text: 'Next ➡️', callback_data: 'next' },
      ],
      [{ text: '❌ Exit lesson', callback_data: 'exit' }],
    ],
  },

  lessonComplete: {
    inline_keyboard: [
      [{ text: '📚 Choose another category', callback_data: 'exit' }],
    ],
  },

  levelSelect: {
    inline_keyboard: [
      [{ text: '🌱 Basic - Simple sentences', callback_data: 'level_basic' }],
      [{ text: '🌿 Middle - With grammar tips', callback_data: 'level_middle' }],
      [{ text: '🔗 Middle Slavic - False friends & culture', callback_data: 'level_middle-slavic' }],
    ],
  },

  startMenu: {
    inline_keyboard: [
      [{ text: '🚀 Start lesson', callback_data: 'start_lesson' }],
      [{ text: '📖 Continue', callback_data: 'continue_lesson' }],
    ],
  },

  sourceLanguageSelect: {
    inline_keyboard: [
      [
        { text: '🇧🇬 Bulgarian (BG)', callback_data: 'lang_from_bg' },
      ],
    ],
  },

  targetLanguageSelect: {
    inline_keyboard: [
      [
        { text: '🇬🇧', callback_data: 'lang_to_eng' },
        { text: '🇺🇦', callback_data: 'lang_to_ua' },
        { text: '1654', callback_data: 'lang_to_ru' },
      ]
    ],
  },
};
