import TelegramBot from 'node-telegram-bot-api';
import { getSentenceByIndex, getTotalSentences } from '../../data/loader';
import { getUserProgressAsync, saveUserProgress, initializeUserProgress } from '../../data/progress';
import { logActivity } from '../../utils/logger';
import { getTranslation, getLanguageName, getLanguageEmoji } from '../../utils/translation';
import { getUIText } from '../../utils/uiTranslation';
import { getTranslatedKeyboards, lessonKeyboards } from '../keyboards';
import { SentenceMasteryModel } from '../../db/models';

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
    const translation = getTranslation(sentence, progress.languageTo);
    
    // Build message with spoiler effect for translation (using HTML format)
    let text = `<b>📚 ${progress.category.toUpperCase()} | 🇧🇬 → ${langEmoji}</b>\n\n⏳ <b>${progress.currentIndex + 1}/${totalSentences}</b>\n\n${sentence.bg}\n\n<tg-spoiler>${translation}</tg-spoiler>`;
    
    // Add grammar explanation if available (middle level)
    if (progress.folder === 'middle' && sentence.grammar && sentence.explanation) {
      const grammarTags = sentence.grammar.map(tag => `#${tag}`).join(' ');
      text += `\n\n📝 <b>Grammar:</b> ${grammarTags}\n💡 <i>${sentence.explanation}</i>`;
    }

    // Add Slavic-specific explanations (middle-slavic level)
    if (progress.folder === 'middle-slavic') {
      if (sentence.tag === 'false-friend' && sentence.falseFriend) {
        text += `\n\n⚠️ <b>FALSE FRIEND!</b>\n🔴 <i>${sentence.falseFriend}</i>`;
      }
      
      if (sentence.comparison) {
        text += `\n\n🔗 <b>Slavic Bridge:</b> <i>${sentence.comparison}</i>`;
      }
    }

    // Add language-specific rules
    if (['language-comparison', 'misc', 'expressions'].includes(progress.folder)) {
      const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
      if (sentence[ruleKey as keyof typeof sentence]) {
        text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
      }
    }

    // Also add rules for middle-slavic if present
    if (progress.folder === 'middle-slavic') {
      const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
      if (sentence[ruleKey as keyof typeof sentence]) {
        text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
      }
    }
    
    const keyboards = getTranslatedKeyboards(progress.languageTo, progress.category, progress.folder, progress.currentIndex);
    
    console.log(`🎮 [DEBUG] Keyboard buttons count:`, keyboards.showTranslation?.inline_keyboard?.length);
    console.log(`🎮 [DEBUG] First row buttons:`, keyboards.showTranslation?.inline_keyboard?.[0]?.map((b: any) => b.text));
    console.log(`🎮 [DEBUG] Second row buttons:`, keyboards.showTranslation?.inline_keyboard?.[1]?.map((b: any) => b.text));
    
    // Edit the existing message or send new one if no messageId
    if (messageId) {
      console.log(`📝 Editing existing message ${messageId} with showTranslation keyboard`);
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: keyboards.showTranslation,
        });
        console.log(`✅ Successfully edited message ${messageId}`);
      } catch (error) {
        // If edit fails, fall back to sending new message
        console.log(`⚠️ Failed to edit message, sending new message instead`);
        const msg = await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          reply_markup: keyboards.showTranslation,
        });
        progress.lessonMessageId = msg.message_id;
        console.log(`📤 New message sent with ID ${msg.message_id} and showTranslation keyboard`);
      }
    } else {
      console.log(`📤 No messageId provided, sending new message with showTranslation keyboard`);
      const msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboards.showTranslation,
      });
      progress.lessonMessageId = msg.message_id;
      console.log(`✅ New message sent with ID ${msg.message_id}`);
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
  const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
  if (!sentence) {
    await bot.sendMessage(chatId, '❌ No sentences available.');
    return;
  }

  const totalSentences = await getTotalSentences(progress.category, progress.folder);
  const langEmoji = getLanguageEmoji(progress.languageTo);
  const translation = getTranslation(sentence, progress.languageTo);
  
  // Build message with spoiler effect for translation
  let text = `📚 **${progress.category.toUpperCase()}** | 🇧🇬 → ${langEmoji}\n\n⏳ **${progress.currentIndex + 1}/${totalSentences}**\n\n${sentence.bg}\n\n||${translation}||`;
  
  // Add grammar explanation if available (middle level)
  if (progress.folder === 'middle' && sentence.grammar && sentence.explanation) {
    const grammarTags = sentence.grammar.map(tag => `#${tag}`).join(' ');
    text += `\n\n📝 <b>Grammar:</b> ${grammarTags}\n💡 <i>${sentence.explanation}</i>`;
  }

  // Add Slavic-specific explanations (middle-slavic level)
  if (progress.folder === 'middle-slavic') {
    if (sentence.tag === 'false-friend' && sentence.falseFriend) {
      text += `\n\n⚠️ <b>FALSE FRIEND!</b>\n🔴 <i>${sentence.falseFriend}</i>`;
    }
    
    if (sentence.comparison) {
      text += `\n\n🔗 <b>Slavic Bridge:</b> <i>${sentence.comparison}</i>`;
    }
  }

  // Add language-specific rules
  if (['language-comparison', 'misc', 'expressions'].includes(progress.folder)) {
    const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof typeof sentence]) {
      text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
    }
  }

  // Also add rules for middle-slavic if present
  if (progress.folder === 'middle-slavic') {
    const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof typeof sentence]) {
      text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
    }
  }

  const keyboards = getTranslatedKeyboards(progress.languageTo, progress.category, progress.folder, progress.currentIndex);
  progress.lessonMessageId = (await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: keyboards.showTranslation,
  })).message_id;
  
  progress.lessonActive = true;
  await saveUserProgress(progress);
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
  
  let text = `<b>📚 ${progress.category.toUpperCase()} | 🇧🇬 → ${langEmoji}</b>\n\n⏳ <b>${progress.currentIndex + 1}/${totalSentences}</b>\n\n${sentence.bg}\n\n🎯 <b>${translation}</b>`;
  
  // Add grammar explanation if available (middle level)
  if (progress.folder === 'middle' && sentence.grammar && sentence.explanation) {
    const grammarTags = sentence.grammar.map(tag => `#${tag}`).join(' ');
    text += `\n\n📝 <b>Grammar:</b> ${grammarTags}\n💡 <i>${sentence.explanation}</i>`;
  }

  // Add Slavic-specific explanations (middle-slavic level)
  if (progress.folder === 'middle-slavic') {
    if (sentence.tag === 'false-friend' && sentence.falseFriend) {
      text += `\n\n⚠️ <b>FALSE FRIEND!</b>\n🔴 <i>${sentence.falseFriend}</i>`;
    }
    
    if (sentence.comparison) {
      text += `\n\n🔗 <b>Slavic Bridge:</b> <i>${sentence.comparison}</i>`;
    }
  }

  // Add language-specific rules for language-comparison and other advanced folders
  if (['language-comparison', 'misc', 'expressions'].includes(progress.folder)) {
    const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof typeof sentence]) {
      text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
    }
  }

  // Also add rules for middle-slavic if present
  if (progress.folder === 'middle-slavic') {
    const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof typeof sentence]) {
      text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
    }
  }
  
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

