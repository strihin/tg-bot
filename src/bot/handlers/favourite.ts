import TelegramBot from 'node-telegram-bot-api';
import { FavouriteModel } from '../../db/models';
import { ensureMongoDBConnection } from '../../db/mongodb';
import { getSentenceByIndex } from '../../data/loader';
import { getUserProgressAsync, saveUserProgress } from '../../data/progress';
import { deleteAllTrackedMessages } from '../helpers/messageTracker';

// Store favourite index, message ID, and list for each user (session map)
export const favouriteIndexMap: Record<number, number> = {};
export const favouriteMessageIdMap: Record<number, number> = {};
export const favouritesListMap: Record<number, any[]> = {};

/**
 * Add current lesson sentence to favourites
 * Called from lesson handler when user clicks ⭐ button
 */
export async function handleAddFavourite(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;

    console.log(`⭐ Add to Favourites - User: ${userId}`);

    await ensureMongoDBConnection();
    const progress = await getUserProgressAsync(userId);

    if (!progress) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ No active lesson' });
      return;
    }

    const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
    if (!sentence || !sentence._id) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Sentence not found' });
      return;
    }

    // Add to favourites
    try {
      await FavouriteModel.findOneAndUpdate(
        {
          userId,
          sentenceId: sentence._id,
        },
        {
          userId,
          sentenceId: sentence._id,
          folder: progress.folder,
          category: progress.category,
          bg: sentence.bg,
          eng: sentence.eng,
          ru: sentence.ru,
          ua: sentence.ua,
          audioUrl: sentence.audioUrl,
          addedAt: new Date(),
        },
        { upsert: true }
      );

      console.log(`⭐ Added to favourites: "${sentence.bg}"`);

      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '⭐ Added to favourites!',
        show_alert: false,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        // Already in favourites
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '⭐ Already in favourites',
          show_alert: false,
        });
        console.log(`⭐ Already in favourites: "${sentence.bg}"`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`❌ Error adding to favourites:`, error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error saving to favourites' });
  }
}

/**
 * Get count of user's favourite sentences
 */
export async function getFavouritesCount(userId: number): Promise<number> {
  await ensureMongoDBConnection();
  return await FavouriteModel.countDocuments({ userId });
}

/**
 * Get all user's favourite sentences
 */
export async function getUserFavourites(userId: number) {
  await ensureMongoDBConnection();
  return await FavouriteModel.find({ userId })
    .sort({ addedAt: -1 })
    .lean();
}

/**
 * Start favourite lesson with user's saved sentences
 * Displays one favourite card at a time with audio in caption (like lesson handler)
 * Translation shown based on current language preference
 */
export async function handleStartFavouriteLesson(
  msg: TelegramBot.Message,
  bot: TelegramBot,
  userId: number
): Promise<void> {
  try {
    const chatId = msg.chat.id;

    console.log(`⭐ Starting favourite lesson for user ${userId}`);

    await ensureMongoDBConnection();

    // Get user's current language
    const progress = await getUserProgressAsync(userId);
    const languageTo = progress?.languageTo || 'eng';
    
    // Clean up old tracked messages (removes cached persistent keyboard buttons)
    if (progress?.sentMessageIds && progress.sentMessageIds.length > 0) {
      console.log(`🧹 Cleaning up ${progress.sentMessageIds.length} old messages from user's chat...`);
      const cleanup = await deleteAllTrackedMessages(bot, chatId, progress.sentMessageIds);
      console.log(`🧹 Cleanup complete: ${cleanup.successful} deleted, ${cleanup.failed} failed`);
      
      // Clear the tracked message IDs
      progress.sentMessageIds = [];
      await saveUserProgress(progress);
    }

    // Check if user has any favourites
    const count = await getFavouritesCount(userId);
    if (count === 0) {
      await bot.sendMessage(chatId, '⭐ You don\'t have any favourite sentences yet!\n\nUse the ⭐ button during lessons to add sentences to your favourites.');
      return;
    }

    // Fetch user's favourites
    const favourites = await getUserFavourites(userId);

    if (!favourites || favourites.length === 0) {
      await bot.sendMessage(chatId, '❌ No favourites found');
      return;
    }

    // Cache favourites and reset index for this session
    favouritesListMap[userId] = favourites;
    favouriteIndexMap[userId] = 0;

    // Show first favourite with audio in caption
    await displayFavouriteCard(chatId, bot, userId, 0, languageTo);

    console.log(`⭐ Started favourite lesson with ${count} sentences`);
  } catch (error) {
    console.error('❌ Error starting favourite lesson:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading favourites');
  }
}

