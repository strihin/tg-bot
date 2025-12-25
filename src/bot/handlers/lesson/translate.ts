import TelegramBot from 'node-telegram-bot-api';
import { getSentenceByIndex, getTotalSentences } from '../../../data/loader';
import { getUserProgressAsync, saveUserProgress } from '../../../data/progress';
import { getUIText } from '../../../utils/uiTranslation';
import { getTranslatedKeyboards } from '../../keyboards';
import { buildLessonText } from './text';

/**
 * Handle translation reveal - show translation without spoiler
 */
export async function handleShowTranslation(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId) return;

  const progress = await getUserProgressAsync(userId);
  if (!progress) return;

  console.log(
    `🔍 [handleShowTranslation] User ${userId} - Language: ${progress.languageTo}, Category: ${progress.category}, Index: ${progress.currentIndex}`
  );

  const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
  if (!sentence) return;

  const totalSentences = await getTotalSentences(progress.category, progress.folder);

  console.log(`📝 [handleShowTranslation] Translation language: ${progress.languageTo}`);

  const text = buildLessonText(
    sentence,
    progress.category,
    progress.currentIndex,
    totalSentences,
    progress.languageTo,
    progress.folder,
    true // showTranslation = true
  );

  try {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: getTranslatedKeyboards(progress.languageTo, progress.category, progress.folder, progress.currentIndex).withNavigation,
    });
    console.log('✅ Updated message with translation');
  } catch (error) {
    console.error('Error editing message:', error);
  }

  const revealedText = getUIText('translation_revealed', progress.languageTo);
  await bot.answerCallbackQuery(callbackQuery.id, { text: revealedText });
}
