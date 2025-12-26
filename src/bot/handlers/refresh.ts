import TelegramBot from 'node-telegram-bot-api';
import { getUserProgressAsync, saveUserProgress } from '../../data/progress';
import { getUIText } from '../../utils/uiTranslation';
import { SentenceMasteryModel } from '../../db/models';
import { deleteAllTrackedMessages } from '../helpers/messageTracker';
import { applyMaxWidth } from './lesson/text';

/**
 * Handle /refresh command
 * Shows options to clear results or clear chat messages
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

    const progress = await getUserProgressAsync(userId);
    const language = progress?.languageTo || 'eng';

    const refreshOptionsText = getUIText('refresh_options', language);
    const clearResultsText = getUIText('clear_results', language);
    const clearMessagesText = getUIText('clear_messages', language);
    const cancelText = getUIText('cancel', language);

    await bot.sendMessage(
      chatId,
      applyMaxWidth(`🔄 ${refreshOptionsText}`),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `🗑️ ${clearResultsText}`, callback_data: 'refresh_results' }],
            [{ text: `💬 ${clearMessagesText}`, callback_data: 'refresh_messages' }],
            [{ text: `${cancelText}`, callback_data: 'cancel_refresh' }],
          ],
        },
      }
    );
  } catch (error) {
    console.error(`❌ Error in handleRefreshCommand:`, error);
    await bot.sendMessage(msg.chat.id, '❌ Error opening refresh options.');
  }
}

/**
 * Handle refresh callback - clear results (mastery records)
 */
export async function handleRefreshResults(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId || !messageId) {
      return;
    }

    console.log(`🔄 Clearing results for user ${userId}`);

    const progress = await getUserProgressAsync(userId);
    const language = progress?.languageTo || 'eng';

    // Delete all SentenceMastery records for this user
    const result = await SentenceMasteryModel.deleteMany({ userId });
    const deletedCount = result.deletedCount || 0;

    const successMessage = getUIText('results_cleared', language);

    await bot.editMessageText(
      applyMaxWidth(`✅ ${successMessage}\n\n🗑️ Cleared ${deletedCount} completed sentences.\n\nYou can now restart your learning journey from the beginning!\n\nUse /start to begin.`),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
      }
    );

    console.log(`✅ Deleted ${deletedCount} mastery records for user ${userId}`);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Progress refreshed' });
  } catch (error) {
    console.error(`❌ Error in handleRefreshResults:`, error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error clearing results' });
  }
}

/**
 * Handle refresh callback - clear chat messages
 */
export async function handleRefreshMessages(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    const userId = callbackQuery.from.id;

    const progress = await getUserProgressAsync(userId);
    const language = progress?.languageTo || 'eng';

    if (!chatId || !messageId) {
      return;
    }

    const allMessageIds = progress?.sentMessageIds || [];
    console.log(`🔄 [REFRESH_MESSAGES] User ${userId}: tracking ${allMessageIds.length} messages, current menu=${messageId}`);

    // Add current menu message to deletion list
    const messagesToDelete = [messageId, ...allMessageIds];

    // Delete all tracked messages
    const result = await deleteAllTrackedMessages(bot, chatId, messagesToDelete);
    console.log(`✅ Deletion complete: ${result.successful} successful, ${result.failed} failed`);

    const successMessage = getUIText('messages_cleared', language);
    const infoMessage = getUIText('messages_cleared_info', language);

    // Send confirmation message
    const confirmMsg = await bot.sendMessage(
      chatId,
      applyMaxWidth(`✅ ${successMessage}\n\n${infoMessage}\n\n<i>[Cleared ${result.successful} message(s)]</i>`),
      { parse_mode: 'HTML' }
    );

    // Clear tracked messages from progress after deletion
    if (progress) {
      progress.sentMessageIds = [confirmMsg.message_id]; // Keep only the confirmation message
      await saveUserProgress(progress);
    }

    await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Messages cleared' });
  } catch (error) {
    console.error(`❌ Error in handleRefreshMessages:`, error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error clearing messages' });
  }
}

/**
 * Handle cancel refresh
 */
export async function handleCancelRefresh(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId || !messageId) {
      return;
    }

    await bot.deleteMessage(chatId, messageId);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Cancelled' });
  } catch (error) {
    console.error(`❌ Error in handleCancelRefresh:`, error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}
