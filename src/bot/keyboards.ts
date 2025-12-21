import { LEVELS } from '../constants';
import { TargetLanguage } from '../types';
import { getUIText } from '../utils/uiTranslation';

/**
 * Generate level/folder selection keyboard dynamically from LEVELS constant
 */
const generateLevelSelectKeyboard = (language: TargetLanguage = 'eng') => {
  return {
    inline_keyboard: Object.entries(LEVELS).map(([key, level]) => (
      [
        {
          text: `${level.emoji} ${getUIText(`level_${key}`, language)} - ${getUIText(`${key}_desc`, language)}`,
          callback_data: `folder_${key}`,
        },
      ]
    )),
  };
};

/**
 * Get dynamic lesson keyboards with translations
 */
const getLessonKeyboards = (language: TargetLanguage = 'eng') => ({
  showTranslation: {
    inline_keyboard: [
      [{ text: getUIText('show_translation', language), callback_data: 'show_translation' }],
      [{ text: getUIText('skip_next', language), callback_data: 'next' }],
      [
        { text: getUIText('change_folder', language), callback_data: 'change_folder' },
        { text: getUIText('main_menu', language), callback_data: 'back_to_menu' },
      ],
    ],
  },

  withNavigation: {
    inline_keyboard: [
      [
        { text: getUIText('previous', language), callback_data: 'prev' },
        { text: getUIText('next', language), callback_data: 'next' },
      ],
      [
        { text: getUIText('change_folder', language), callback_data: 'change_folder' },
        { text: getUIText('main_menu', language), callback_data: 'back_to_menu' },
      ],
      [{ text: getUIText('exit_lesson', language), callback_data: 'exit' }],
    ],
  },

  lessonComplete: {
    inline_keyboard: [
      [{ text: getUIText('choose_another', language), callback_data: 'exit' }],
    ],
  },

  levelSelect: undefined as any, // Will be generated dynamically

  startMenu: {
    inline_keyboard: [
      [{ text: getUIText('start_new', language), callback_data: 'start_lesson' }],
      [{ text: getUIText('resume_lesson', language), callback_data: 'continue_lesson' }],
    ],
  },

  sourceLanguageSelect: {
    inline_keyboard: [
      [
        { text: '��🇬 Bulgarian (BG)', callback_data: 'lang_from_bg' },
      ],
    ],
  },

  targetLanguageSelect: {
    inline_keyboard: [
      [
        { text: '🇬🇧', callback_data: 'lang_to_eng' },
        { text: '🇺🇦', callback_data: 'lang_to_ua' },
        { text: '🎭', callback_data: 'lang_to_kharkiv' },
      ]
    ],
  },
});

// Static keyboards that don't need translation
export const staticKeyboards = {
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
        { text: '🎭', callback_data: 'lang_to_kharkiv' },
      ]
    ],
  },
};

/**
 * Get translated lesson keyboards for a given language
 * @param language - Target language for translations
 * @returns Object with all lesson keyboard layouts
 */
export function getTranslatedKeyboards(language: TargetLanguage = 'eng') {
  const keyboards = getLessonKeyboards(language);
  keyboards.levelSelect = generateLevelSelectKeyboard(language);
  return keyboards;
}

/**
 * Legacy export for backward compatibility - returns English keyboards
 */
export const lessonKeyboards = (() => {
  const keyboards = getLessonKeyboards('eng');
  keyboards.levelSelect = generateLevelSelectKeyboard('eng');
  return keyboards;
})();
