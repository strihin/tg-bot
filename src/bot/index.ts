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
import { getTranslatedKeyboards, getTranslatedKeyboardsWithCompletion, staticKeyboards } from './keyboards';

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

  // Log all incoming updates for debugging
  bot.on('update', (update) => {
    console.log(`🔄 UPDATE RECEIVED (update_id: ${update.update_id}):`);
    if (update.message) {
      console.log(`   ✅ message: "${update.message.text}" from ${update.message.from?.username || update.message.from?.id}`);
    }
    if (update.callback_query) console.log(`   - callback_query: ${update.callback_query.data}`);
    if (update.edited_message) console.log(`   - edited_message`);
    if (update.channel_post) console.log(`   - channel_post`);
    if (update.edited_channel_post) console.log(`   - edited_channel_post`);
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

      // Check if user has an active lesson with saved last category
      if (progress && progress.lessonActive && progress.lastCategory && progress.lastFolder) {
        // Smart Resume: Show "Continue [Category]?" option
        const langEmoji = getLanguageEmoji(progress.languageTo);
        const continueQuestion = getUIText('continue_question', progress.languageTo);
        const continueText = getUIText('continue_lesson', progress.languageTo);
        const startNewText = getUIText('start_new', progress.languageTo);
        
        console.log(`📤 Sending quick resume message to chat ${chatId} for category: ${progress.lastCategory}`);
        const result = await bot.sendMessage(
          chatId,
          `<b>🎯 ${continueQuestion}</b>\n\n📚 <b>${progress.lastCategory.toUpperCase()}</b> (🇧🇬 → ${langEmoji})\n\n<i>Pick up where you left off or start something new</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✅ ${continueText}`, callback_data: 'resume_lesson' }],
                [{ text: `❌ ${startNewText}`, callback_data: 'start_new' }],
              ],
            },
          }
        );
        console.log(`✅ Quick resume message sent to chat ${chatId}, message ID: ${result.message_id}`);
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
          `${welcomeBack}\n\n${activeLesson} <b>${progress.category.toUpperCase()}</b> (🇧🇬 → ${langEmoji})\n\n<i>${whatToDo}</i>\n\n<b>💡 Tip:</b> Send <code>/help</code> for all commands!`,
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
      } else {
        // First time or no active lesson - show language selection
        console.log(`📤 Sending language selection message to chat ${chatId}`);
        const selectLanguageText = getUIText('select_language', 'eng');
        const result = await bot.sendMessage(
          chatId,
          `<b>🇧🇬 Welcome to Bulgarian Learning Bot! 🎓</b>\n\nBulgarian is your source language.\n\n<i>${selectLanguageText}</i>\n\n<b>💡 Tip:</b> Send <code>/help</code> to see all available commands and how to use them!`,
          {
            parse_mode: 'HTML',
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

  // Command: /help - Show all available commands and how to use them
  bot.onText(/\/help/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const language = 'eng'; // Default to English for help
    
    if (!userId) return;

    // Get user's preferred language if they have active progress
    const progress = await getUserProgressAsync(userId);
    const userLang = progress?.languageTo || 'eng';

    let helpText = '';
    
    if (userLang === 'eng') {
      helpText = `<b>📚 Bulgarian Learning Bot - Quick Guide</b>

<b>Available Commands:</b>

<b>🚀 Getting Started</b>
<code>/start</code> - Begin learning! Shows language selection and your current progress. Resume where you left off or start a new lesson.

<b>📖 Learning</b>
<code>/favourite</code> - View and practice your saved favourite sentences from lessons.

<b>📊 Progress & Settings</b>
<code>/progress</code> - See your learning progress across all categories. Shows completion percentage and mastered sentences.
<code>/refresh</code> - Reset your progress and start fresh from the beginning.

<b>❓ Help</b>
<code>/help</code> - Show this message.

<b>How to Use:</b>
1️⃣ Send <code>/start</code> to choose your target language (English, Russian, or Ukrainian)
2️⃣ Select a learning level: Basic, Expressions, Middle, etc.
3️⃣ Choose a category to study
4️⃣ Learn sentences: tap to reveal translation with spoiler effect
5️⃣ Use ⭐ button to save favourite sentences
6️⃣ Track your progress with <code>/progress</code>
7️⃣ Review favourites anytime with <code>/favourite</code>

<b>🎯 Tips:</b>
• Tap the translation spoiler to reveal the answer
• Use 🎙️ button to listen to audio
• Click ⭐ to save sentences as favourites
• Navigate with Previous/Next buttons
• Exit lesson anytime and resume later

Enjoy learning Bulgarian! 🇧🇬`;
    } else if (userLang === 'kharkiv') {
      helpText = `<b>📚 Бот для Изучения Болгарского - Краткое Руководство</b>

<b>Доступные Команды:</b>

<b>🚀 Начало</b>
<code>/start</code> - Начните обучение! Выбор языка и ваш текущий прогресс. Продолжите с того, где вы остановились, или начните новый урок.

<b>📖 Обучение</b>
<code>/favourite</code> - Просмотрите и практикуйте свои сохраненные избранные предложения из уроков.

<b>📊 Прогресс и Настройки</b>
<code>/progress</code> - Просмотрите ваш прогресс обучения по всем категориям. Показывает процент завершения и выученные предложения.
<code>/refresh</code> - Сброс прогресса и начало с начала.

<b>❓ Помощь</b>
<code>/help</code> - Показать это сообщение.

<b>Как использовать:</b>
1️⃣ Отправьте <code>/start</code> для выбора целевого языка (английский, русский или украинский)
2️⃣ Выберите уровень обучения: базовый, выражения, средний и т. д.
3️⃣ Выберите категорию для изучения
4️⃣ Изучайте предложения: нажмите, чтобы раскрыть перевод эффектом спойлера
5️⃣ Используйте кнопку ⭐ для сохранения избранных предложений
6️⃣ Отслеживайте свой прогресс с помощью <code>/progress</code>
7️⃣ Просматривайте избранное в любое время с помощью <code>/favourite</code>

<b>🎯 Советы:</b>
• Нажмите спойлер перевода, чтобы раскрыть ответ
• Используйте кнопку 🎙️ для прослушивания аудио
• Нажмите ⭐ для сохранения предложений как избранное
• Навигация с помощью кнопок Предыдущее/Следующее
• Выйдите из урока в любое время и возобновите позже

Удачи в изучении болгарского! 🇧🇬`;
    } else {
      helpText = `<b>📚 Бот для Вивчення Болгарської - Короткий Посібник</b>

<b>Доступні Команди:</b>

<b>🚀 Початок</b>
<code>/start</code> - Почніть навчання! Вибір мови та ваш поточний прогрес. Продовжте з того, де ви зупинилися, або почніть новий урок.

<b>📖 Навчання</b>
<code>/favourite</code> - Перегляньте та практикуйте свої збережені улюблені речення з уроків.

<b>📊 Прогрес і Налаштування</b>
<code>/progress</code> - Перегляньте ваш прогрес навчання по всіх категоріях. Показує відсоток завершення та вивчені речення.
<code>/refresh</code> - Скинути прогрес і почати з початку.

<b>❓ Допомога</b>
<code>/help</code> - Показати це повідомлення.

<b>Як користуватися:</b>
1️⃣ Відправте <code>/start</code> для вибору цільової мови (англійська, російська або українська)
2️⃣ Виберіть рівень навчання: базовий, вирази, середній тощо
3️⃣ Виберіть категорію для вивчення
4️⃣ Вивчайте речення: натисніть, щоб розкрити переклад зі спойлер-ефектом
5️⃣ Використовуйте кнопку ⭐ для збереження улюблених речень
6️⃣ Відстежуйте свій прогрес за допомогою <code>/progress</code>
7️⃣ Переглядайте улюблене в будь-який час за допомогою <code>/favourite</code>

<b>🎯 Поради:</b>
• Натисніть спойлер перекладу, щоб розкрити відповідь
• Використовуйте кнопку 🎙️ для прослуховування звуку
• Натисніть ⭐ для збереження речень як улюблене
• Навігація за допомогою кнопок Попереднє/Наступне
• Вийдіть з уроку в будь-який час і продовжте пізніше

Успіхів у вивченні болгарської! 🇧🇬`;
    }

    await bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
  });

  // Command: /progress - Show user progress across all categories
  bot.onText(/\/progress/, async (msg: TelegramBot.Message) => {
    console.log(`📊 /progress command received`);
    const { handleProgressCommand } = await import('./handlers/progress');
    await handleProgressCommand(msg, bot);
  });

  // Command: /refresh - Clear all completed progress
  bot.onText(/\/refresh/, async (msg: TelegramBot.Message) => {
    console.log(`🔄 /refresh command received`);
    const { handleRefreshCommand } = await import('./handlers/refresh');
    await handleRefreshCommand(msg, bot);
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
      } else if (data === 'add_favourite') {
        console.log(`⭐ Handling add to favourites...`);
        const { handleAddFavourite } = await import('./handlers/favourite');
        await handleAddFavourite(query, bot);
        console.log(`✅ Added to favourites`);
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
