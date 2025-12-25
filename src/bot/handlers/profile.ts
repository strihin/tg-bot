import TelegramBot from 'node-telegram-bot-api';
import { getUserProgressAsync } from '../../data/progress';
import { getLanguageEmoji, getLanguageName } from '../../utils/translation';
import { getUIText } from '../../utils/uiTranslation';
import { staticKeyboards } from '../keyboards';

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

    const profileMessage = `
👤 **Your Profile**

🌐 **Target Language:** ${langName} ${langEmoji}
📚 **Current Category:** ${progress.category?.toUpperCase() || 'None'}
📖 **Level:** ${progress.folder?.toUpperCase() || 'Basic'}
✅ **Current Progress:** Sentence ${progress.currentIndex + 1}

_${changeLanguageText}_
`;

    await bot.sendMessage(
      chatId,
      profileMessage.trim(),
      {
        parse_mode: 'Markdown',
        reply_markup: staticKeyboards.targetLanguageSelect,
      }
    );

    console.log(`✅ Profile shown for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error in handleProfileCommand:`, error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading profile.');
  }
}
