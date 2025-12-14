import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { getUserProgress, clearAllProgressExceptLast } from '../data/progress';
import { getLanguageEmoji } from '../utils/translation';
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
import { lessonKeyboards } from './keyboards';

export function createBot(): TelegramBot {
  const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });

  // Command: /start - Show language selection or resume lesson
  bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    console.log(`📥 /start command received from chat ${chatId}`);

    if (!userId) return;

    const progress = getUserProgress(userId);

    // Check if user has an active lesson
    if (progress && progress.lessonActive) {
      const langEmoji = getLanguageEmoji(progress.languageTo);
      await bot.sendMessage(
        chatId,
        `🇧🇬 Welcome back! 👋\n\nYou have an active lesson in **${progress.category.toUpperCase()}** (🇧🇬 → ${langEmoji})\n\n_What would you like to do?_`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📖 Resume lesson', callback_data: 'continue_lesson' }],
              [{ text: '🚀 Start new lesson', callback_data: 'start_new' }],
            ],
          },
        }
      );
    } else {
      // First time or no active lesson - show language selection
      await bot.sendMessage(
        chatId,
        '🇧🇬 **Welcome to Bulgarian Learning Bot!** 🎓\n\nBulgarian is your source language.\n\n_Select your target language:_',
        {
          parse_mode: 'Markdown',
          reply_markup: lessonKeyboards.targetLanguageSelect,
        }
      );
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

  // Test: Log all message types
  bot.on('message', (msg: TelegramBot.Message) => {
    console.log(`📨 Message received: type=${msg.text ? 'text' : msg.sticker ? 'sticker' : 'other'}`);
  });

  // Callback handlers for all buttons
  bot.on('callback_query', async (query: TelegramBot.CallbackQuery) => {
    const data = query.data;
    console.log(`🔔 Callback received: ${data}`);

    try {
      if (data?.startsWith('lang_to_')) {
        // Handle target language selection
        await handleSelectTargetLanguage(query, bot);
      } else if (data?.startsWith('folder_')) {
        // Handle folder selection (6 independent learning levels)
        await handleSelectLevel(query, bot);
      } else if (data?.startsWith('select_category:')) {
        // Handle category selection
        await handleSelectCategory(query, bot);
      } else if (data?.startsWith('start_lesson:')) {
        // Handle lesson start with category
        const category = data.replace('start_lesson:', '');
        console.log(`Starting lesson in category: ${category}`);
        try {
          await bot.deleteMessage(query.message!.chat.id, query.message!.message_id);
        } catch (e) {
          // Ignore if message already deleted
        }
        await handleStartLessonButton(query, bot, category);
      } else if (data === 'start_lesson' || data === 'continue_lesson') {
        console.log('Starting/continuing lesson...');
        // Delete the menu message first if it exists
        try {
          await bot.deleteMessage(query.message!.chat.id, query.message!.message_id);
        } catch (e) {
          // Ignore if message already deleted
        }
        // Start lesson using the callback query
        await handleStartLessonButton(query, bot);
      } else if (data === 'start_new') {
        // Reset progress and start new - show language selection
        const chatId = query.message?.chat.id;
        const userId = query.from.id;
        if (chatId && userId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
          } catch (e) {
            // Ignore
          }
          await bot.sendMessage(
            chatId,
            '🇧🇬 **Let\'s start fresh!** 🎓\n\nSelect your target language:',
            {
              parse_mode: 'Markdown',
              reply_markup: lessonKeyboards.targetLanguageSelect,
            }
          );
        }
      } else if (data === 'show_translation') {
        await handleShowTranslation(query, bot);
      } else if (data === 'next') {
        await handleNext(query, bot);
      } else if (data === 'prev') {
        await handlePrevious(query, bot);
      } else if (data === 'change_folder') {
        // Return to folder selection
        const userId = query.from.id;
        const chatId = query.message?.chat.id;
        if (chatId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
          } catch (e) {
            // Ignore
          }
          await bot.sendMessage(
            chatId,
            '📚 Select a learning level:',
            { reply_markup: lessonKeyboards.levelSelect }
          );
        }
      } else if (data === 'back_to_menu') {
        // Return to language selection
        const userId = query.from.id;
        const chatId = query.message?.chat.id;
        if (chatId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
          } catch (e) {
            // Ignore
          }
          await bot.sendMessage(
            chatId,
            '🌐 Select target language:',
            { reply_markup: lessonKeyboards.targetLanguageSelect }
          );
        }
      } else if (data === 'exit') {
        // Exit lesson and return to menu
        const userId = query.from.id;
        const chatId = query.message?.chat.id;
        if (chatId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
          } catch (e) {
            // Ignore
          }
          // Get current user folder for category selection
          const progress = getUserProgress(userId);
          const userFolder = progress?.folder || 'basic';
          await bot.sendMessage(
            chatId,
            '👋 Lesson ended. Great job! 🌟 What next?',
            getCategoryKeyboard(userFolder)
          );
        }
      }
    } catch (error) {
      console.error('Callback handler error:', error);
      try {
        await bot.answerCallbackQuery(query.id, {
          text: '❌ An error occurred',
          show_alert: true,
        });
      } catch (e) {
        // Ignore if callback already answered
      }
    }
  });

  bot.on('polling_error', (error: Error) => {
    console.error('Polling error:', error);
  });

  return bot;
}
