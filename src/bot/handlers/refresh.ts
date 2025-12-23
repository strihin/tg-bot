import TelegramBot from 'node-telegram-bot-api';
import { SentenceMasteryModel } from '../../db/models';

/**
 * Handle /refresh command
 * Clears all mastery records for the user (resets progress)
 */
export async function handleRefreshCommand(
  msg: TelegramBot.Message,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) {
      return;
    }

    console.log(`🔄 Refresh command from user ${userId}`);

    // Delete all SentenceMastery records for this user
    const result = await SentenceMasteryModel.deleteMany({ userId });

    const deletedCount = result.deletedCount || 0;
    console.log(`✅ Deleted ${deletedCount} mastery records for user ${userId}`);

    const message = `🔄 **Progress Refreshed!**\n\n✅ Cleared ${deletedCount} completed sentences.\n\nYou can now restart your learning journey from the beginning!\n\nUse /start to begin.`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error(`❌ Error in handleRefreshCommand:`, error);
    await bot.sendMessage(msg.chat.id, '❌ Error clearing progress.');
  }
}
