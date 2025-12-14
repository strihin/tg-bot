import TelegramBot from 'node-telegram-bot-api';
import { changeTargetLanguage } from '../../data/progress';
import { getLanguageName, getLanguageEmoji } from '../../utils/translation';
import { getCategoryKeyboard } from './category';
import { lessonKeyboards } from '../keyboards';
import { TargetLanguage } from '../../types';

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

    const chatId = callbackQuery.message?.chat.id;

    if (!chatId) return;

    const data = callbackQuery.data || '';
    const languageTo = data.replace('lang_to_', '') as TargetLanguage;

    // Save target language preference
    const userId = callbackQuery.from.id;
    changeTargetLanguage(userId, languageTo);

    const langEmoji = getLanguageEmoji(languageTo);

    // Show level selection after language choice
    await bot.sendMessage(
      chatId,
      `🇧🇬 → ${langEmoji}\n\n_Select your learning level:_`,
      {
        parse_mode: 'Markdown',
        reply_markup: lessonKeyboards.levelSelect,
      }
    );
  } catch (error) {
    console.error('❌ Error in handleSelectTargetLanguage:', error);
  }
}
