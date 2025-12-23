import TelegramBot from 'node-telegram-bot-api';
import { FavouriteModel } from '../../db/models';
import { ensureMongoDBConnection } from '../../db/mongodb';
import { getSentenceByIndex } from '../../data/loader';
import { getUserProgressAsync } from '../../data/progress';

// Store favourite index per user temporarily
const favouriteIndexMap: Record<number, number> = {};

/**
 * Add current sentence to user's favourites
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
 * Get user's favourite sentences count
 */
export async function getFavouritesCount(userId: number): Promise<number> {
  await ensureMongoDBConnection();
  return await FavouriteModel.countDocuments({ userId });
}

/**
 * Get all user's favourites
 */
export async function getUserFavourites(userId: number) {
  await ensureMongoDBConnection();
  return await FavouriteModel.find({ userId })
    .sort({ addedAt: -1 })
    .lean();
}

/**
 * Start favourite lesson with user's saved sentences
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

    // Show first favourite
    favouriteIndexMap[userId] = 0;
    await displayFavourite(chatId, bot, userId, favourites, 0);

    console.log(`⭐ Started favourite lesson with ${count} sentences`);
  } catch (error) {
    console.error('❌ Error starting favourite lesson:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading favourites');
  }
}

/**
 * Display favourite sentence with keyboard
 */
async function displayFavourite(
  chatId: number,
  bot: TelegramBot,
  userId: number,
  favourites: any[],
  index: number
): Promise<void> {
  const favourite = favourites[index];
  const count = favourites.length;

  const text = `<b>⭐ FAVOURITE WORDS | Learning</b>\n\n⏳ <b>${index + 1}/${count}</b>\n\n${favourite.bg}\n\n<tg-spoiler>${favourite.eng}</tg-spoiler>`;

  const keyboards = {
    inline_keyboard: [
      [
        {
          text: '📖 Show translation',
          callback_data: `show_favourite_translation:${index}`,
        },
        {
          text: '🎙️ Listen',
          callback_data: 'favourite_listen_audio',
        },
      ],
      [
        {
          text: '🗑️ Remove from favourite',
          callback_data: `remove_favourite:${index}`,
        },
        {
          text: '⏭️ Next',
          callback_data: 'favourite_next',
        },
      ],
      [
        {
          text: '🏠 Main menu',
          callback_data: 'back_to_menu',
        },
      ],
    ],
  };

  const message = await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: keyboards,
  });
}

/**
 * Show translation for favourite
 */