/**
 * Mark a sentence as learned when user moves to next/previous
 */
async function markSentenceAsLearned(userId: number, sentenceId: string | undefined, folder: string, category: string): Promise<void> {
  if (!sentenceId) return;
  
  try {
    await SentenceMasteryModel.findOneAndUpdate(
      { userId, sentenceId },
      {
        $set: {
          userId,
          sentenceId,
          folder,
          category,
          status: 'learned',
          masteredAt: new Date(),
          lastReviewedAt: new Date(),
        },
        $inc: { reviewCount: 1 },
      },
      { upsert: true, new: true }
    );
    console.log(`✅ [MASTERY] Marked sentence ${sentenceId} as learned for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error marking sentence as learned: ${error}`);
  }
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
  
  // Mark current sentence as learned before moving to next
  const currentSentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
  if (currentSentence) {
    await markSentenceAsLearned(userId, currentSentence._id, progress.folder, progress.category);
  }

  if (progress.currentIndex < totalSentences - 1) {
    progress.currentIndex += 1;
    progress.audioMessageId = undefined; // Reset audio for new sentence
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      const translation = getTranslation(sentence, progress.languageTo);
      let text = `<b>📚 ${progress.category.toUpperCase()} | 🇧🇬 → ${langEmoji}</b>\n\n⏳ <b>${progress.currentIndex + 1}/${totalSentences}</b>\n\n${sentence.bg}\n\n<tg-spoiler>${translation}</tg-spoiler>`;
      
      // Add grammar explanation if available (middle level)
      if (progress.folder === 'middle' && sentence.grammar && sentence.explanation) {
        const grammarTags = sentence.grammar.map(tag => `#${tag}`).join(' ');
        text += `\n\n📝 <b>Grammar:</b> ${grammarTags}\n💡 <i>${sentence.explanation}</i>`;
      }

      // Add Slavic-specific explanations (middle-slavic level)
      if (progress.folder === 'middle-slavic') {
        if (sentence.tag === 'false-friend' && sentence.falseFriend) {
          text += `\n\n⚠️ <b>FALSE FRIEND!</b>\n🔴 <i>${sentence.falseFriend}</i>`;
        }
        
        if (sentence.comparison) {
          text += `\n\n🔗 <b>Slavic Bridge:</b> <i>${sentence.comparison}</i>`;
        }
      }

      // Add language-specific rules
      if (['language-comparison', 'misc', 'expressions'].includes(progress.folder)) {
        const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
        if (sentence[ruleKey as keyof typeof sentence]) {
          text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
        }
      }

      // Also add rules for middle-slavic if present
      if (progress.folder === 'middle-slavic') {
        const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
        if (sentence[ruleKey as keyof typeof sentence]) {
          text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
        }
      }
      
      const keyboards = getTranslatedKeyboards(progress.languageTo, progress.category, progress.folder, progress.currentIndex);
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
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
    
    const text = `${congratulations}\n\n✅ ${completed} <b>${progress.category.toUpperCase()}</b> lesson!\n\n📊 <b>${totalSentences}/${totalSentences}</b> ${mastered}\n\n${greatJob}`;
    
    const keyboards = getTranslatedKeyboards(progress.languageTo);
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
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
  
  // Mark current sentence as learned before moving to previous
  const currentSentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
  if (currentSentence) {
    await markSentenceAsLearned(userId, currentSentence._id, progress.folder, progress.category);
  }

  if (progress.currentIndex > 0) {
    progress.currentIndex -= 1;
    progress.audioMessageId = undefined; // Reset audio for new sentence
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      const translation = getTranslation(sentence, progress.languageTo);
      let text = `<b>📚 ${progress.category.toUpperCase()} | 🇧🇬 → ${langEmoji}</b>\n\n⏳ <b>${progress.currentIndex + 1}/${totalSentences}</b>\n\n${sentence.bg}\n\n<tg-spoiler>${translation}</tg-spoiler>`;
      
      // Add grammar explanation if available (middle level)
      if (progress.folder === 'middle' && sentence.grammar && sentence.explanation) {
        const grammarTags = sentence.grammar.map(tag => `#${tag}`).join(' ');
        text += `\n\n📝 <b>Grammar:</b> ${grammarTags}\n💡 <i>${sentence.explanation}</i>`;
      }

      // Add Slavic-specific explanations (middle-slavic level)
      if (progress.folder === 'middle-slavic') {
        if (sentence.tag === 'false-friend' && sentence.falseFriend) {
          text += `\n\n⚠️ <b>FALSE FRIEND!</b>\n🔴 <i>${sentence.falseFriend}</i>`;
        }
        
        if (sentence.comparison) {
          text += `\n\n🔗 <b>Slavic Bridge:</b> <i>${sentence.comparison}</i>`;
        }
      }

      // Add language-specific rules
      if (['language-comparison', 'misc', 'expressions'].includes(progress.folder)) {
        const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
        if (sentence[ruleKey as keyof typeof sentence]) {
          text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
        }
      }

      // Also add rules for middle-slavic if present
      if (progress.folder === 'middle-slavic') {
        const ruleKey = progress.languageTo === 'kharkiv' ? 'ruleRu' : progress.languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
        if (sentence[ruleKey as keyof typeof sentence]) {
          text += `\n\n📖 <i>${sentence[ruleKey as keyof typeof sentence]}</i>`;
        }
      }
      
      const keyboards = getTranslatedKeyboards(progress.languageTo, progress.category, progress.folder, progress.currentIndex);
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
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
      const translation = getTranslation(sentence, progress.languageTo);
      const atBeginning = getUIText('at_beginning', progress.languageTo);
      let text = `<b>📚 ${progress.category.toUpperCase()} | 🇧🇬 → ${langEmoji}</b>\n\n⏳ <b>${progress.currentIndex + 1}/${totalSentences}</b>\n\n${sentence.bg}\n\n<tg-spoiler>${translation}</tg-spoiler>\n\n${atBeginning}`;
      
      const keyboards = getTranslatedKeyboards(progress.languageTo, progress.category, progress.folder, progress.currentIndex);
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
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

export async function handleListenAudio(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;

    if (!chatId) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error: No chat found' });
      return;
    }

    // Get user progress
    const progress = await getUserProgressAsync(userId);
    if (!progress) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ You need to start a lesson first' });
      return;
    }

    // Fetch current sentence
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (!sentence || !sentence.audioUrl) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '⏳ Audio not available for this sentence' });
      return;
    }

    // Extract base64 audio and decode
    if (!sentence.audioUrl.startsWith('data:audio')) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Audio format error' });
      return;
    }

    const base64Data = sentence.audioUrl.split(',')[1];
    if (!base64Data) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Cannot decode audio' });
      return;
    }

    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Send audio file to Telegram
    await bot.sendAudio(chatId, audioBuffer, {
      caption: `🎙️ ${sentence.bg}`,
      parse_mode: 'HTML',
    });

    await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Audio sent' });
  } catch (error) {
    console.error('❌ Error in handleListenAudio:', error);
    const chatId = callbackQuery.message?.chat.id;
    if (chatId) {
      await bot.sendMessage(chatId, '❌ Error playing audio');
    }
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}
