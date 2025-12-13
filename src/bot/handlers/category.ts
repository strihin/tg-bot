import TelegramBot from 'node-telegram-bot-api';
import { getAvailableCategories } from '../../data/loader';
import { CATEGORIES } from '../../constants';

/**
 * Create inline keyboard with available categories
 */
export function getCategoryKeyboard() {
  const categories = getAvailableCategories();
  
  const buttons = categories.map((category) => [
    {
      text: `${CATEGORIES[category as keyof typeof CATEGORIES]?.emoji || '📚'} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      callback_data: `select_category:${category}`,
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

    const chatId = callbackQuery.message?.chat.id;
    if (!chatId) return;

    const data = callbackQuery.data || '';
    const category = data.replace('select_category:', '');

    const categoryMeta = CATEGORIES[category as keyof typeof CATEGORIES];
    const emoji = categoryMeta?.emoji || '📚';

    await bot.sendMessage(
      chatId,
      `${emoji} Starting lesson in **${category}** category...\n\n⏱️ Click below to begin:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '▶️ Start Lesson',
                callback_data: `start_lesson:${category}`,
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error('❌ Error in handleSelectCategory:', error);
  }
}
