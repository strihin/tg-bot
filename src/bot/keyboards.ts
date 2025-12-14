import { LEVELS } from '../constants';

/**
 * Generate level/folder selection keyboard dynamically from LEVELS constant
 */
const generateLevelSelectKeyboard = () => {
  return {
    inline_keyboard: Object.entries(LEVELS).map(([key, level]) => (
      [
        {
          text: `${level.emoji} ${level.name} - ${level.description}`,
          callback_data: `folder_${key}`,
        },
      ]
    )),
  };
};

export const lessonKeyboards = {
  showTranslation: {
    inline_keyboard: [
      [{ text: '📖 Show translation', callback_data: 'show_translation' }],
      [{ text: '⏭️ Skip to next', callback_data: 'next' }],
      [
        { text: '📚 Change folder', callback_data: 'change_folder' },
        { text: '🏠 Main menu', callback_data: 'back_to_menu' },
      ],
    ],
  },

  withNavigation: {
    inline_keyboard: [
      [
        { text: '⬅️ Previous', callback_data: 'prev' },
        { text: 'Next ➡️', callback_data: 'next' },
      ],
      [
        { text: '📚 Change folder', callback_data: 'change_folder' },
        { text: '🏠 Main menu', callback_data: 'back_to_menu' },
      ],
      [{ text: '❌ Exit lesson', callback_data: 'exit' }],
    ],
  },

  lessonComplete: {
    inline_keyboard: [
      [{ text: '📚 Choose another category', callback_data: 'exit' }],
    ],
  },

  levelSelect: generateLevelSelectKeyboard(),

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
