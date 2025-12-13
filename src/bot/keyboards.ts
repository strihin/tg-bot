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
        { text: "1️⃣6️⃣5️⃣4️⃣", callback_data: 'lang_to_ru' },
      ]
    ],
  },
};
