import TelegramBot from 'node-telegram-bot-api';
import { getSentenceByIndex, getTotalSentences } from '../../data/loader';
import { getUserProgress, saveUserProgress, initializeUserProgress } from '../../data/progress';
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

    console.log(`User ID: ${userId}, Chat ID: ${chatId}`);

    if (!chatId) {
      console.error('No chatId found');
      return;
    }

    // Load user progress or initialize with selected category
    let progress = getUserProgress(userId);
    if (!progress) {
      const selectedCategory = category || 'greetings';
      progress = initializeUserProgress(userId, selectedCategory, 'eng');
      console.log(`✅ Initialized progress for user ${userId} with category: ${selectedCategory}`);
    } else if (category && progress.category !== category) {
      // Switch to new category
      progress.category = category;
      progress.currentIndex = 0;
      saveUserProgress(progress);
      console.log(`✅ Switched to category: ${category}`);
    } else {
      console.log(`✅ Loaded progress for user ${userId}: index ${progress.currentIndex}, language: ${progress.languageTo}`);
    }

    // Fetch and display sentence
    const sentence = getSentenceByIndex(progress.category, progress.currentIndex);
    if (!sentence) {
      console.error('No sentence found');
      await bot.sendMessage(chatId, '❌ No sentences available.');
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }

    console.log(`📖 Fetched sentence at index ${progress.currentIndex}`);

    const totalSentences = getTotalSentences(progress.category);
    const langEmoji = getLanguageEmoji(progress.languageTo);
    
    const text = `📚 ${progress.category.toUpperCase()} | 🇧🇬 → ${langEmoji} | 📝 Lesson ${progress.currentIndex + 1}/${totalSentences}\n\n${sentence.bg}\n\n✨ Click button to reveal translation!`;
    await bot.sendMessage(chatId, text, {
      reply_markup: lessonKeyboards.showTranslation,
    });

    console.log('✅ Sent sentence message');

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
  let progress = getUserProgress(userId);
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

  const progress = getUserProgress(userId);
  if (!progress) return;

  const sentence = getSentenceByIndex(progress.category, progress.currentIndex);
  if (!sentence) return;

  const totalSentences = getTotalSentences(progress.category);
  const translation = getTranslation(sentence, progress.languageTo);
  const langEmoji = getLanguageEmoji(progress.languageTo);
  
  const text = `📚 ${progress.category.toUpperCase()} | 🇧🇬 → ${langEmoji} | 📝 Lesson ${progress.currentIndex + 1}/${totalSentences}\n\n${sentence.bg}\n\n🎯 **Translation:** ${translation}`;
  
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

  if (!chatId) return;

  const progress = getUserProgress(userId);
  if (!progress) return;

  const totalSentences = getTotalSentences(progress.category);

  if (progress.currentIndex < totalSentences - 1) {
    progress.currentIndex += 1;
    saveUserProgress(progress);

    const sentence = getSentenceByIndex(progress.category, progress.currentIndex);
    if (sentence) {
      const text = `📚 Lesson ${progress.currentIndex + 1}/${totalSentences}\n\n${sentence.bg}`;
      await bot.sendMessage(chatId, text, {
        reply_markup: lessonKeyboards.showTranslation,
      });
    }
  } else {
    await bot.sendMessage(chatId, '🎉 🎊 You reached the end of the lesson! Amazing work! 👏');
  }

  await bot.answerCallbackQuery(callbackQuery.id, { text: '➡️ Next!' });
}

export async function handlePrevious(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;

  if (!chatId) return;

  const progress = getUserProgress(userId);
  if (!progress) return;

  const totalSentences = getTotalSentences(progress.category);

  if (progress.currentIndex > 0) {
    progress.currentIndex -= 1;
    saveUserProgress(progress);

    const sentence = getSentenceByIndex(progress.category, progress.currentIndex);
    if (sentence) {
      const text = `📚 Lesson ${progress.currentIndex + 1}/${totalSentences}\n\n${sentence.bg}`;
      await bot.sendMessage(chatId, text, {
        reply_markup: lessonKeyboards.showTranslation,
      });
    }
  } else {
    await bot.sendMessage(chatId, '⬅️ You are at the beginning of the lesson.');
  }

  await bot.answerCallbackQuery(callbackQuery.id, { text: '⬅️ Previous!' });
}
