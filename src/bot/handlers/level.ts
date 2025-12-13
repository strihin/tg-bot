import TelegramBot from 'node-telegram-bot-api';
import { getUserProgress, saveUserProgress } from '../../data/progress';
import { LEVELS } from '../../constants';
import { getCategoryKeyboard } from './category';

/**
 * Handle level selection (basic, middle, or middle-slavic)
 */
export async function handleSelectLevel(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    // Answer callback immediately to prevent duplicate delivery
    await bot.answerCallbackQuery(callbackQuery.id);

    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;

    if (!chatId) return;

    const data = callbackQuery.data || '';
    const level = data.replace('level_', '') as 'basic' | 'middle' | 'middle-slavic';

    // Update user progress with selected level
    let progress = getUserProgress(userId);
    if (progress) {
      progress.level = level;
      saveUserProgress(progress);
    }

    const levelInfo = LEVELS[level];

    // Show category selection after level choice
    await bot.sendMessage(
      chatId,
      `${levelInfo.emoji} **${levelInfo.name}** mode selected\n\n_${levelInfo.description}_\n\n📚 Now select a lesson category:`,
      {
        parse_mode: 'Markdown',
        ...getCategoryKeyboard(level),
      }
    );
  } catch (error) {
    console.error('❌ Error in handleSelectLevel:', error);
  }
}