export async function handleShowFavouriteTranslation(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const data = callbackQuery.data || '';
    const index = parseInt(data.split(':')[1]) || 0;

    if (!chatId) return;

    const favourites = await getUserFavourites(userId);
    if (!favourites || index >= favourites.length) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Sentence not found' });
      return;
    }

    const favourite = favourites[index];
    const count = favourites.length;

    const text = `<b>⭐ FAVOURITE WORDS | Learning</b>\n\n⏳ <b>${index + 1}/${count}</b>\n\n${favourite.bg}\n\n🇬🇧 <b>${favourite.eng}</b>`;

    const keyboards = {
      inline_keyboard: [
        [
          {
            text: '📖 Show translation',
            callback_data: `show_favourite_translation:${index}`,
          },
          {
            text: '🎙️ Listen',
            callback_data: 'favourite_listen_audio',
          },
        ],
        [
          {
            text: '🗑️ Remove from favourite',
            callback_data: `remove_favourite:${index}`,
          },
          {
            text: '⏭️ Next',
            callback_data: 'favourite_next',
          },
        ],
        [
          {
            text: '🏠 Main menu',
            callback_data: 'back_to_menu',
          },
        ],
      ],
    };

    const messageId = callbackQuery.message?.message_id;
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: keyboards,
      });
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('❌ Error showing favourite translation:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}

/**
 * Listen to favourite sentence audio
 */
export async function handleFavouriteListenAudio(
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

    const currentIndex = favouriteIndexMap[userId] || 0;
    const favourites = await getUserFavourites(userId);

    if (!favourites || currentIndex >= favourites.length) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Sentence not found' });
      return;
    }

    const favourite = favourites[currentIndex];

    if (!favourite.audioUrl) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '⏳ Audio not available' });
      return;
    }

    // Extract base64 audio and decode
    if (!favourite.audioUrl.startsWith('data:audio')) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Audio format error' });
      return;
    }

    const base64Data = favourite.audioUrl.split(',')[1];
    if (!base64Data) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Cannot decode audio' });
      return;
    }

    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Send audio file to Telegram
    await bot.sendAudio(chatId, audioBuffer, {
      caption: `<b>🎙️ ${favourite.bg}</b>`,
      parse_mode: 'HTML',
    });

    await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Audio sent' });
  } catch (error) {
    console.error('❌ Error in handleFavouriteListenAudio:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}

/**
 * Next favourite
 */
export async function handleFavouriteNext(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;

    if (!chatId) return;

    const favourites = await getUserFavourites(userId);
    if (!favourites || favourites.length === 0) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ No favourites' });
      return;
    }

    let currentIndex = favouriteIndexMap[userId] || 0;
    currentIndex = (currentIndex + 1) % favourites.length;
    favouriteIndexMap[userId] = currentIndex;

    const messageId = callbackQuery.message?.message_id;
    if (messageId) {
      const favourite = favourites[currentIndex];
      const count = favourites.length;

      const text = `<b>⭐ FAVOURITE WORDS | Learning</b>\n\n⏳ <b>${currentIndex + 1}/${count}</b>\n\n${favourite.bg}\n\n<tg-spoiler>${favourite.eng}</tg-spoiler>`;

      const keyboards = {
        inline_keyboard: [
          [
            {
              text: '📖 Show translation',
              callback_data: `show_favourite_translation:${currentIndex}`,
            },
            {
              text: '🎙️ Listen',
              callback_data: 'favourite_listen_audio',
            },
          ],
          [
            {
              text: '🗑️ Remove from favourite',
              callback_data: `remove_favourite:${currentIndex}`,
            },
            {
              text: '⏭️ Next',
              callback_data: 'favourite_next',
            },
          ],
          [
            {
              text: '🏠 Main menu',
              callback_data: 'back_to_menu',
            },
          ],
        ],
      };

      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: keyboards,
      });
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('❌ Error in handleFavouriteNext:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}

/**
 * Remove favourite
 */
export async function handleRemoveFavourite(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const data = callbackQuery.data || '';
    const index = parseInt(data.split(':')[1]) || 0;

    if (!chatId) return;

    const favourites = await getUserFavourites(userId);
    if (!favourites || index >= favourites.length) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Sentence not found' });
      return;
    }

    const favourite = favourites[index];

    console.log(`🗑️ DEBUG: Removing favourite at index ${index}`);
    console.log(`🗑️ DEBUG: sentenceId to delete: ${favourite.sentenceId}`);
    console.log(`🗑️ DEBUG: userId: ${userId}`);

    // Delete from favourites
    const deleteResult = await FavouriteModel.deleteOne({
      userId,
      sentenceId: favourite.sentenceId,
    });

    console.log(`🗑️ DEBUG: Delete result:`, deleteResult);

    console.log(`🗑️ Removed from favourites: "${favourite.bg}"`);

    // Get updated favourites
    const updated = await getUserFavourites(userId);

    if (updated.length === 0) {
      // No more favourites
      await bot.sendMessage(chatId, '⭐ All favourites removed!\n\nYou can add new ones during lessons using the ⭐ button.');
      await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Removed' });
      return;
    }

    // Show next favourite or previous
    let nextIndex = index;
    if (nextIndex >= updated.length) {
      nextIndex = updated.length - 1;
    }

    favouriteIndexMap[userId] = nextIndex;

    // Delete old message first
    const messageId = callbackQuery.message?.message_id;
    if (messageId) {
      try {
        await bot.deleteMessage(chatId, messageId);
      } catch (e) {
        // Ignore delete errors
      }
    }

    // Send new message with updated favourite
    await displayFavourite(chatId, bot, userId, updated, nextIndex);

    await bot.answerCallbackQuery(callbackQuery.id, { text: '🗑️ Removed from favourites' });
  } catch (error) {
    console.error('❌ Error removing favourite:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error' });
  }
}
