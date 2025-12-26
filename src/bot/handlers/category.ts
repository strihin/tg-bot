import TelegramBot from 'node-telegram-bot-api';
import { getAvailableCategories, getSentenceByIndex, getTotalSentences } from '../../data/loader';
import { CATEGORIES } from '../../constants';
import { FolderType } from '../../types';
import { getUIText } from '../../utils/uiTranslation';
import { getUserProgressAsync, saveUserProgress } from '../../data/progress';
import { isCategoryCompleted } from '../../data/completion';
import { SentenceMasteryModel } from '../../db/models';
import { applyMaxWidth } from './lesson/text';

/**
 * Create inline keyboard with available categories for a specific folder
 */
export async function getCategoryKeyboard(folder: FolderType = 'basic', language: string = 'eng', userId?: number) {
  const categories = await getAvailableCategories(folder);

  if (userId) {
    console.log(`🎯 [KEYBOARD] Building category keyboard for user ${userId}, folder: ${folder}`);
  }

  const buttons = await Promise.all(categories.map(async (category: string) => {
    const completed = userId ? await isCategoryCompleted(userId, folder, category) : false;
    const completionEmoji = completed ? ' ✅' : '';
    console.log(`  → Category "${category}": completed=${completed} emoji="${completionEmoji}"`);
    const categoryName = getUIText(`cat_${category}`, language as any);
    
    // Get progress stats if user has started this category
    let buttonText = categoryName;
    if (userId) {
      try {
        const totalSentences = await getTotalSentences(category, folder);
        const masteredCount = await SentenceMasteryModel.countDocuments({
          userId,
          folder,
          category,
          status: { $in: ['learned', 'known'] }
        });
        
        // Only show progress if user has started (masteredCount > 0)
        if (masteredCount > 0) {
          const percentage = Math.round((masteredCount / totalSentences) * 100);
          buttonText = `${categoryName} - ${masteredCount}/${totalSentences} (${percentage}%)${completionEmoji}`;
        } else {
          buttonText = `${categoryName}${completionEmoji}`;
        }
      } catch (e) {
        console.log(`⚠️ Could not fetch category stats for ${category}:`, e);
        buttonText = `${categoryName}${completionEmoji}`;
      }
    }
    
    return [
      {
        text: buttonText,
        callback_data: `select_category:${category}`,
      },
    ];
  }));

  // Add back button to return to folder selection
  buttons.push([
    {
      text: '🔙 Back to folders',
      callback_data: 'change_folder',
    },
  ]);

  return {
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
}

/**
 * Handle category selection
 */
export async function handleSelectCategory(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    // Answer callback immediately to prevent duplicate delivery
    await bot.answerCallbackQuery(callbackQuery.id);

    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    if (!chatId) return;

    const data = callbackQuery.data || '';
    const category = data.replace('select_category:', '');

    // Get user's language preference and progress
    const progress = await getUserProgressAsync(userId);
    const language = progress?.languageTo || 'eng';

    const categoryMeta = CATEGORIES[category as keyof typeof CATEGORIES];
    const emoji = categoryMeta?.emoji || '📚';
    const categoryName = getUIText(`cat_${category}`, language as any);

    // Build message text with last sentence if user has progress
    let messageText = `${emoji} Starting lesson in <b>${categoryName}</b> category...`;
    
    // Get total sentence count for progress display
    let totalSentences = 0;
    try {
      totalSentences = await getTotalSentences(category, progress?.folder || 'basic');
    } catch (e) {
      console.log(`⚠️ Could not fetch total sentences:`, e);
    }
    
    // Check progress in the SELECTED category from database (not just if it's the currently saved category)
    let categoryMasteredCount = 0;
    try {
      categoryMasteredCount = await SentenceMasteryModel.countDocuments({
        userId,
        folder: progress?.folder || 'basic',
        category,
        status: { $in: ['learned', 'known'] }
      });
    } catch (e) {
      console.log(`⚠️ Could not fetch mastery count:`, e);
    }
    
    // Show progress if user has started this category
    if (categoryMasteredCount > 0 && totalSentences > 0) {
      try {
        // Get the last sentence index for this category (use the mastered count as guidance)
        const lastSentenceIndex = Math.min(categoryMasteredCount, totalSentences) - 1;
        const lastSentence = await getSentenceByIndex(category, lastSentenceIndex, progress?.folder || 'basic');
        if (lastSentence) {
          const lastBG = lastSentence.bg;
          const lang = progress?.languageTo || 'eng';
          const lastTranslation = lang === 'ua' ? lastSentence.ua : (lang === 'kharkiv' ? lastSentence.ru : lastSentence.eng);
          messageText += `\n\n📝 <b>Last:</b> ${lastBG}\n<i>${lastTranslation}</i>`;
        }
        
        // Add progress stats
        const percentage = Math.round((categoryMasteredCount / totalSentences) * 100);
        const progressBar = '█'.repeat(Math.round(percentage / 10)) + '░'.repeat(10 - Math.round(percentage / 10));
        messageText += `\n\n📊 <b>Progress:</b> ${categoryMasteredCount}/${totalSentences} (${percentage}%)\n<i>${progressBar}</i>`;
      } catch (e) {
        console.log(`⚠️ Could not fetch category progress details:`, e);
        // Fallback: just show mastery count
        if (totalSentences > 0) {
          const percentage = Math.round((categoryMasteredCount / totalSentences) * 100);
          messageText += `\n\n📊 <b>Progress:</b> ${categoryMasteredCount}/${totalSentences} (${percentage}%)`;
        }
      }
    } else if (totalSentences > 0) {
      // Show total count even if no progress yet
      messageText += `\n\n📊 <b>Total cards:</b> ${totalSentences}`;
    }
    
    messageText += `\n\n⏱️ Click below to begin:`;
    
    // Build keyboard with conditional "Continue" button
    const keyboardButtons = [
      {
        text: '▶️ Start Lesson',
        callback_data: `start_lesson:${category}`,
      },
    ];
    
    // Add "Continue" button if user has progress in this category
    if (progress && progress.category === category && progress.currentIndex > 0) {
      keyboardButtons.push({
        text: '⏸️ Continue',
        callback_data: `continue_lesson:${category}`,
      });
    }
    
    const replyMarkup = {
      inline_keyboard: [keyboardButtons, [{ text: '🔙 Back to folders', callback_data: 'show_levels' }]],
    };

    // Always try to edit the current message first, fall back to send new
    if (messageId) {
      try {
        await bot.editMessageText(applyMaxWidth(messageText), {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
        console.log(`✏️ Edited category message ${messageId}`);
        if (progress) {
          progress.menuMessageId = messageId;
        }
      } catch (error) {
        console.log(`⚠️ Failed to edit category, sending new:`, error);
        const msg = await bot.sendMessage(chatId, applyMaxWidth(messageText), {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
        if (progress) {
          progress.menuMessageId = msg.message_id;
          await saveUserProgress(progress);
        }
      }
    } else {
      const msg = await bot.sendMessage(chatId, applyMaxWidth(messageText), {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      if (progress) {
        progress.menuMessageId = msg.message_id;
        await saveUserProgress(progress);
      }
    }
  } catch (error) {
    console.error('❌ Error in handleSelectCategory:', error);
  }
}
