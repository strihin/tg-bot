import TelegramBot from 'node-telegram-bot-api';
import { changeTargetLanguage } from '../../data/progress';
import { getLanguageName, getLanguageEmoji } from '../../utils/translation';
import { getCategoryKeyboard } from './category';
import { lessonKeyboards } from '../keyboards';

/**
 * Handle target language selection (after source language is fixed to BG)
 */
export async function handleSelectTargetLanguage(
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
    const languageTo = data.replace('lang_to_', '') as 'eng' | 'ru' | 'ua';

    // Save target language preference
    changeTargetLanguage(userId, languageTo);

    const langName = getLanguageName(languageTo);
    const langEmoji = getLanguageEmoji(languageTo);

    // Send category selection after language choice
    await bot.sendMessage(
      chatId,
      `🇧🇬 → ${langEmoji}\n📚 Now select a lesson category:`,
      {
        parse_mode: 'Markdown',
        ...getCategoryKeyboard(),
      }
    );
  } catch (error) {
    console.error('❌ Error in handleSelectTargetLanguage:', error);
  }
}
