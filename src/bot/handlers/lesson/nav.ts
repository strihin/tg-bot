import TelegramBot from 'node-telegram-bot-api';
import { getSentenceByIndex, getTotalSentences } from '../../../data/loader';
import { getUserProgressAsync, saveUserProgress } from '../../../data/progress';
import { getUIText } from '../../../utils/uiTranslation';
import { getTranslatedKeyboards } from '../../keyboards';
import { buildLessonText } from './text';
import { markSentenceAsLearned } from './mastery';
import { updateAudioMessageSmooth, updateTextMessageSmooth, sendFallbackMessage } from './audio';

/**
 * Handle Next button click
 */
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
    console.log(`⏭️ [NEXT] Entering next block, messageId=${messageId}`);

    progress.currentIndex += 1;
    progress.translationRevealed = false;
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    console.log(`📝 [NEXT] Fetched sentence, hasAudio: ${!!sentence?.audioUrl}`);

    if (sentence) {
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

      // For audio messages: always send new + delete old (can't edit audio file via API)
      // For text messages: try to edit first, fallback to send+delete
      let updated = false;

      if (!sentence.audioUrl) {
        // Text message only - try edit first
        try {
          console.log(`🔄 [NEXT] Updating text message...`);
          await bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboards.showTranslation,
          });
          console.log(`✅ [NEXT] Text message updated successfully`);
          updated = true;
        } catch (error) {
          console.log(`⚠️ [NEXT] Text edit failed, will send new message. Error: ${error}`);
        }
      } else {
        // Audio message - must send new audio (can't change audio file via edit)
        console.log(`🎵 [NEXT] Audio message detected - will send new audio + delete old`);
      }

      // Optimized smooth transition: send new immediately, delete old in background
      if (!updated) {
        const skeleton = `<b>📚 ${progress.category.toUpperCase()} | 🇧🇬</b>\n\n⏳ <b>${progress.currentIndex + 1}/${totalSentences}</b>\n\n<i>▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮</i>\n\n⏳ <i>Loading...</i>\n\n<tg-spoiler><i>▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮</i></tg-spoiler>`;

        // AUDIO MESSAGE: Send new immediately (no skeleton visible)
        if (sentence.audioUrl) {
          try {
            const newMsgId = await updateAudioMessageSmooth(
              bot,
              chatId,
              messageId,
              sentence.audioUrl,
              text,
              keyboards,
              progress.category,
              progress.currentIndex + 1,
              'NEXT'
            );
            progress.lessonMessageId = newMsgId;
          } catch (audioError) {
            console.log(`❌ [NEXT] Audio update fallback:`, audioError);
          }
        } else {
          // TEXT MESSAGE: Smooth skeleton → real content transition
          const success = await updateTextMessageSmooth(
            bot,
            chatId,
            messageId,
            skeleton,
            text,
            keyboards,
            'NEXT'
          );

          if (success) {
            progress.lessonMessageId = messageId;
          } else {
            // Fallback: send new message
            try {
              const fallbackId = await sendFallbackMessage(bot, chatId, text, keyboards, 'NEXT');
              progress.lessonMessageId = fallbackId;
            } catch (error) {
              console.log(`❌ [NEXT] Even fallback failed:`, error);
            }
          }
        }
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

    // Reset lesson state after completion so /start doesn't show "Continue lesson"
    progress.lessonActive = false;
    progress.translationRevealed = false;
    await saveUserProgress(progress);
    console.log(`✅ Lesson completed - reset lessonActive for user ${userId}`);
  }

  const nextText = getUIText('next_clicked', progress.languageTo);
  await bot.answerCallbackQuery(callbackQuery.id, { text: nextText });
}

/**
 * Handle Previous button click
 */
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
    // Show skeleton immediately to prevent jarring message shift
    const skeleton = `<b>📚 ${progress.category.toUpperCase()} | 🇧🇬</b>\n\n⏳ <b>${progress.currentIndex}/${totalSentences}</b>\n\n<i>▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮</i>\n\n<tg-spoiler><i>▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮</i></tg-spoiler>`;

    try {
      // Try editing text first (works for both text and audio captions)
      await bot.editMessageText(skeleton, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // If text edit failed, try caption (for audio/voice)
      try {
        await bot.editMessageCaption(skeleton, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
        });
      } catch (captionError) {
        console.log(`⚠️ Failed to show skeleton:`, captionError);
      }
    }

    progress.currentIndex -= 1;
    progress.translationRevealed = false;
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    console.log(`📝 [PREVIOUS] Fetched sentence, hasAudio: ${!!sentence?.audioUrl}`);

    if (sentence) {
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

      // Update skeleton with real content
      let updated = false;
      try {
        console.log(`🔄 [PREV] Updating with real content (trying text)...`);
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: keyboards.showTranslation,
        });
        console.log(`✅ [PREV] Message updated successfully via text edit`);
        updated = true;
      } catch (error) {
        // Try caption if text edit failed
        try {
          console.log(`🔄 [PREV] Text update failed, trying caption...`);
          await bot.editMessageCaption(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboards.showTranslation,
          });
          console.log(`✅ [PREV] Message updated successfully via caption edit`);
          updated = true;
        } catch (captionError) {
          console.log(`⚠️ [PREV] Both edits failed, will send new message. Error: ${captionError}`);
        }
      }

      // Fallback: if both edits failed, send new message
      if (!updated) {
        const skeleton = `<b>📚 ${progress.category.toUpperCase()} | 🇧🇬</b>\n\n⏳ <b>${progress.currentIndex + 1}/${totalSentences}</b>\n\n<i>▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮</i>\n\n⏳ <i>Loading...</i>\n\n<tg-spoiler><i>▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮</i></tg-spoiler>`;

        // AUDIO MESSAGE: Send new immediately (no skeleton visible)
        if (sentence.audioUrl) {
          try {
            const newMsgId = await updateAudioMessageSmooth(
              bot,
              chatId,
              messageId,
              sentence.audioUrl,
              text,
              keyboards,
              progress.category,
              progress.currentIndex + 1,
              'PREV'
            );
            progress.lessonMessageId = newMsgId;
          } catch (audioError) {
            console.log(`❌ [PREV] Audio update fallback:`, audioError);
          }
        } else {
          // TEXT MESSAGE: Smooth skeleton → real content transition
          const success = await updateTextMessageSmooth(
            bot,
            chatId,
            messageId,
            skeleton,
            text,
            keyboards,
            'PREV'
          );

          if (success) {
            progress.lessonMessageId = messageId;
          } else {
            // Fallback: send new message
            try {
              const fallbackId = await sendFallbackMessage(bot, chatId, text, keyboards, 'PREV');
              progress.lessonMessageId = fallbackId;
            } catch (error) {
              console.log(`❌ [PREV] Even fallback failed:`, error);
            }
          }
        }
      }

      await saveUserProgress(progress);
    }
  } else {
    // Already at beginning - show current sentence
    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (sentence) {
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
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: keyboards.showTranslation,
        });
      } catch (error) {
        try {
          await bot.editMessageCaption(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboards.showTranslation,
          });
        } catch (captionError) {
          console.log(`⚠️ Failed to update message:`, captionError);
        }
      }
    }
  }

  const prevText = getUIText('previous_clicked', progress.languageTo);
  await bot.answerCallbackQuery(callbackQuery.id, { text: prevText });
}
