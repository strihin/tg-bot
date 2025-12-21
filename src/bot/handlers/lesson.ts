import TelegramBot from 'node-telegram-bot-api';
import { getSentenceByIndex, getTotalSentences } from '../../data/loader';
import { getUserProgressAsync, saveUserProgress, initializeUserProgress } from '../../data/progress';
import { logActivity } from '../../utils/logger';
import { getTranslation, getLanguageName, getLanguageEmoji } from '../../utils/translation';
import { getUIText } from '../../utils/uiTranslation';
import { getTranslatedKeyboards, lessonKeyboards } from '../keyboards';

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
      // New user: need to have folder already selected, otherwise default to basic
      // But ideally this shouldn't happen - user should select folder first
      const selectedCategory = category || 'greetings';
      progress = await initializeUserProgress(userId, selectedCategory, 'eng', 'basic');
      console.log(`✅ Initialized progress for user ${userId} with category: ${selectedCategory}, folder: basic`);
    } else if (category && progress.category !== category) {
      // Switch to new category (keep same folder)
      progress.category = category;
      progress.currentIndex = 0;
      await saveUserProgress(progress);  // Save the category change immediately
      console.log(`✅ Switched to category: ${category}`);
    } else {
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
    const langEmoji = getLanguageEmoji(progress.languageTo);
    const clickReveal = getUIText('click_reveal', progress.languageTo);
    
    const text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n${clickReveal}`;
    
    const keyboards = getTranslatedKeyboards(progress.languageTo);
    
    // Edit the existing message or send new one if no messageId
    if (messageId) {
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboards.showTranslation,
        });
      } catch (error) {
        // If edit fails, fall back to sending new message
        const msg = await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: keyboards.showTranslation,
        });
        progress.lessonMessageId = msg.message_id;
      }
    } else {
      const msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboards.showTranslation,
      });
      progress.lessonMessageId = msg.message_id;
    }

    progress.lessonActive = true;
    await saveUserProgress(progress);
    console.log('✅ Sent/edited lesson message');

    const lessonStarted = getUIText('lesson_started', progress.languageTo);
    await bot.answerCallbackQuery(callbackQuery.id, { text: lessonStarted });
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
  let progress = await getUserProgressAsync(userId);
  if (!progress) {
    const category = 'greetings';
    progress = await initializeUserProgress(userId, category);
  }

  // Fetch and display sentence
  const sentence = await getSentenceByIndex(progress.category, progress.currentIndex);
  if (!sentence) {
    await bot.sendMessage(chatId, '❌ No sentences available.');
    return;
  }

  const totalSentences = await getTotalSentences(progress.category);
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

  const progress = await getUserProgressAsync(userId);
  if (!progress) return;

  console.log(`🔍 [handleShowTranslation] User ${userId} - Language: ${progress.languageTo}, Category: ${progress.category}, Index: ${progress.currentIndex}`);

  const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
  if (!sentence) return;

  const totalSentences = await getTotalSentences(progress.category, progress.folder);
  const translation = getTranslation(sentence, progress.languageTo);
  const langEmoji = getLanguageEmoji(progress.languageTo);
  
  console.log(`📝 [handleShowTranslation] Translation language: ${progress.languageTo}, Translation text: ${translation.substring(0, 50)}...`);
  
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
    const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof typeof sentence]) {
      text += `\n\n📖 _${sentence[ruleKey as keyof typeof sentence]}_`;
    }
  }

  // Also add rules for middle-slavic if present
  if (progress.folder === 'middle-slavic') {
    const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof typeof sentence]) {
      text += `\n\n📖 _${sentence[ruleKey as keyof typeof sentence]}_`;
    }
  }
  
  try {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getTranslatedKeyboards(progress.languageTo).withNavigation,
    });
  } catch (error) {
    console.error('Error editing message:', error);
  }

  const revealedText = getUIText('translation_revealed', progress.languageTo);
  await bot.answerCallbackQuery(callbackQuery.id, { text: revealedText });
}

export async function handleNext(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId) return;

  const progress = await getUserProgressAsync(userId);
  if (!progress) return;

  const totalSentences = await getTotalSentences(progress.category, progress.folder);

  if (progress.currentIndex < totalSentences - 1) {
    progress.currentIndex += 1;
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      const clickReveal = getUIText('click_reveal', progress.languageTo);
      const text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n${clickReveal}`;
      
      const keyboards = getTranslatedKeyboards(progress.languageTo);
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboards.showTranslation,
        });
        progress.lessonMessageId = messageId;
        await saveUserProgress(progress);
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  } else {
    // Reached end - edit to show completion message
    const congratulations = getUIText('congratulations', progress.languageTo);
    const completed = getUIText('lesson_completed', progress.languageTo);
    const mastered = getUIText('sentences_mastered', progress.languageTo);
    const greatJob = getUIText('great_job', progress.languageTo);
    
    const text = `${congratulations}\n\n✅ ${completed} **${progress.category.toUpperCase()}** lesson!\n\n📊 **${totalSentences}/${totalSentences}** ${mastered}\n\n${greatJob}`;
    
    const keyboards = getTranslatedKeyboards(progress.languageTo);
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboards.lessonComplete,
      });
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }

  const nextText = getUIText('next_clicked', progress.languageTo);
  await bot.answerCallbackQuery(callbackQuery.id, { text: nextText });
}

export async function handlePrevious(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId) return;

  const progress = await getUserProgressAsync(userId);
  if (!progress) return;

  const totalSentences = await getTotalSentences(progress.category, progress.folder);

  if (progress.currentIndex > 0) {
    progress.currentIndex -= 1;
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      const clickReveal = getUIText('click_reveal', progress.languageTo);
      const text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n${clickReveal}`;
      
      const keyboards = getTranslatedKeyboards(progress.languageTo);
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboards.showTranslation,
        });
        progress.lessonMessageId = messageId;
        await saveUserProgress(progress);
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  } else {
    // Already at beginning
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      const atBeginning = getUIText('at_beginning', progress.languageTo);
      const text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n${atBeginning}`;
      
      const keyboards = getTranslatedKeyboards(progress.languageTo);
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboards.showTranslation,
        });
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  }

  const prevText = getUIText('previous_clicked', progress.languageTo);
  await bot.answerCallbackQuery(callbackQuery.id, { text: prevText });
}