/**
 * Display favourite card with audio in caption (same pattern as lesson.ts)
 * Shows Bulgarian → translation in spoiler (in user's current language)
 */
async function displayFavouriteCard(
  chatId: number,
  bot: TelegramBot,
  userId: number,
  index: number,
  languageTo: string
): Promise<void> {
  try {
    const favourites = favouritesListMap[userId] || [];
    if (!favourites[index]) return;

    const favourite = favourites[index];
    const count = favourites.length;

    // Get translation based on language
    const translation = languageTo === 'kharkiv' ? favourite.ru : languageTo === 'ua' ? favourite.ua : favourite.eng;

    console.log(`⭐ Display Card - User: ${userId}, Index: ${index}, Language: ${languageTo}, Translation: "${translation.substring(0, 30)}..."`);

    const text = `<b>⭐ FAVOURITE WORDS</b>\n\n⏳ <b>${index + 1}/${count}</b>\n\n${favourite.bg}\n\n<tg-spoiler>${translation}</tg-spoiler>`;

    const keyboards = {
      inline_keyboard: [
        [
          {
            text: '⬅️ Previous',
            callback_data: 'favourite_previous',
          },
          {
            text: '⏭️ Next',
            callback_data: 'favourite_next',
          },
        ],
        [
          {
            text: '🗑️ Remove',
            callback_data: 'favourite_remove',
          },
          {
            text: '🏠 Main menu',
            callback_data: 'back_to_menu',
          },
        ],
      ],
    };

    let msg;

    // Send audio with caption (exactly like lesson handler does)
    if (favourite.audioUrl) {
      try {
        const base64Data = favourite.audioUrl.includes(',')
          ? favourite.audioUrl.split(',')[1]
          : favourite.audioUrl;
        const audioBuffer = Buffer.from(base64Data, 'base64');
        msg = await bot.sendAudio(chatId, audioBuffer, {
          caption: text,
          parse_mode: 'HTML',
          reply_markup: keyboards,
          title: `Favourite ${index + 1}/${count}`,
        });
        console.log(`🎵 Favourite audio message sent with ID ${msg.message_id}`);
      } catch (audioError) {
        console.log(`⚠️ Failed to send favourite audio, sending text only:`, audioError);
        msg = await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          reply_markup: keyboards,
        });
      }
    } else {
      msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboards,
      });
    }

    // Store message ID for editing on next/previous
    favouriteMessageIdMap[userId] = msg.message_id;
  } catch (error) {
    console.error('❌ Error displaying favourite card:', error);
  }
}


/**
 * Navigate to next favourite
 * Sends new message with new audio, then deletes old one (like lesson handler)
 */
