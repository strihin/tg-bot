import TelegramBot from 'node-telegram-bot-api';
import { getSentenceByIndex, getTotalSentences } from '../../data/loader';
import { getUserProgress, saveUserProgress } from '../../db/mongo';
import { initializeUserProgress } from '../../data/progress';
import { getTranslation, getLanguageName, getLanguageEmoji } from '../../utils/translation';
import { lessonKeyboards } from '../keyboards';

export async function handleStartLessonButton(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot,
  category?: string
): Promise<void> {
  try {
    console.log('📚 handleStartLessonButton called');
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    console.log(`User ID: ${userId}, Chat ID: ${chatId}`);

    if (!chatId) {
      console.error('No chatId found');
      return;
    }

    // Load user progress or initialize with selected category
    let progress = await getUserProgress(userId);
    if (!progress) {
      // New user: need to have folder already selected, otherwise default to basic
      // But ideally this shouldn't happen - user should select folder first
      const selectedCategory = category || 'greetings';
      progress = initializeUserProgress(userId, selectedCategory, 'eng', 'basic');
      console.log(`✅ Initialized progress for user ${userId} with category: ${selectedCategory}, folder: basic`);
    } else if (category && progress.category !== category) {
      // Switch to new category (keep same folder)
      progress.category = category;
      progress.currentIndex = 0;
      console.log(`✅ Switched to category: ${category}`);
    } else {
      console.log(`✅ Loaded progress for user ${userId}: index ${progress.currentIndex}, language: ${progress.languageTo}`);
    }

    // Fetch and display sentence
    const sentence = getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (!sentence) {
      console.error('No sentence found');
      await bot.sendMessage(chatId, '❌ No sentences available.');
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }

    console.log(`📖 Fetched sentence at index ${progress.currentIndex}`);

    const totalSentences = getTotalSentences(progress.category, progress.folder);
    const langEmoji = getLanguageEmoji(progress.languageTo);
    
    const text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n✨ _Click button to reveal translation_`;
    
    // Edit the existing message or send new one if no messageId
    if (messageId) {
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: lessonKeyboards.showTranslation,
        });
      } catch (error) {
        // If edit fails, fall back to sending new message
        const msg = await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: lessonKeyboards.showTranslation,
        });
        progress.lessonMessageId = msg.message_id;
      }
    } else {
      const msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: lessonKeyboards.showTranslation,
      });
      progress.lessonMessageId = msg.message_id;
    }

    progress.lessonActive = true;
    saveUserProgress(progress);
    console.log('✅ Sent/edited lesson message');

    await bot.answerCallbackQuery(callbackQuery.id, { text: '🎓 Lesson started! Good luck!' });
  } catch (error) {
    console.error('❌ Error in handleStartLessonButton:', error);
  }
}

export async function handleLessonStart(
  msg: TelegramBot.Message,
  bot: TelegramBot
): Promise<void> {
  const userId = msg.from?.id;
  if (!userId) return;

  const chatId = msg.chat.id;

  // Load user progress or initialize
  let progress = await getUserProgress(userId);
  if (!progress) {
    const category = 'greetings';
    progress = initializeUserProgress(userId, category);
  }

  // Fetch and display sentence
  const sentence = getSentenceByIndex(progress.category, progress.currentIndex);
  if (!sentence) {
    await bot.sendMessage(chatId, '❌ No sentences available.');
    return;
  }

  const totalSentences = getTotalSentences(progress.category);
  const text = `📚 Lesson ${progress.currentIndex + 1}/${totalSentences}\n\n${sentence.bg}`;
  await bot.sendMessage(chatId, text, {
    reply_markup: lessonKeyboards.showTranslation,
  });
}

export async function handleShowTranslation(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId) return;

  const progress = await getUserProgress(userId);
  if (!progress) return;

  const sentence = getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
  if (!sentence) return;

  const totalSentences = getTotalSentences(progress.category, progress.folder);
  const translation = getTranslation(sentence, progress.languageTo);
  const langEmoji = getLanguageEmoji(progress.languageTo);
  
  let text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n🎯 **${translation}**`;
  
  // Add grammar explanation if available (middle level)
  if (progress.folder === 'middle' && sentence.grammar && sentence.explanation) {
    const grammarTags = sentence.grammar.map(tag => `#${tag}`).join(' ');
    text += `\n\n📝 **Grammar:** ${grammarTags}\n💡 _${sentence.explanation}_`;
  }

  // Add Slavic-specific explanations (middle-slavic level)
  if (progress.folder === 'middle-slavic') {
    if (sentence.tag === 'false-friend' && sentence.falseFriend) {
      text += `\n\n⚠️ **FALSE FRIEND!**\n🔴 _${sentence.falseFriend}_`;
    }
    
    if (sentence.comparison) {
      text += `\n\n🔗 **Slavic Bridge:** _${sentence.comparison}_`;
    }
  }

  // Add language-specific rules for language-comparison and other advanced folders
  if (['language-comparison', 'misc', 'expressions'].includes(progress.folder)) {
    const ruleKey = progress.languageTo === 'ru' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof typeof sentence]) {
      text += `\n\n📖 _${sentence[ruleKey as keyof typeof sentence]}_`;
    }
  }

  // Also add rules for middle-slavic if present
  if (progress.folder === 'middle-slavic') {
    const ruleKey = progress.languageTo === 'ru' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof typeof sentence]) {
      text += `\n\n📖 _${sentence[ruleKey as keyof typeof sentence]}_`;
    }
  }
  
  try {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: lessonKeyboards.withNavigation,
    });
  } catch (error) {
    console.error('Error editing message:', error);
  }

  await bot.answerCallbackQuery(callbackQuery.id, { text: '🎯 Translation revealed! 👀' });
}

export async function handleNext(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId) return;

  const progress = await getUserProgress(userId);
  if (!progress) return;

  const totalSentences = getTotalSentences(progress.category, progress.folder);

  if (progress.currentIndex < totalSentences - 1) {
    progress.currentIndex += 1;
    const sentence = getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      const text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n✨ _Click button to reveal translation_`;
      
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: lessonKeyboards.showTranslation,
        });
        progress.lessonMessageId = messageId;
        saveUserProgress(progress);
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  } else {
    // Reached end - edit to show completion message
    const text = `🎉 **CONGRATULATIONS!** 🎉\n\n✅ You completed the **${progress.category.toUpperCase()}** lesson!\n\n📊 **${totalSentences}/${totalSentences}** sentences mastered\n\n💪 _Great job! Ready for the next category?_`;
    
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: lessonKeyboards.lessonComplete,
      });
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }

  await bot.answerCallbackQuery(callbackQuery.id, { text: '➡️ Next!' });
}

export async function handlePrevious(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId) return;

  const progress = await getUserProgress(userId);
  if (!progress) return;

  const totalSentences = getTotalSentences(progress.category, progress.folder);

  if (progress.currentIndex > 0) {
    progress.currentIndex -= 1;
    const sentence = getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      const text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n✨ _Click button to reveal translation_`;
      
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: lessonKeyboards.showTranslation,
        });
        progress.lessonMessageId = messageId;
        saveUserProgress(progress);
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  } else {
    // Already at beginning
    const sentence = getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      const text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n✨ _You're at the beginning!_`;
      
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: lessonKeyboards.showTranslation,
        });
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  }

  await bot.answerCallbackQuery(callbackQuery.id, { text: '⬅️ Previous!' });
}
