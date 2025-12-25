import TelegramBot from 'node-telegram-bot-api';
import { getUserProgressAsync, saveUserProgress } from '../../data/progress';

/**
 * Send message and track it for cleanup
 */
export async function sendMessageAndTrack(
  userId: number,
  chatId: number,
  text: string,
  options: any,
  bot: TelegramBot
): Promise<TelegramBot.Message> {
  const msg = await bot.sendMessage(chatId, text, options);
  
  // Track the message ID
  const progress = await getUserProgressAsync(userId);
  if (progress) {
    if (!progress.sentMessageIds) {
      progress.sentMessageIds = [];
    }
    progress.sentMessageIds.push(msg.message_id);
    await saveUserProgress(progress);
  }
  
  return msg;
}

/**
 * Delete all tracked messages for a user
 */
export async function deleteAllTrackedMessages(
  bot: TelegramBot,
  chatId: number,
  messageIds: number[]
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  // Delete in reverse order (newest first to avoid confusing the user)
  for (const msgId of [...messageIds].reverse()) {
    try {
      await bot.deleteMessage(chatId, msgId);
      successful++;
      console.log(`✅ Deleted message ${msgId}`);
    } catch (e: any) {
      failed++;
      console.log(`⚠️ Could not delete message ${msgId}:`, e.message || e);
    }
  }

  return { successful, failed };
}
