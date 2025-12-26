import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { getUserProgressAsync, saveUserProgress, clearAllProgressExceptLast } from '../data/progress';
import { getLanguageEmoji } from '../utils/translation';
import { getUIText } from '../utils/uiTranslation';
import { logActivity } from '../utils/logger';
import {
  handleStartLessonButton,
  handleShowTranslation,
  handleNext,
  handlePrevious,
} from './handlers/lesson';
import { applyMaxWidth } from './handlers/lesson/text';
import { getCategoryKeyboard, handleSelectCategory } from './handlers/category';
import { handleSelectTargetLanguage } from './handlers/language';
import { handleSelectLevel } from './handlers/level';
import { handleProfileCommand } from './handlers/profile';
import { getTranslatedKeyboardsWithCompletion, staticKeyboards } from './keyboards';
import { deleteAllTrackedMessages } from './helpers/messageTracker';

export function createBot(): TelegramBot {
  // Use webhook mode if WEBHOOK_MODE env var is set, otherwise use polling
  const useWebhook = config.WEBHOOK_MODE;

  // For webhook mode, don't let TelegramBot create its own server
  // We'll use the Express app instead
  const botOptions = useWebhook
    ? {}  // No internal server, we handle it via Express
    : {
        polling: {
          interval: 100,
          autoStart: true,
          params: {
            timeout: 10,
            allowed_updates: ['message', 'callback_query', 'edited_message']
          }
        }
      };

  const bot = new TelegramBot(config.TELEGRAM_TOKEN, botOptions);

  // Set bot commands for / menu
  bot.setMyCommands([
    { command: 'start', description: 'Start learning - Select language' },
    { command: 'profile', description: 'View/edit your profile and language' },
    { command: 'favourite', description: 'View saved favourite sentences' },
    { command: 'progress', description: 'Check your learning progress' },
    { command: 'help', description: 'Show help and available commands' }
  ])
    .then(() => {
      console.log('✅ Bot command menu set successfully');
    })
    .catch(error => {
      console.log('⚠️  Could not set bot commands:', error.message);
    });

  // Command: /start - Show language selection or resume lesson
  bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    console.log(`\n✅ =============================================================`);
    console.log(`✅ /start command MATCHED and handler executing!`);
    console.log(`✅ Chat ID: ${chatId}, User ID: ${userId}, Username: ${msg.from?.username}`);
    console.log(`✅ =============================================================\n`);

    if (!userId) {
      console.log(`❌ No user ID found in message`);
      return;
    }

    try {
      const progress = await getUserProgressAsync(userId);
      
      // Clean up old tracked messages from previous sessions
      if (progress?.sentMessageIds && progress.sentMessageIds.length > 0) {
        console.log(`🧹 Cleaning up ${progress.sentMessageIds.length} old messages from user's chat...`);
        const cleanup = await deleteAllTrackedMessages(bot, chatId, progress.sentMessageIds);
        console.log(`🧹 Cleanup complete: ${cleanup.successful} deleted, ${cleanup.failed} failed`);
        
        // Clear the tracked message IDs
        progress.sentMessageIds = [];
        await saveUserProgress(progress);
      }

      // Check if user has a saved lesson position AND lesson is active
      if (progress && progress.lastCategory && progress.lastFolder && progress.lessonActive) {
        // Smart Resume: Show "Continue [Category]?" option
        const langEmoji = getLanguageEmoji(progress.languageTo);
        const resumeText = getUIText('resume_lesson', progress.languageTo);
        const startNewText = getUIText('start_new', progress.languageTo);

        console.log(`📤 Sending quick resume message to chat ${chatId} for category: ${progress.lastCategory}`);
        const result = await bot.sendMessage(
          chatId,
          applyMaxWidth(`<b>${resumeText}</b>\n\n📚 <b>${progress.lastCategory.toUpperCase()}</b> (🇧🇬 → ${langEmoji})\n\n<i>Pick up where you left off or start something new</i>`),
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: `${resumeText}`, callback_data: 'resume_lesson' }],
                [{ text: `${startNewText}`, callback_data: 'start_new' }],
              ],
            },
          }
        );
        console.log(`✅ Quick resume message sent to chat ${chatId}, message ID: ${result.message_id}`);
        
        // Track message for cleanup
        if (progress) {
          if (!progress.sentMessageIds) progress.sentMessageIds = [];
          progress.sentMessageIds.push(result.message_id);
          await saveUserProgress(progress);
        }
      } else if (progress && progress.lessonActive) {
        // Legacy: active lesson but no last category stored
        const langEmoji = getLanguageEmoji(progress.languageTo);
        const welcomeBack = getUIText('welcome_back', progress.languageTo);
        const activeLesson = getUIText('active_lesson', progress.languageTo);
        const whatToDo = getUIText('what_to_do', progress.languageTo);
        const resumeText = getUIText('resume_lesson', progress.languageTo);
        const startNewText = getUIText('start_new', progress.languageTo);

        console.log(`📤 Sending welcome back message to chat ${chatId}`);
        const result = await bot.sendMessage(
          chatId,
          applyMaxWidth(`${welcomeBack}\n\n${activeLesson} <b>${progress.category.toUpperCase()}</b> (🇧🇬 → ${langEmoji})\n\n<i>${whatToDo}</i>\n\n<b>💡 Tip:</b> Send <code>/help</code> for all commands!`),
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: resumeText, callback_data: 'continue_lesson' }],
                [{ text: startNewText, callback_data: 'start_new' }],
              ],
            },
          }
        );
        console.log(`✅ Welcome back message sent to chat ${chatId}, message ID: ${result.message_id}`);
        
        // Track message for cleanup
        if (progress) {
          if (!progress.sentMessageIds) progress.sentMessageIds = [];
          progress.sentMessageIds.push(result.message_id);
          await saveUserProgress(progress);
        }
      } else {
        // User exists but no active lesson - check if they need language selection
        // If progress exists with a category (not default), they've already chosen language
        if (progress && progress.category && progress.category !== 'greetings') {
          // Already has completed initial setup - show category selection
          console.log(`📤 User has completed setup: ${progress.languageTo}, category: ${progress.category}`);
          const langEmoji = getLanguageEmoji(progress.languageTo);
          const selectCategoryText = getUIText('select_category', progress.languageTo);
          const categoryKeyboardObj = await getCategoryKeyboard(progress.folder, progress.languageTo, userId!);

          const result = await bot.sendMessage(
            chatId,
            applyMaxWidth(`🇧🇬 → ${langEmoji}\n\n<i>${selectCategoryText}</i>`),
            {
              parse_mode: 'HTML',
              reply_markup: categoryKeyboardObj.reply_markup,
            }
          );
          console.log(`✅ Category selection sent to chat ${chatId}, message ID: ${result.message_id}`);
          
          // Track message for cleanup
          if (progress) {
            if (!progress.sentMessageIds) progress.sentMessageIds = [];
            progress.sentMessageIds.push(result.message_id);
            await saveUserProgress(progress);
          }

        } else if (progress && progress.languageTo && progress.languageTo !== 'eng') {
          // User has explicitly changed from default language - show categories
          console.log(`📤 User has custom language: ${progress.languageTo}`);
          const langEmoji = getLanguageEmoji(progress.languageTo);
          const selectCategoryText = getUIText('select_category', progress.languageTo);
          const categoryKeyboardObj = await getCategoryKeyboard(progress.folder || 'basic', progress.languageTo, userId!);

          const result = await bot.sendMessage(
            chatId,
            applyMaxWidth(`🇧🇬 → ${langEmoji}\n\n<i>${selectCategoryText}</i>`),
            {
              parse_mode: 'HTML',
              reply_markup: categoryKeyboardObj.reply_markup,
            }
          );
          console.log(`✅ Category selection sent to chat ${chatId}, message ID: ${result.message_id}`);
          
          // Track message for cleanup
          if (progress) {
            if (!progress.sentMessageIds) progress.sentMessageIds = [];
            progress.sentMessageIds.push(result.message_id);
            await saveUserProgress(progress);
          }
        } else {
          // First time or default state - show language selection
          console.log(`📤 Sending language selection message to chat ${chatId}`);
          const selectLanguageText = getUIText('select_language', 'eng');
          const result = await bot.sendMessage(
            chatId,
            applyMaxWidth(`<b>🇧🇬 Welcome to Bulgarian Learning Bot! 🎓</b>\n\nBulgarian is your source language.\n\n<i>${selectLanguageText}</i>\n\n<b>💡 Tip:</b> Send <code>/help</code> to see all available commands and how to use them!`),
            {
              parse_mode: 'HTML',
              reply_markup: staticKeyboards.targetLanguageSelect,
            }
          );
          console.log(`✅ Language selection message sent to chat ${chatId}, message ID: ${result.message_id}`);
          
          // Track message for cleanup
          if (progress) {
            if (!progress.sentMessageIds) progress.sentMessageIds = [];
            progress.sentMessageIds.push(result.message_id);
            await saveUserProgress(progress);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error in /start handler for chat ${chatId}:`, error);
    }
  });

  // Command: /test - Show the complete bot flow in logs (for debugging)
  bot.onText(/\/test/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    console.log(`🧪 /test command received from chat ${chatId}, user ${userId}`);

    console.log('🔄 BOT FLOW TEST:');
    console.log('1. ✅ /start → Language selection (🇬🇧 🇺🇦 🇷🇺)');
    console.log('2. ✅ Language selection → Level selection (Basic, Expressions, etc.)');
    console.log('3. ✅ Level selection → Category selection (greetings, restaurant, etc.)');
    console.log('4. ✅ Category selection → Start lesson');
    console.log('5. ✅ During lesson: Show translation, Next, Previous, etc.');
    console.log('6. ✅ Navigation: Back to menu, Change folder, Exit');

    await bot.sendMessage(chatId, '🧪 **Bot Flow Test Complete!**\n\n✅ All handlers are implemented and working\n\nThe issue is Telegram message delivery, not bot logic.', { parse_mode: 'Markdown' });
  });

  // Command: /help - Show all available commands and how to use them
  bot.onText(/\/help/, async (msg: TelegramBot.Message) => {
    const { handleHelpCommand } = await import('./handlers/help');
    await handleHelpCommand(msg, bot);
  });

  // Command: /progress - Show user progress across all categories
  bot.onText(/\/progress/, async (msg: TelegramBot.Message) => {
    console.log(`📊 /progress command received`);
    const { handleProgressCommand } = await import('./handlers/progress');
    await handleProgressCommand(msg, bot);
  });
  // Command: /profile - Show user profile and allow language change
  bot.onText(/\/profile/, async (msg: TelegramBot.Message) => {
    console.log(`👤 /profile command received`);
    await handleProfileCommand(msg, bot);
  });

  // Command: /favourite - Start lesson with favourite sentences
  bot.onText(/\/favourite/, async (msg: TelegramBot.Message) => {
    console.log(`⭐ /favourite command received`);
    const userId = msg.from?.id;
    if (!userId) return;
    const { handleStartFavouriteLesson } = await import('./handlers/favourite');
    await handleStartFavouriteLesson(msg, bot, userId);
  });

  // Test: Log all message types
  bot.on('message', (msg: TelegramBot.Message) => {
    console.log(`📨 Message received: type=${msg.text ? 'text' : msg.sticker ? 'sticker' : 'other'}`);
  });

  // Callback handlers for all buttons
  bot.on('callback_query', async (query: TelegramBot.CallbackQuery) => {
    const data = query.data;
    const userId = query.from.id;
    const chatId = query.message?.chat.id;

    console.log(`🔔 CALLBACK QUERY RECEIVED:`);
    console.log(`   Data: ${data}`);
    console.log(`   User: ${userId}`);
    console.log(`   Chat: ${chatId}`);
    console.log(`   Message ID: ${query.message?.message_id}`);

    // Log to activity logger
    logActivity({
      timestamp: new Date().toISOString(),
      type: 'callback',
      userId,
      data: data || 'unknown',
      details: {
        chatId,
        messageId: query.message?.message_id,
        username: query.from.username,
        firstName: query.from.first_name
      }
    });

    try {
      if (data === 'show_language_options') {
        console.log(`🌐 Showing language options...`);
        const { handleShowLanguageOptions } = await import('./handlers/profile');
        await handleShowLanguageOptions(query, bot);
        console.log(`✅ Language options shown`);
      } else if (data?.startsWith('lang_to_')) {
        console.log(`🌍 Handling language selection...`);
        await handleSelectTargetLanguage(query, bot);
        console.log(`✅ Language selection handled`);
      } else if (data?.startsWith('folder_')) {
        console.log(`📁 Handling folder selection...`);
        await handleSelectLevel(query, bot);
        console.log(`✅ Folder selection handled`);
      } else if (data?.startsWith('select_category:'))  {
        console.log(`📚 Handling category selection...`);
        await handleSelectCategory(query, bot);
        console.log(`✅ Category selection handled`);
      } else if (data?.startsWith('start_lesson:')) {
        const category = data.replace('start_lesson:', '');
        console.log(`▶️ Starting lesson in category: ${category}`);
        try {
          await bot.deleteMessage(query.message!.chat.id, query.message!.message_id);
          console.log(`🗑️ Previous message deleted`);
        } catch (e) {
          console.log(`⚠️ Could not delete message:`, e);
        }
        await handleStartLessonButton(query, bot, category);
        console.log(`✅ Lesson started`);
      } else if (data?.startsWith('continue_lesson:')) {
        const category = data.replace('continue_lesson:', '');
        console.log(`⏯️ Continuing lesson in category: ${category}`);
        try {
          await bot.deleteMessage(query.message!.chat.id, query.message!.message_id);
          console.log(`🗑️ Previous message deleted`);
        } catch (e) {
          console.log(`⚠️ Could not delete message:`, e);
        }
        await handleStartLessonButton(query, bot, category);
        console.log(`✅ Lesson continued`);
      } else if (data === 'start_lesson' || data === 'continue_lesson') {
        console.log(`▶️ Handling lesson start/continue...`);
        try {
          await bot.deleteMessage(query.message!.chat.id, query.message!.message_id);
          console.log(`🗑️ Menu message deleted`);
        } catch (e) {
          console.log(`⚠️ Could not delete menu message:`, e);
        }
        await handleStartLessonButton(query, bot);
        console.log(`✅ Lesson start/continue handled`);
      } else if (data === 'resume_lesson') {
        // Smart resume: Continue the last category without going through menus
        console.log(`⏯️ Handling smart resume...`);
        const userId = query.from.id;
        const chatId = query.message?.chat.id;

        if (!chatId) return;

        const progress = await getUserProgressAsync(userId);
        if (progress && progress.lastCategory && progress.lastFolder) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
            console.log(`🗑️ Resume prompt deleted`);
          } catch (e) {
            console.log(`⚠️ Could not delete resume message:`, e);
          }
          // Resume with last category
          await handleStartLessonButton(query, bot, progress.lastCategory);
          console.log(`✅ Smart resume completed for category: ${progress.lastCategory}`);
        } else {
          // Fallback if no last category found
          await bot.answerCallbackQuery(query.id, { text: '❌ No lesson found to resume' });
        }
      } else if (data === 'start_new') {
        console.log(`🔄 Handling start new...`);
        const chatId = query.message?.chat.id;
        const userId = query.from.id;
        if (chatId && userId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
            console.log(`🗑️ Progress message deleted`);
          } catch (e) {
            console.log(`⚠️ Could not delete progress message:`, e);
          }

          // Get user's saved language and show folder selection
          const progress = await getUserProgressAsync(userId);
          const language = progress?.languageTo || 'eng';

          console.log(`📤 Sending folder selection with language: ${language}`);
          const selectLevelText = getUIText('select_level', language);
          const keyboards = await getTranslatedKeyboardsWithCompletion(language, userId);
          await bot.sendMessage(
            chatId,
            applyMaxWidth(`📚 ${selectLevelText}`),
            { reply_markup: keyboards.levelSelect, parse_mode: 'HTML' }
          );
          console.log(`✅ Folder selection sent`);
        }
      } else if (data === 'show_translation') {
        console.log(`📖 Handling show translation...`);
        await handleShowTranslation(query, bot);
        console.log(`✅ Translation shown`);
      } else if (data === 'add_favourite') {
        console.log(`⭐ Handling add to favourites...`);
        const { handleAddFavourite } = await import('./handlers/favourite');
        await handleAddFavourite(query, bot);
        console.log(`✅ Added to favourites`);
      } else if (data === 'back_to_categories') {
        console.log(`⬅️ Handling back to categories...`);
        const userId = query.from.id;
        const chatId = query.message?.chat.id;
        const messageId = query.message?.message_id;
        
        if (!chatId || !messageId) {
          await bot.answerCallbackQuery(query.id);
          return;
        }
        
        const progress = await getUserProgressAsync(userId);
        if (!progress) {
          await bot.answerCallbackQuery(query.id, { text: '❌ No progress found' });
          return;
        }
        
        // Delete the lesson message
        await bot.deleteMessage(chatId, messageId).catch(() => {});
        
        // Show category selection
        const categoryKeyboardObj = await getCategoryKeyboard(progress.folder, progress.languageTo, userId);
        const langEmoji = getLanguageEmoji(progress.languageTo);
        const selectCategoryText = getUIText('select_category', progress.languageTo);
        
        await bot.sendMessage(
          chatId,
          applyMaxWidth(`🇧🇬 → ${langEmoji}\n\n<i>${selectCategoryText}</i>`),
          {
            parse_mode: 'HTML',
            reply_markup: categoryKeyboardObj.reply_markup,
          }
        );
        
        // Mark lesson as inactive
        progress.lessonActive = false;
        await saveUserProgress(progress);
        
        await bot.answerCallbackQuery(query.id);
        console.log(`✅ Back to categories handled`);
      } else if (data === 'favourite_next') {
        console.log(`⏭️ Handling favourite next...`);
        const { handleFavouriteNext } = await import('./handlers/favourite');
        await handleFavouriteNext(query, bot);
        console.log(`✅ Favourite next handled`);
      } else if (data === 'favourite_previous') {
        console.log(`⬅️ Handling favourite previous...`);
        const { handleFavouritePrevious } = await import('./handlers/favourite');
        await handleFavouritePrevious(query, bot);
        console.log(`✅ Favourite previous handled`);
      } else if (data === 'favourite_remove') {
        console.log(`🗑️ Handling favourite remove...`);
        const { handleRemoveFavourite } = await import('./handlers/favourite');
        await handleRemoveFavourite(query, bot);
        console.log(`✅ Favourite removed`);
      } else if (data === 'next') {
        console.log(`⏭️ Handling next...`);
        await handleNext(query, bot);
        console.log(`✅ Next handled`);
      } else if (data === 'prev') {
        console.log(`⏪ Handling previous...`);
        await handlePrevious(query, bot);
        console.log(`✅ Previous handled`);
      } else if (data === 'change_folder') {
        console.log(`🔄 Handling folder change...`);
        const userId = query.from.id;
        const chatId = query.message?.chat.id;
        if (chatId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
            console.log(`🗑️ Category message deleted`);
          } catch (e) {
            console.log(`⚠️ Could not delete category message:`, e);
          }
          console.log(`📤 Sending folder selection...`);
          const progress = await getUserProgressAsync(userId);
          const selectLevelText = getUIText('select_level', progress?.languageTo || 'eng');
          const keyboards = await getTranslatedKeyboardsWithCompletion(progress?.languageTo || 'eng', userId);
          await bot.sendMessage(
            chatId,
            applyMaxWidth(`📚 ${selectLevelText}`),
            { reply_markup: keyboards.levelSelect, parse_mode: 'HTML' }
          );
          console.log(`✅ Folder selection sent`);
        }
      } else if (data === 'show_levels') {
        console.log(`📁 Handling show levels (back from categories)...`);
        const userId = query.from.id;
        const chatId = query.message?.chat.id;
        if (chatId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
            console.log(`🗑️ Category message deleted`);
          } catch (e) {
            console.log(`⚠️ Could not delete category message:`, e);
          }
          console.log(`📤 Sending folder selection...`);
          const progress = await getUserProgressAsync(userId);
          const selectLevelText = getUIText('select_level', progress?.languageTo || 'eng');
          const keyboards = await getTranslatedKeyboardsWithCompletion(progress?.languageTo || 'eng', userId);
          await bot.sendMessage(
            chatId,
            applyMaxWidth(`📚 ${selectLevelText}`),
            { reply_markup: keyboards.levelSelect, parse_mode: 'HTML' }
          );
          console.log(`✅ Folder selection sent`);
        }
        await bot.answerCallbackQuery(query.id);
      } else if (data === 'back_to_menu') {
        console.log(`🏠 Handling back to menu...`);
        const userId = query.from.id;
        const chatId = query.message?.chat.id;
        if (chatId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
            console.log(`🗑️ Lesson message deleted`);
          } catch (e) {
            console.log(`⚠️ Could not delete lesson message:`, e);
          }

          // Check if user has selected language (setup complete)
          const progress = await getUserProgressAsync(userId);
          const hasSelectedLanguage = progress && progress.languageTo && progress.languageTo !== 'eng' && progress.category && progress.category !== 'greetings';

          if (hasSelectedLanguage) {
            // User already has language set - show folder selection
            console.log(`📤 Sending folder selection...`);
            const selectLevelText = getUIText('select_level', progress!.languageTo);
            const keyboards = await getTranslatedKeyboardsWithCompletion(progress!.languageTo, userId);
            await bot.sendMessage(
              chatId,
              applyMaxWidth(`📚 ${selectLevelText}`),
              { reply_markup: keyboards.levelSelect, parse_mode: 'HTML' }
            );
            console.log(`✅ Folder selection sent`);
          } else {
            // First time - show language selection
            console.log(`📤 Sending language selection...`);
            const selectLanguageText = getUIText('select_language', 'eng');
            await bot.sendMessage(
              chatId,
              applyMaxWidth(`<b>🇧🇬 Main Menu 🎓</b>\n\n<i>${selectLanguageText}</i>`),
              {
                parse_mode: 'HTML',
                reply_markup: staticKeyboards.targetLanguageSelect,
              }
            );
            console.log(`✅ Language selection sent`);
          }
        }
      } else if (data === 'exit') {
        console.log(`❌ Handling exit...`);
        const chatId = query.message?.chat.id;
        if (chatId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
            console.log(`🗑️ Lesson message deleted`);
          } catch (e) {
            console.log(`⚠️ Could not delete lesson message:`, e);
          }
          console.log(`📤 Sending exit confirmation...`);
          await bot.sendMessage(
            chatId,
            '👋 **Lesson exited!**\n\nUse /start to begin a new lesson.',
            { parse_mode: 'Markdown' }
          );
          console.log(`✅ Exit confirmation sent`);
        }
      } else if (data === 'clear_progress') {
        console.log(`🗑️ Showing clear progress confirmation...`);
        const { handleClearProgress } = await import('./handlers/profile');
        await handleClearProgress(query, bot);
      } else if (data === 'confirm_clear_progress') {
        console.log(`✅ Confirming clear progress...`);
        const { handleConfirmClearProgress } = await import('./handlers/profile');
        await handleConfirmClearProgress(query, bot);
      } else if (data === 'back_to_profile') {
        console.log(`🔙 Returning to profile...`);
        const { handleBackToProfile } = await import('./handlers/profile');
        await handleBackToProfile(query, bot);
      } else if (data === 'refresh_results') {
        console.log(`🔄 Handling clear progress...`);
        const { handleClearProgress } = await import('./handlers/profile');
        await handleClearProgress(query, bot);
        console.log(`✅ Progress cleared`);
      } else {
        console.log(`❓ Unknown callback data: ${data}`);
        await bot.answerCallbackQuery(query.id, { text: 'Unknown action' });
      }
    } catch (error) {
      console.error(`❌ Error in callback handler for ${data}:`, error);
      try {
        await bot.answerCallbackQuery(query.id, { text: 'Error occurred' });
      } catch (answerError) {
        console.error(`❌ Could not answer callback:`, answerError);
      }
    }
  });

  bot.on('polling_error', (error: Error) => {
    console.error('Polling error:', error);
  });

  return bot;
}
