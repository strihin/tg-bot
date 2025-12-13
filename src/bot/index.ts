import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import {
  handleStartLessonButton,
  handleLessonStart,
  handleShowTranslation,
  handleNext,
  handlePrevious,
} from './handlers/lesson';
import { getCategoryKeyboard, handleSelectCategory } from './handlers/category';
import { handleSelectTargetLanguage } from './handlers/language';
import { lessonKeyboards } from './keyboards';

export function createBot(): TelegramBot {
  const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });

  // Command: /start - Show language selection (source → target)
  bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    console.log(`📥 /start command received from chat ${chatId}`);
    await bot.sendMessage(
      chatId,
      '🇧🇬 Welcome to Bulgarian Learning Bot!\n\nBulgarian is your source language. Select target language:',
      {
        reply_markup: lessonKeyboards.targetLanguageSelect,
      }
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
        console.log('Starting lesson...');
        // Delete the menu message first
        try {
          await bot.deleteMessage(query.message!.chat.id, query.message!.message_id);
        } catch (e) {
          // Ignore if message already deleted
        }
        // Start lesson using the callback query
        await handleStartLessonButton(query, bot);
      } else if (data === 'show_translation') {
        await handleShowTranslation(query, bot);
      } else if (data === 'next') {
        await handleNext(query, bot);
      } else if (data === 'prev') {
        await handlePrevious(query, bot);
      } else if (data === 'exit') {
        // Exit lesson and return to menu
        const chatId = query.message?.chat.id;
        if (chatId) {
          try {
            await bot.deleteMessage(chatId, query.message!.message_id);
          } catch (e) {
            // Ignore
          }
          await bot.sendMessage(
            chatId,
            '👋 Lesson ended. Great job! 🌟 What next?',
            getCategoryKeyboard()
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
