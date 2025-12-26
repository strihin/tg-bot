import TelegramBot from 'node-telegram-bot-api';
import { changeTargetLanguage, getUserProgressAsync, saveUserProgress } from '../../data/progress';
import { getLanguageEmoji } from '../../utils/translation';
import { getUIText } from '../../utils/uiTranslation';
import { getTranslatedKeyboardsWithCompletion } from '../keyboards';
import { applyMaxWidth } from './lesson/text';
import { TargetLanguage } from '../../types';

/**
 * Handle target language selection (after source language is fixed to BG)
 */
export async function handleSelectTargetLanguage(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    console.log(`🌍 Processing language selection: ${callbackQuery.data}`);

    // Answer callback immediately to prevent duplicate delivery
    await bot.answerCallbackQuery(callbackQuery.id);
    console.log(`✅ Callback answered for language selection`);

    const chatId = callbackQuery.message?.chat.id;

    if (!chatId) {
      console.error(`❌ No chat ID found in callback query`);
      return;
    }

    const data = callbackQuery.data || '';
    const languageTo = data.replace('lang_to_', '') as TargetLanguage;
    console.log(`🎯 Selected language: ${languageTo}`);

    // Save target language preference
    const userId = callbackQuery.from.id;
    await changeTargetLanguage(userId, languageTo);
    console.log(`💾 Language preference saved for user ${userId}: ${languageTo}`);

    // Verify it was saved correctly
    const savedProgress = await getUserProgressAsync(userId);
    console.log(`🔍 Verified saved progress for user ${userId}:`, savedProgress);

    const langEmoji = getLanguageEmoji(languageTo);
    console.log(`🏷️ Language emoji: ${langEmoji}`);

    // Show level selection after language choice
    console.log(`📤 Sending level selection message to chat ${chatId}`);
    const selectLevelText = getUIText('select_level', languageTo);
    const keyboards = await getTranslatedKeyboardsWithCompletion(languageTo, userId);
    const messageText = `🇧🇬 → ${langEmoji}\n\n<i>${selectLevelText}</i>`;
    
    // Always try to edit the current message first, fall back to send new
    const messageId = callbackQuery.message?.message_id;
    let newProgress = await getUserProgressAsync(userId);
    
    if (messageId) {
      try {
        await bot.editMessageText(applyMaxWidth(messageText), {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: keyboards.levelSelect,
        });
        console.log(`✏️ Edited level selection message ${messageId}`);
        if (newProgress) {
          newProgress.menuMessageId = messageId;
          await saveUserProgress(newProgress);
        }
      } catch (error) {
        console.log(`⚠️ Failed to edit, sending new:`, error);
        const result = await bot.sendMessage(
          chatId,
          applyMaxWidth(messageText),
          {
            parse_mode: 'HTML',
            reply_markup: keyboards.levelSelect,
          }
        );
        if (newProgress) {
          newProgress.menuMessageId = result.message_id;
          await saveUserProgress(newProgress);
        }
      }
    } else {
      const result = await bot.sendMessage(
        chatId,
        applyMaxWidth(messageText),
        {
          parse_mode: 'HTML',
          reply_markup: keyboards.levelSelect,
        }
      );
      if (newProgress) {
        newProgress.menuMessageId = result.message_id;
        await saveUserProgress(newProgress);
      }
    }
    console.log(`✅ Level selection sent/edited to chat ${chatId}`);
    
    // Send persistent keyboard with correct language
    console.log(`✅ Language changed to: ${languageTo}`);
  } catch (error) {
    console.error('❌ Error in handleSelectTargetLanguage:', error);
    // Try to answer callback even on error to remove spinner
    try {
      const errorText = getUIText('error_occurred', 'eng');
      await bot.answerCallbackQuery(callbackQuery.id, { text: errorText });
    } catch (answerError) {
      console.error('❌ Could not answer callback:', answerError);
    }
  }
}