export async function handleFavouriteNext(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId || !messageId) return;

    // Get user's current language
    const progress = await getUserProgressAsync(userId);
    const languageTo = progress?.languageTo || 'eng';

    console.log(`⭐ Favourite Next - User: ${userId}, Language: ${languageTo}`);

    const favourites = favouritesListMap[userId] || [];
    if (favourites.length === 0) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ No favourites' });
      return;
    }

    let index = (favouriteIndexMap[userId] || 0) + 1;
    if (index >= favourites.length) {
      index = 0; // Loop back to start
    }

    favouriteIndexMap[userId] = index;
    const favourite = favourites[index];
    const count = favourites.length;

    // Get translation based on language
    const translation = languageTo === 'kharkiv' ? favourite.ru : languageTo === 'ua' ? favourite.ua : favourite.eng;

    console.log(`⭐ Showing translation: ${languageTo} = "${translation.substring(0, 50)}..."`);

    const text = `<b>⭐ FAVOURITE WORDS</b>\n\n⏳ <b>${index + 1}/${count}</b>\n\n${favourite.bg}\n\n<tg-spoiler>${translation}</tg-spoiler>`;

    const keyboards = {
      inline_keyboard: [
        [
          {
            text: '⬅️ Previous',
            callback_data: 'favourite_previous',
          },
          {
            text: '⏭️ Next',
            callback_data: 'favourite_next',
          },
        ],
        [
          {
            text: '🗑️ Remove',
            callback_data: 'favourite_remove',
          },
          {
            text: '🏠 Main menu',
            callback_data: 'back_to_menu',
          },
        ],
      ],
    };

    // Send new message with new audio (like lesson handler)
    let msg;
    if (favourite.audioUrl) {
      try {
        const base64Data = favourite.audioUrl.includes(',')
          ? favourite.audioUrl.split(',')[1]
          : favourite.audioUrl;
        const audioBuffer = Buffer.from(base64Data, 'base64');
        msg = await bot.sendAudio(chatId, audioBuffer, {
          caption: text,
          parse_mode: 'HTML',
          reply_markup: keyboards,
          title: `Favourite ${index + 1}/${count}`,
        });
        console.log(`🎵 Favourite audio message sent with ID ${msg.message_id}`);
      } catch (audioError) {
        console.log(`⚠️ Failed to send favourite audio:`, audioError);
        msg = await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          reply_markup: keyboards,
        });
      }
    } else {
      msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboards,
      });
    }

    favouriteMessageIdMap[userId] = msg.message_id;

    // Delete old message after brief delay (100ms for smooth animation)
    setTimeout(async () => {
      try {
        await bot.deleteMessage(chatId, messageId);
        console.log(`🗑️ Deleted old favourite message ${messageId}`);
      } catch (error) {
        console.log(`⚠️ Failed to delete old favourite message:`, error);
      }
    }, 100);

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('❌ Error in handleFavouriteNext:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}

/**
 * Navigate to previous favourite
 * Sends new message with new audio, then deletes old one (like lesson handler)
 */
export async function handleFavouritePrevious(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId || !messageId) return;

    // Get user's current language
    const progress = await getUserProgressAsync(userId);
    const languageTo = progress?.languageTo || 'eng';

    console.log(`⭐ Favourite Previous - User: ${userId}, Language: ${languageTo}`);

    const favourites = favouritesListMap[userId] || [];
    if (favourites.length === 0) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ No favourites' });
      return;
    }

    let index = (favouriteIndexMap[userId] || 0) - 1;
    if (index < 0) {
      index = favourites.length - 1; // Loop back to end
    }

    favouriteIndexMap[userId] = index;
    const favourite = favourites[index];
    const count = favourites.length;

    // Get translation based on language
    const translation = languageTo === 'kharkiv' ? favourite.ru : languageTo === 'ua' ? favourite.ua : favourite.eng;

    console.log(`⭐ Showing translation: ${languageTo} = "${translation.substring(0, 50)}..."`);

    const text = `<b>⭐ FAVOURITE WORDS</b>\n\n⏳ <b>${index + 1}/${count}</b>\n\n${favourite.bg}\n\n<tg-spoiler>${translation}</tg-spoiler>`;

    const keyboards = {
      inline_keyboard: [
        [
          {
            text: '⬅️ Previous',
            callback_data: 'favourite_previous',
          },
          {
            text: '⏭️ Next',
            callback_data: 'favourite_next',
          },
        ],
        [
          {
            text: '🗑️ Remove',
            callback_data: 'favourite_remove',
          },
          {
            text: '🏠 Main menu',
            callback_data: 'back_to_menu',
          },
        ],
      ],
    };

    // Send new message with new audio (like lesson handler)
    let msg;
    if (favourite.audioUrl) {
      try {
        const base64Data = favourite.audioUrl.includes(',')
          ? favourite.audioUrl.split(',')[1]
          : favourite.audioUrl;
        const audioBuffer = Buffer.from(base64Data, 'base64');
        msg = await bot.sendAudio(chatId, audioBuffer, {
          caption: text,
          parse_mode: 'HTML',
          reply_markup: keyboards,
          title: `Favourite ${index + 1}/${count}`,
        });
        console.log(`🎵 Favourite audio message sent with ID ${msg.message_id}`);
      } catch (audioError) {
        console.log(`⚠️ Failed to send favourite audio:`, audioError);
        msg = await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          reply_markup: keyboards,
        });
      }
    } else {
      msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboards,
      });
    }

    favouriteMessageIdMap[userId] = msg.message_id;

    // Delete old message after brief delay (100ms for smooth animation)
    setTimeout(async () => {
      try {
        await bot.deleteMessage(chatId, messageId);
        console.log(`🗑️ Deleted old favourite message ${messageId}`);
      } catch (error) {
        console.log(`⚠️ Failed to delete old favourite message:`, error);
      }
    }, 100);

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('❌ Error in handleFavouritePrevious:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}

/**
 * Remove favourite and show next one or end lesson
 * Sends new message with new audio, then deletes old one (like lesson handler)
 */
export async function handleRemoveFavourite(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId || !messageId) return;

    // Get user's current language
    const progress = await getUserProgressAsync(userId);
    const languageTo = progress?.languageTo || 'eng';

    const favourites = favouritesListMap[userId] || [];
    const index = favouriteIndexMap[userId] || 0;

    if (!favourites[index]) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Sentence not found' });
      return;
    }

    const favourite = favourites[index];

    // Delete from database
    await ensureMongoDBConnection();
    await FavouriteModel.deleteOne({
      userId,
      sentenceId: favourite.sentenceId,
    });

    console.log(`🗑️ Removed from favourites: "${favourite.bg}"`);

    // Remove from cache
    favourites.splice(index, 1);

    // If no more favourites, end lesson
    if (favourites.length === 0) {
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await bot.sendMessage(chatId, '⭐ All favourites removed!\n\nYou can add new ones during lessons using the ⭐ button.');
      await bot.answerCallbackQuery(callbackQuery.id, { text: '🗑️ Removed' });
      return;
    }

    // Show next or previous favourite (adjust index if at end)
    let nextIndex = index;
    if (nextIndex >= favourites.length) {
      nextIndex = favourites.length - 1;
    }

    favouriteIndexMap[userId] = nextIndex;
    const nextFavourite = favourites[nextIndex];
    const count = favourites.length;

    // Get translation based on language
    const translation = languageTo === 'kharkiv' ? nextFavourite.ru : languageTo === 'ua' ? nextFavourite.ua : nextFavourite.eng;

    const text = `<b>⭐ FAVOURITE WORDS</b>\n\n⏳ <b>${nextIndex + 1}/${count}</b>\n\n${nextFavourite.bg}\n\n<tg-spoiler>${translation}</tg-spoiler>`;

    const keyboards = {
      inline_keyboard: [
        [
          {
            text: '⬅️ Previous',
            callback_data: 'favourite_previous',
          },
          {
            text: '⏭️ Next',
            callback_data: 'favourite_next',
          },
        ],
        [
          {
            text: '🗑️ Remove',
            callback_data: 'favourite_remove',
          },
          {
            text: '🏠 Main menu',
            callback_data: 'back_to_menu',
          },
        ],
      ],
    };

    // Send new message with new audio (like lesson handler)
    let msg;
    if (nextFavourite.audioUrl) {
      try {
        const base64Data = nextFavourite.audioUrl.includes(',')
          ? nextFavourite.audioUrl.split(',')[1]
          : nextFavourite.audioUrl;
        const audioBuffer = Buffer.from(base64Data, 'base64');
        msg = await bot.sendAudio(chatId, audioBuffer, {
          caption: text,
          parse_mode: 'HTML',
          reply_markup: keyboards,
          title: `Favourite ${nextIndex + 1}/${count}`,
        });
        console.log(`🎵 Favourite audio message sent with ID ${msg.message_id}`);
      } catch (audioError) {
        console.log(`⚠️ Failed to send favourite audio:`, audioError);
        msg = await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          reply_markup: keyboards,
        });
      }
    } else {
      msg = await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboards,
      });
    }

    favouriteMessageIdMap[userId] = msg.message_id;

    // Delete old message after brief delay (100ms for smooth animation)
    setTimeout(async () => {
      try {
        await bot.deleteMessage(chatId, messageId);
        console.log(`🗑️ Deleted old favourite message ${messageId}`);
      } catch (error) {
        console.log(`⚠️ Failed to delete old favourite message:`, error);
      }
    }, 100);

    await bot.answerCallbackQuery(callbackQuery.id, { text: '🗑️ Removed from favourites' });
  } catch (error) {
    console.error('❌ Error removing favourite:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}

