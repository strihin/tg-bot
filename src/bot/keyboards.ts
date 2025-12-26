import TelegramBot from 'node-telegram-bot-api';
import { LEVELS } from '../constants';
import { TargetLanguage } from '../types';
import { getUIText } from '../utils/uiTranslation';
import { isFolderCompleted } from '../data/completion';
import { getAvailableCategories, getTotalSentences } from '../data/loader';
import { SentenceMasteryModel } from '../db/models';

/**
 * Get folder completion stats (total mastered / total sentences)
 */
async function getFolderStats(userId: number, folderKey: string) {
  try {
    const categories = await getAvailableCategories(folderKey as any);
    let totalMastered = 0;
    let totalSentences = 0;

    for (const category of categories) {
      const categoryTotal = await getTotalSentences(category, folderKey as any);
      const categoryMastered = await SentenceMasteryModel.countDocuments({
        userId,
        folder: folderKey,
        category,
        status: { $in: ['learned', 'known'] }
      });
      totalSentences += categoryTotal;
      totalMastered += categoryMastered;
    }

    const percentage = totalSentences > 0 ? Math.round((totalMastered / totalSentences) * 100) : 0;
    return { mastered: totalMastered, total: totalSentences, percentage };
  } catch (e) {
    console.log(`⚠️ Could not fetch folder stats for ${folderKey}:`, e);
    return { mastered: 0, total: 0, percentage: 0 };
  }
}

/**
 * Generate level/folder selection keyboard dynamically from LEVELS constant
 * This async version includes completion status for folders
 */
export async function generateLevelSelectKeyboardWithCompletion(language: TargetLanguage = 'eng', userId?: number) {
  const buttons = await Promise.all(Object.entries(LEVELS).map(async ([key, level]) => {
    const keyWithUnderscores = key.replace(/-/g, '_');
    const completionIcon = userId ? (await isFolderCompleted(userId, key as any) ? ' ✅' : '') : '';
    const levelName = getUIText(`level_${keyWithUnderscores}`, language);

    // Get folder stats instead of description
    let statsText = '';
    if (userId) {
      const stats = await getFolderStats(userId, key);
      statsText = `${stats.mastered}/${stats.total} (${stats.percentage}%)`;
    }

    return [
      {
        text: `${levelName} - ${statsText}${completionIcon}`,
        callback_data: `folder_${key}`,
      },
    ];
  }));

  return {
    inline_keyboard: buttons,
  };
}

/**
 * Generate level/folder selection keyboard dynamically from LEVELS constant (synchronous)
 */
const generateLevelSelectKeyboard = (language: TargetLanguage = 'eng') => {
  return {
    inline_keyboard: Object.entries(LEVELS).map(([key, level]) => {
      const keyWithUnderscores = key.replace(/-/g, '_');
      const levelName = getUIText(`level_${keyWithUnderscores}`, language);
      return [
        {
          text: `${levelName}`,
          callback_data: `folder_${key}`,
        },
      ];
    }),
  };
};

/**
 * Get dynamic lesson keyboards with translations
 */
const getLessonKeyboards = (language: TargetLanguage = 'eng', category?: string, folder?: string, index?: number) => {
  return {
    showTranslation: {
      inline_keyboard: [
        [
          { text: getUIText('previous', language), callback_data: 'prev' },
          { text: getUIText('next', language), callback_data: 'next' },
        ],
        [
          {
            text: getUIText('back_to_categories', language),
            callback_data: 'back_to_categories',
          },
          {
            text: getUIText('add_favourite', language),
            callback_data: 'add_favourite',
          },
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
          {
            text: getUIText('add_favourite', language),
            callback_data: 'add_favourite',
          },
        ],
        [{ text: getUIText('exit_lesson', language), callback_data: 'exit' }],
      ],
    },

    lessonComplete: {
      inline_keyboard: [
        [{ text: getUIText('choose_another', language), callback_data: 'change_folder' }],
      ],
    },

    // Quick resume keyboard: "Continue [Category]?" with Yes/No
    quickResume: (category: string, language: TargetLanguage = 'eng') => ({
      inline_keyboard: [
        [
          { text: '✅ Continue', callback_data: 'resume_lesson' },
          { text: '❌ Choose new', callback_data: 'new_lesson' },
        ],
      ],
    }),

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
};

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
 * @param category - Optional: current category for building audio player URL
 * @param folder - Optional: current folder for building audio player URL
 * @param index - Optional: current sentence index for building audio player URL
 * @returns Object with all lesson keyboard layouts
 */
export function getTranslatedKeyboards(language: TargetLanguage = 'eng', category?: string, folder?: string, index?: number) {
  const keyboards = getLessonKeyboards(language, category, folder, index);
  keyboards.levelSelect = generateLevelSelectKeyboard(language);
  return keyboards;
}

/**
 * Get translated keyboards with completion status (async version)
 * Use this for main menu level selection to show completion emojis
 */
export async function getTranslatedKeyboardsWithCompletion(language: TargetLanguage = 'eng', userId?: number) {
  const keyboards = getLessonKeyboards(language);
  keyboards.levelSelect = await generateLevelSelectKeyboardWithCompletion(language, userId);
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

/**
 * Get persistent keyboard based on language
 * Provides language-translated menu buttons in a single row
 * Order: Back -> Home -> Profile
 */
export function getPersistentKeyboard(language: string) {
  const keyboards: { [key: string]: any } = {
    eng: {
      keyboard: [
        [{ text: '⬅️ Back' }, { text: '🏠 Home' }, { text: '👤 Profile' }]
      ],
      resize_keyboard: true,
      persistent: true,
      one_time_keyboard: false,
      input_field_placeholder: 'Write a message...'
    },
    kharkiv: {
      keyboard: [
        [{ text: '⬅️ Назад' }, { text: '🏠 Меню' }, { text: '👤 Профиль' }]
      ],
      resize_keyboard: true,
      persistent: true,
      one_time_keyboard: false,
      input_field_placeholder: 'Напишите сообщение...'
    },
    ua: {
      keyboard: [
        [{ text: '⬅️ Назад' }, { text: '🏠 Меню' }, { text: '👤 Профіль' }]
      ],
      resize_keyboard: true,
      persistent: true,
      one_time_keyboard: false,
      input_field_placeholder: 'Напишіть повідомлення...'
    }
  };
  
  return keyboards[language] || keyboards['eng'];
}

/**
 * Legacy exports for backward compatibility
 */
export const persistentMenuKeyboardKharkiv = getPersistentKeyboard('kharkiv');
export const persistentMenuKeyboardEn = getPersistentKeyboard('eng');
export const persistentMenuKeyboardUa = getPersistentKeyboard('ua');