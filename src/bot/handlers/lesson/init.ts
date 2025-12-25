import TelegramBot from 'node-telegram-bot-api';
import { getSentenceByIndex, getTotalSentences } from '../../../data/loader';
import { getUserProgressAsync, saveUserProgress, initializeUserProgress } from '../../../data/progress';
import { getUIText } from '../../../utils/uiTranslation';
import { getTranslatedKeyboards } from '../../keyboards';
import { buildLessonText } from './text';
import { sendMessageAndTrack } from '../../helpers/messageTracker';

/**
 * Handle lesson start via button click
 */
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
    let progress = await getUserProgressAsync(userId);
    if (!progress) {
      const selectedCategory = category || 'greetings';
      progress = await initializeUserProgress(userId, selectedCategory, 'eng', 'basic');
      console.log(`✅ Initialized progress for user ${userId} with category: ${selectedCategory}, folder: basic`);
    } else if (category && progress.category !== category) {
      // Switch to new category (keep same folder)
      progress.category = category;
      progress.currentIndex = 0;
      progress.translationRevealed = false;
      progress.lastFolder = progress.folder;
      progress.lastCategory = category;
      await saveUserProgress(progress);
      console.log(`✅ Switched to category: ${category}`);
    } else {
      // Same category, save as last for resume
      progress.lastFolder = progress.folder;
      progress.lastCategory = progress.category;
      console.log(`✅ Loaded progress for user ${userId}: index ${progress.currentIndex}, language: ${progress.languageTo}`);
    }

    // Fetch and display sentence
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (!sentence) {
      console.error('No sentence found');
      await bot.sendMessage(chatId, '❌ No sentences available.');
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }

    console.log(`📖 Fetched sentence at index ${progress.currentIndex}`);

    const totalSentences = await getTotalSentences(progress.category, progress.folder);
    const text = buildLessonText(
      sentence,
      progress.category,
      progress.currentIndex,
      totalSentences,
      progress.languageTo,
      progress.folder,
      false // showTranslation = false (use spoiler)
    );

    const keyboards = getTranslatedKeyboards(progress.languageTo, progress.category, progress.folder, progress.currentIndex);

    // Send audio with caption containing lesson text
    console.log(`📝 Sending lesson with audio as caption`);
    let msg;

    if (sentence.audioUrl) {
      try {
        const base64Data = sentence.audioUrl.includes(',')
          ? sentence.audioUrl.split(',')[1]
          : sentence.audioUrl;
        const audioBuffer = Buffer.from(base64Data, 'base64');
        msg = await bot.sendAudio(chatId, audioBuffer, {
          caption: text,
          parse_mode: 'HTML',
          reply_markup: keyboards.showTranslation,
          title: `${progress.category} - Sentence ${progress.currentIndex + 1}`,
        });
        console.log(`🎵 Audio message sent with ID ${msg.message_id}`);
      } catch (audioError) {
        console.log(`⚠️ Failed to send audio, sending text only:`, audioError);
        msg = await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          reply_markup: keyboards.showTranslation,
        });
      }
    } else {
      msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboards.showTranslation,
      });
    }

    progress.lessonMessageId = msg.message_id;
    console.log(`📤 Lesson sent with ID ${msg.message_id}`);

    progress.lessonActive = true;
    progress.lastFolder = progress.folder;
    progress.lastCategory = progress.category;
    await saveUserProgress(progress);
    console.log('✅ Sent/edited lesson message');

    const lessonStarted = getUIText('lesson_started', progress.languageTo);
    await bot.answerCallbackQuery(callbackQuery.id, { text: lessonStarted });
  } catch (error) {
    console.error('❌ Error in handleStartLessonButton:', error);
  }
}

/**
 * Handle lesson start via /start command
 */
export async function handleLessonStart(
  msg: TelegramBot.Message,
  bot: TelegramBot
): Promise<void> {
  const userId = msg.from?.id;
  if (!userId) return;

  const chatId = msg.chat.id;

  // Load user progress or initialize
  let progress = await getUserProgressAsync(userId);
  if (!progress) {
    const category = 'greetings';
    progress = await initializeUserProgress(userId, category);
  }

  // Fetch and display sentence
  const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
  if (!sentence) {
    await bot.sendMessage(chatId, '❌ No sentences available.');
    return;
  }

  const totalSentences = await getTotalSentences(progress.category, progress.folder);
  const text = buildLessonText(
    sentence,
    progress.category,
    progress.currentIndex,
    totalSentences,
    progress.languageTo,
    progress.folder,
    false
  );

  const keyboards = getTranslatedKeyboards(progress.languageTo, progress.category, progress.folder, progress.currentIndex);
  const sentMsg = await sendMessageAndTrack(userId, chatId, text, {
    parse_mode: 'HTML',
    reply_markup: keyboards.showTranslation,
  }, bot);
  progress.lessonMessageId = sentMsg.message_id;

  progress.lessonActive = true;
  await saveUserProgress(progress);
}
