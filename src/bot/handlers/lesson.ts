import TelegramBot from 'node-telegram-bot-api';
import { getSentenceByIndex, getTotalSentences } from '../../data/loader';
import { getUserProgressAsync, saveUserProgress, initializeUserProgress } from '../../data/progress';
import { getTranslation, getLanguageEmoji } from '../../utils/translation';
import { getUIText } from '../../utils/uiTranslation';
import { getTranslatedKeyboards } from '../keyboards';
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
      progress.translationRevealed = false; // Reset blur state for new category
      progress.lastFolder = progress.folder; // Save current folder as last
      progress.lastCategory = category; // Save current category as last
      await saveUserProgress(progress);  // Save the category change immediately
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
    progress.translationRevealed = false; // Reset blur state for new sentence
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    console.log(`📝 [NEXT] Fetched sentence, hasAudio: ${!!sentence?.audioUrl}`);
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
      const oldMessageId = progress.lessonMessageId;

      // Send new message first (prevents gap)
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
          console.log(`⚠️ Failed to send audio:`, audioError);
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

      // Delete old message after brief delay for smooth transition
      if (oldMessageId) {
        setTimeout(async () => {
          try {
            await bot.deleteMessage(chatId, oldMessageId);
            console.log(`🗑️ Deleted old message ${oldMessageId}`);
          } catch (error) {
            console.log(`⚠️ Failed to delete old message:`, error);
          }
        }, 100); // 100ms delay for smooth animation
      }

      await saveUserProgress(progress);
    }
  } else {
    // Reached end - send completion message
    const congratulations = getUIText('congratulations', progress.languageTo);
    const completed = getUIText('lesson_completed', progress.languageTo);
    const mastered = getUIText('sentences_mastered', progress.languageTo);
    const greatJob = getUIText('great_job', progress.languageTo);

    const text = `${congratulations}\n\n✅ ${completed} <b>${progress.category.toUpperCase()}</b> lesson!\n\n📊 <b>${totalSentences}/${totalSentences}</b> ${mastered}\n\n${greatJob}`;

    const keyboards = getTranslatedKeyboards(progress.languageTo);
    try {
      // Delete old audio message first
      await bot.deleteMessage(chatId, messageId);
      console.log(`🗑️ Deleted old audio message ${messageId}`);

      // Send new completion message
      const msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboards.lessonComplete,
      });
      console.log(`📤 Sent completion message ${msg.message_id}`);
    } catch (error) {
      console.error('Error sending completion message:', error);
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
    progress.translationRevealed = false; // Reset blur state for new sentence
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
      const oldMessageId = progress.lessonMessageId;

      // Send new message first (prevents gap)
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
          console.log(`⚠️ Failed to send audio:`, audioError);
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

      // Delete old message after brief delay for smooth transition
      if (oldMessageId) {
        setTimeout(async () => {
          try {
            await bot.deleteMessage(chatId, oldMessageId);
            console.log(`🗑️ Deleted old message ${oldMessageId}`);
          } catch (error) {
            console.log(`⚠️ Failed to delete old message:`, error);
          }
        }, 100); // 100ms delay for smooth animation
      }

      await saveUserProgress(progress);
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
