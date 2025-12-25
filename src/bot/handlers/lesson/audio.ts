import TelegramBot from 'node-telegram-bot-api';

/**
 * Handle audio message updates smoothly
 * For audio: send new message immediately, delete old in background (no skeleton visible)
 */
export async function updateAudioMessageSmooth(
  bot: TelegramBot,
  chatId: number,
  oldMessageId: number,
  newAudioUrl: string,
  caption: string,
  keyboards: any,
  category: string,
  sentenceIndex: number,
  direction: 'NEXT' | 'PREV'
): Promise<number> {
  const prefix = direction === 'NEXT' ? '[NEXT]' : '[PREV]';
  
  try {
    console.log(`🎵 ${prefix} Audio: sending new message immediately (no skeleton)...`);
    
    // Extract audio buffer from base64
    const base64Data = newAudioUrl.includes(',')
      ? newAudioUrl.split(',')[1]
      : newAudioUrl;
    const audioBuffer = Buffer.from(base64Data, 'base64');
    
    // Step 1: Send NEW audio message with full content (no delay)
    const newMsg = await bot.sendAudio(chatId, audioBuffer, {
      caption,
      parse_mode: 'HTML',
      reply_markup: keyboards.showTranslation,
      title: `${category} - Sentence ${sentenceIndex}`,
    });
    
    console.log(`🎵 ${prefix} New audio sent with ID: ${newMsg.message_id}`);
    
    // Step 2: Delete OLD message in background (fire-and-forget, don't wait)
    bot.deleteMessage(chatId, oldMessageId).catch(err => {
      console.log(`⚠️ ${prefix} Failed to delete old message in background:`, err);
    });
    
    console.log(`✅ ${prefix} Audio update complete - new visible, old deleting in background`);
    return newMsg.message_id;
  } catch (error) {
    console.log(`❌ ${prefix} Audio send failed:`, error);
    throw error;
  }
}

/**
 * Update text message smoothly with skeleton transition
 * For text: edit old → skeleton → real content (all same message ID)
 */
export async function updateTextMessageSmooth(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  skeleton: string,
  realContent: string,
  keyboards: any,
  direction: 'NEXT' | 'PREV'
): Promise<boolean> {
  const prefix = direction === 'NEXT' ? '[NEXT]' : '[PREV]';
  
  try {
    // Step 1: Edit to skeleton
    await bot.editMessageText(skeleton, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: keyboards.showTranslation,
    });
    console.log(`✨ ${prefix} Edited to skeleton`);
    
    // Step 2: Edit to real content (smooth morphing)
    await bot.editMessageText(realContent, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: keyboards.showTranslation,
    });
    console.log(`✅ ${prefix} Edited to real content`);
    
    return true;
  } catch (error) {
    console.log(`⚠️ ${prefix} Text smooth update failed:`, error);
    return false;
  }
}

/**
 * Fallback: send new message if all edits fail
 */
export async function sendFallbackMessage(
  bot: TelegramBot,
  chatId: number,
  content: string,
  keyboards: any,
  direction: 'NEXT' | 'PREV'
): Promise<number> {
  const prefix = direction === 'NEXT' ? '[NEXT]' : '[PREV]';
  
  try {
    const msg = await bot.sendMessage(chatId, content, {
      parse_mode: 'HTML',
      reply_markup: keyboards.showTranslation,
    });
    console.log(`📤 ${prefix} Sent fallback text message`);
    return msg.message_id;
  } catch (error) {
    console.log(`❌ ${prefix} Fallback failed:`, error);
    throw error;
  }
}
