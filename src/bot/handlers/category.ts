import TelegramBot from 'node-telegram-bot-api';
import { getAvailableCategories } from '../../data/loader';
import { CATEGORIES } from '../../constants';
import { FolderType } from '../../types';
import { getUIText } from '../../utils/uiTranslation';
import { getUserProgressAsync, saveUserProgress } from '../../data/progress';
import { isCategoryCompleted } from '../../data/completion';

/**
 * Create inline keyboard with available categories for a specific folder
 */
export async function getCategoryKeyboard(folder: FolderType = 'basic', language: string = 'eng', userId?: number) {
  const categories = await getAvailableCategories(folder);

  if (userId) {
    console.log(`🎯 [KEYBOARD] Building category keyboard for user ${userId}, folder: ${folder}`);
  }

  const buttons = await Promise.all(categories.map(async (category: string) => {
    const completed = userId ? await isCategoryCompleted(userId, folder, category) : false;
    const emoji = completed ? ' ✅' : '';
    console.log(`  → Category "${category}": completed=${completed} emoji="${emoji}"`);
    return [
      {
        text: `${CATEGORIES[category as keyof typeof CATEGORIES]?.emoji || '📚'} ${getUIText(`cat_${category}`, language as any)}${emoji}`,
        callback_data: `select_category:${category}`,
      },
    ];
  }));

  // Add back button to return to folder selection
  buttons.push([
    {
      text: '🔙 Back to folders',
      callback_data: 'change_folder',
    },
  ]);

  return {
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
}

/**
 * Handle category selection
 */
export async function handleSelectCategory(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    // Answer callback immediately to prevent duplicate delivery
    await bot.answerCallbackQuery(callbackQuery.id);

    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    if (!chatId) return;

    const data = callbackQuery.data || '';
    const category = data.replace('select_category:', '');

    // Get user's language preference and progress
    const progress = await getUserProgressAsync(userId);
    const language = progress?.languageTo || 'eng';

    const categoryMeta = CATEGORIES[category as keyof typeof CATEGORIES];
    const emoji = categoryMeta?.emoji || '📚';
    const categoryName = getUIText(`cat_${category}`, language as any);

    const messageText = `${emoji} Starting lesson in **${categoryName}** category...\n\n⏱️ Click below to begin:`;
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '▶️ Start Lesson',
            callback_data: `start_lesson:${category}`,
          },
        ],
      ],
    };

    // Always try to edit the current message first, fall back to send new
    if (messageId) {
      try {
        await bot.editMessageText(messageText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup,
        });
        console.log(`✏️ Edited category message ${messageId}`);
        if (progress) {
          progress.menuMessageId = messageId;
        }
      } catch (error) {
        console.log(`⚠️ Failed to edit category, sending new:`, error);
        const msg = await bot.sendMessage(chatId, messageText, {
          parse_mode: 'Markdown',
          reply_markup: replyMarkup,
        });
        if (progress) {
          progress.menuMessageId = msg.message_id;
          await saveUserProgress(progress);
        }
      }
    } else {
      const msg = await bot.sendMessage(chatId, messageText, {
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
      if (progress) {
        progress.menuMessageId = msg.message_id;
        await saveUserProgress(progress);
      }
    }
  } catch (error) {
    console.error('❌ Error in handleSelectCategory:', error);
  }
}
