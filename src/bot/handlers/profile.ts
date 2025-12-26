import TelegramBot from 'node-telegram-bot-api';
import { getUserProgressAsync, saveUserProgress } from '../../data/progress';
import { getLanguageEmoji, getLanguageName } from '../../utils/translation';
import { getUIText } from '../../utils/uiTranslation';
import { staticKeyboards } from '../keyboards';
import { deleteAllTrackedMessages } from '../helpers/messageTracker';
import { SentenceMasteryModel } from '../../db/models';
import { LANGUAGES } from '../../constants';
import { applyMaxWidth } from '../handlers/lesson/text';

/**
 * Handle /profile command - Show user profile and allow language change
 */
export async function handleProfileCommand(
  msg: TelegramBot.Message,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) {
      return;
    }

    console.log(`👤 Profile command from user ${userId}`);

    const progress = await getUserProgressAsync(userId);

    // Clean up old tracked messages (removes cached persistent keyboard buttons)
    if (progress?.sentMessageIds && progress.sentMessageIds.length > 0) {
      console.log(`🧹 Cleaning up ${progress.sentMessageIds.length} old messages from user's chat...`);
      const cleanup = await deleteAllTrackedMessages(bot, chatId, progress.sentMessageIds);
      console.log(`🧹 Cleanup complete: ${cleanup.successful} deleted, ${cleanup.failed} failed`);

      // Clear the tracked message IDs
      progress.sentMessageIds = [];
      await saveUserProgress(progress);
    }

    if (!progress) {
      await bot.sendMessage(
        chatId,
        '❌ No user profile found. Please run /start first.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const langEmoji = getLanguageEmoji(progress.languageTo);
    const langName = getLanguageName(progress.languageTo as any);
    const changeLanguageText = getUIText('change_language', progress.languageTo);
    const clearProgressText = getUIText('clear_results', progress.languageTo);

    const profileMessage = `
👤 <b>Your Profile</b>

🌐 <b>Target Language:</b> ${langName} ${langEmoji}
📚 <b>Current Category:</b> ${progress.category?.toUpperCase() || 'None'}
📖 <b>Level:</b> ${progress.folder?.toUpperCase() || 'Basic'}
✅ <b>Current Progress:</b> Sentence ${progress.currentIndex + 1}
`;

    const result = await bot.sendMessage(
      chatId,
      applyMaxWidth(profileMessage.trim()),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `🌐 ${changeLanguageText}`, callback_data: 'show_language_options' }],
            [{ text: `🗑️ ${clearProgressText}`, callback_data: 'clear_progress' }],
          ],
        },
      }
    );

    console.log(`📤 Profile message sent with keyboard:`, JSON.stringify(staticKeyboards.targetLanguageSelect, null, 2));

    // Track message for cleanup
    if (!progress.sentMessageIds) progress.sentMessageIds = [];
    progress.sentMessageIds.push(result.message_id);
    await saveUserProgress(progress);

    console.log(`✅ Profile shown for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error in handleProfileCommand:`, error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading profile.');
  }
}

/**
 * Handle show language options callback
 */
export async function handleShowLanguageOptions(
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

    console.log(`🌐 Showing language options for user ${userId}`);

    const progress = await getUserProgressAsync(userId);
    const language = progress?.languageTo || 'eng';

    const selectLanguageText = getUIText('select_language', language);

    await bot.editMessageText(
      applyMaxWidth(`🌐 ${selectLanguageText}`),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: LANGUAGES.eng.emoji, callback_data: 'lang_to_eng' },
              { text: LANGUAGES.kharkiv.emoji, callback_data: 'lang_to_kharkiv' },
              { text: LANGUAGES.ua.emoji, callback_data: 'lang_to_ua' }
            ],
          ],
        },
      }
    );

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error(`❌ Error in handleShowLanguageOptions:`, error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error showing options' });
  }
}

/**
 * Handle clear progress callback - show confirmation
 */
export async function handleClearProgress(
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

    console.log(`🔄 Showing clear progress confirmation for user ${userId}`);

    const progress = await getUserProgressAsync(userId);
    const language = progress?.languageTo || 'eng';

    const clearProgressText = getUIText('clear_results', language);
    const backText = getUIText('back', language) || '🔙 Back';
    const confirmText = getUIText('confirm', language) || '✅ Confirm';

    await bot.editMessageText(
      applyMaxWidth(`⚠️ Are you sure you want to clear all your learning progress?\n\nThis action cannot be undone.`),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: `${confirmText}`, callback_data: 'confirm_clear_progress' },
              { text: `${backText}`, callback_data: 'back_to_profile' },
            ],
          ],
        },
      }
    );

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error(`❌ Error in handleClearProgress:`, error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}

/**
 * Handle confirmation of clear progress
 */
export async function handleConfirmClearProgress(
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

    console.log(`🗑️ Confirming clear progress for user ${userId}`);

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
    await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Progress cleared' });
  } catch (error) {
    console.error(`❌ Error in handleConfirmClearProgress:`, error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error clearing progress' });
  }
}

/**
 * Handle back to profile callback
 */
export async function handleBackToProfile(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const msg: TelegramBot.Message = {
      from: { id: userId } as any,
      chat: { id: chatId } as any,
    } as any;

    console.log(`🔙 Returning to profile for user ${userId}`);
    await handleProfileCommand(msg, bot);
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error(`❌ Error in handleBackToProfile:`, error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}

