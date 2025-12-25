import TelegramBot from 'node-telegram-bot-api';
import { getUserProgressAsync, saveUserProgress, initializeUserProgress } from '../../data/progress';
import { LEVELS } from '../../constants';
import { FolderType } from '../../types';
import { getUIText } from '../../utils/uiTranslation';
import { getCategoryKeyboard } from './category';
import { isFolderCompleted } from '../../data/completion';

/**
 * Handle folder selection (6 independent learning levels)
 */
export async function handleSelectLevel(
  callbackQuery: TelegramBot.CallbackQuery,
  bot: TelegramBot
): Promise<void> {
  try {
    // Answer callback immediately to prevent duplicate delivery
    await bot.answerCallbackQuery(callbackQuery.id);

    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;

    console.log(`📁 handleSelectLevel - userId: ${userId}, chatId: ${chatId}`);

    if (!chatId) {
      console.error(`❌ No chatId in callback`);
      return;
    }

    const data = callbackQuery.data || '';
    const folder = data.replace('folder_', '') as FolderType;
    console.log(`📁 Selected folder: ${folder}`);

    // Update or create user progress with selected folder
    let progress = await getUserProgressAsync(userId);
    if (progress) {
      console.log(`📝 User has existing progress, updating folder`);
      progress.folder = folder;
    } else {
      // Initialize progress if new user selects folder - use Ukrainian by default
      console.log(`🆕 Initializing new user with folder: ${folder}`);
      progress = await initializeUserProgress(userId, 'greetings', 'ua', folder);
    }
    await saveUserProgress(progress);
    console.log(`✅ Progress saved for user ${userId}`);

    const folderInfo = LEVELS[folder];
    console.log(`📚 Folder info: ${folderInfo.name}`);

    // Show category selection after folder choice
    console.log(`📤 Loading categories for folder: ${folder}`);
    const keyboard = await getCategoryKeyboard(folder, progress.languageTo, userId);
    console.log(`✅ Categories loaded, sending message`);
    
    // Check if folder is completed
    const folderCompleted = await isFolderCompleted(userId, folder);
    const completionIcon = folderCompleted ? ' ✅' : '';
    
    const selectCategoryText = getUIText('select_category', progress.languageTo);
    const messageText = `<b>${folderInfo.name}${completionIcon} mode selected</b>\n\n<i>${folderInfo.description}</i>\n\n${selectCategoryText}`;
    
    // Always try to edit the current message first, fall back to send new
    const messageId = callbackQuery.message?.message_id;
    if (messageId) {
      try {
        await bot.editMessageText(messageText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          ...keyboard,
        });
        console.log(`✏️ Edited menu message ${messageId}`);
        progress.menuMessageId = messageId;
      } catch (error) {
        console.log(`⚠️ Failed to edit menu, sending new:`, error);
        const msg = await bot.sendMessage(
          chatId,
          messageText,
          {
            parse_mode: 'HTML',
            ...keyboard,
          }
        );
        progress.menuMessageId = msg.message_id;
      }
    } else {
      const msg = await bot.sendMessage(
        chatId,
        messageText,
        {
          parse_mode: 'HTML',
          ...keyboard,
        }
      );
      progress.menuMessageId = msg.message_id;
    }
    await saveUserProgress(progress);
    console.log(`✅ Category selection sent/edited to chat ${chatId}`);
  } catch (error) {
    console.error('❌ Error in handleSelectLevel:', error);
  }
}
