import TelegramBot from 'node-telegram-bot-api';
import { getUserProgressAsync } from '../../../data/progress';
import { helpTextEn } from './en';
import { helpTextKharkiv } from './kharkiv';
import { helpTextUa } from './ua';

/**
 * Get help text in the user's preferred language
 */
function getHelpText(language: string): string {
  switch (language) {
    case 'kharkiv':
      return helpTextKharkiv;
    case 'ua':
      return helpTextUa;
    case 'eng':
    default:
      return helpTextEn;
  }
}

/**
 * Handle /help command
 */
export async function handleHelpCommand(msg: TelegramBot.Message, bot: TelegramBot): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) return;

  // Get user's preferred language if they have active progress
  const progress = await getUserProgressAsync(userId);
  const userLang = progress?.languageTo || 'eng';

  const helpText = getHelpText(userLang);

  await bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
}
