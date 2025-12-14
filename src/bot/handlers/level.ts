import TelegramBot from 'node-telegram-bot-api';
import { getUserProgress, saveUserProgress, initializeUserProgress } from '../../data/progress';
import { LEVELS } from '../../constants';
import { FolderType } from '../../types';
import { getCategoryKeyboard } from './category';

/**
 * Handle folder selection (6 independent learning levels)
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
    const folder = data.replace('folder_', '') as FolderType;

    // Update or create user progress with selected folder
    let progress = getUserProgress(userId);
    if (progress) {
      progress.folder = folder;
    } else {
      // Initialize progress if new user selects folder
      progress = initializeUserProgress(userId, 'greetings', 'eng', folder);
    }
    saveUserProgress(progress);

    const folderInfo = LEVELS[folder];

    // Show category selection after folder choice
    await bot.sendMessage(
      chatId,
      `${folderInfo.emoji} **${folderInfo.name}** mode selected\n\n_${folderInfo.description}_\n\n📚 Now select a lesson category:`,
      {
        parse_mode: 'Markdown',
        ...getCategoryKeyboard(folder),
      }
    );
  } catch (error) {
    console.error('❌ Error in handleSelectLevel:', error);
  }
}
