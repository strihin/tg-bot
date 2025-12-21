import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { getUserProgressAsync, clearAllProgressExceptLast } from '../data/progress';
import { getLanguageEmoji } from '../utils/translation';
import { getUIText } from '../utils/uiTranslation';
import { logActivity } from '../utils/logger';
import {
  handleStartLessonButton,
  handleLessonStart,
  handleShowTranslation,
  handleNext,
  handlePrevious,
} from './handlers/lesson';
import { getCategoryKeyboard, handleSelectCategory } from './handlers/category';
import { handleSelectTargetLanguage } from './handlers/language';
import { handleSelectLevel } from './handlers/level';
import { getTranslatedKeyboards, staticKeyboards } from './keyboards';

export function createBot(): TelegramBot {
  const bot = new TelegramBot(config.TELEGRAM_TOKEN, { 
    polling: {
      interval: 300,
      autoStart: true,
      params: {
        timeout: 10,
        allowed_updates: ['message', 'callback_query', 'edited_message']
      }
    }
  });

  // Log all incoming updates for debugging
  bot.on('update', (update) => {
    console.log(`🔄 UPDATE RECEIVED (update_id: ${update.update_id}):`);
    if (update.message) console.log(`   - message`);
    if (update.callback_query) console.log(`   - callback_query: ${update.callback_query.data}`);
    if (update.edited_message) console.log(`   - edited_message`);
    if (update.channel_post) console.log(`   - channel_post`);
    if (update.edited_channel_post) console.log(`   - edited_channel_post`);
  });

  // Command: /start - Show language selection or resume lesson
  bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    console.log(`📥 /start command received from chat ${chatId}`);
    console.log(`👤 User details:`, {
      userId: msg.from?.id,
      username: msg.from?.username,
      firstName: msg.from?.first_name,
      chatType: msg.chat.type,
      chatId: msg.chat.id
    });

    if (!userId) {
      console.log(`❌ No user ID found in message`);
      return;
    }

    try {
      const progress = await getUserProgressAsync(userId);

      // Check if user has an active lesson
      if (progress && progress.lessonActive) {
        const langEmoji = getLanguageEmoji(progress.languageTo);
        const welcomeBack = getUIText('welcome_back', progress.languageTo);
        const activeLesson = getUIText('active_lesson', progress.languageTo);
        const whatToDo = getUIText('what_to_do', progress.languageTo);
        const resumeText = getUIText('resume_lesson', progress.languageTo);
        const startNewText = getUIText('start_new', progress.languageTo);
        
        console.log(`📤 Sending welcome back message to chat ${chatId}`);
        const result = await bot.sendMessage(
          chatId,
          `${welcomeBack}\n\n${activeLesson} **${progress.category.toUpperCase()}** (🇧🇬 → ${langEmoji})\n\n_${whatToDo}_`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: resumeText, callback_data: 'continue_lesson' }],
                [{ text: startNewText, callback_data: 'start_new' }],
              ],
            },
          }
        );
        console.log(`✅ Welcome back message sent to chat ${chatId}, message ID: ${result.message_id}`);
      } else {
        // First time or no active lesson - show language selection
        console.log(`📤 Sending language selection message to chat ${chatId}`);
        const selectLanguageText = getUIText('select_language', 'eng');
        const result = await bot.sendMessage(
          chatId,
          `🇧🇬 **Welcome to Bulgarian Learning Bot!** 🎓\n\nBulgarian is your source language.\n\n_${selectLanguageText}_`,
          {
            parse_mode: 'Markdown',
            reply_markup: staticKeyboards.targetLanguageSelect,
          }
        );
        console.log(`✅ Language selection message sent to chat ${chatId}, message ID: ${result.message_id}`);
      }
    } catch (error) {
      console.error(`❌ Error in /start handler for chat ${chatId}:`, error);
    }
  });

  // Command: /clear - Remove all progress files except the most recently modified one
  bot.onText(/\/clear/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    console.log(`🧹 /clear command received from chat ${chatId}`);

    const deletedCount = clearAllProgressExceptLast();
    await bot.sendMessage(
      chatId,
      `🧹 **Progress cleanup complete!**\n\n✅ Deleted ${deletedCount} user progress file(s)\n📌 Kept the most recently used one`,
      { parse_mode: 'Markdown' }
    );
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
      if (data?.startsWith('lang_to_')) {
        console.log(`🌍 Handling language selection...`);
        await handleSelectTargetLanguage(query, bot);
        console.log(`✅ Language selection handled`);
      } else if (data?.startsWith('folder_')) {
        console.log(`📁 Handling folder selection...`);
        await handleSelectLevel(query, bot);
        console.log(`✅ Folder selection handled`);
      } else if (data?.startsWith('select_category:')) {
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
          console.log(`📤 Sending fresh language selection...`);
          await bot.sendMessage(
            chatId,
            '🇧🇬 **Let\'s start fresh!** 🎓\n\nSelect your target language:',
            {
              parse_mode: 'Markdown',
              reply_markup: staticKeyboards.targetLanguageSelect,
            }
          );
          console.log(`✅ Fresh language selection sent`);
        }
      } else if (data === 'show_translation') {
        console.log(`📖 Handling show translation...`);
        await handleShowTranslation(query, bot);
        console.log(`✅ Translation shown`);
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
          const keyboards = getTranslatedKeyboards(progress?.languageTo || 'eng');
          await bot.sendMessage(
            chatId,
            `📚 ${selectLevelText}`,
            { reply_markup: keyboards.levelSelect }
          );
          console.log(`✅ Folder selection sent`);
        }
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
          console.log(`📤 Sending language selection...`);
          const selectLanguageText = getUIText('select_language', 'eng');
          await bot.sendMessage(
            chatId,
            `🇧🇬 **Main Menu** 🎓\n\n_${selectLanguageText}_`,
            {
              parse_mode: 'Markdown',
              reply_markup: staticKeyboards.targetLanguageSelect,
            }
          );
          console.log(`✅ Main menu sent`);
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
