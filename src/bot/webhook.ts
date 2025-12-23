import TelegramBot from 'node-telegram-bot-api';
import express from 'express';

export function setupWebhook(app: express.Application, bot: TelegramBot, token: string, port: number): void {
  const webhookUrl = `http://localhost:${port}/bot${token}`;
  
  // Register webhook endpoint
  app.post(`/bot${token}`, (req, res) => {
    console.log('🔔 Webhook received:', req.body.update_id);
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // Set webhook with Telegram
  bot.setWebHook(webhookUrl).then(() => {
    console.log(`✅ Webhook set to: ${webhookUrl}`);
  }).catch((error) => {
    console.error('❌ Failed to set webhook:', error);
  });
}

export function removeWebhook(bot: TelegramBot): Promise<boolean> {
  return bot.deleteWebHook().catch((error) => {
    console.error('⚠️ Warning: Could not delete webhook:', error);
    return false;
  });
}
