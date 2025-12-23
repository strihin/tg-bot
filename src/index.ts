import TelegramBot from 'node-telegram-bot-api';
import { createBot } from './bot';
import { config } from './config';
import { ensureMongoDBConnection } from './db/mongodb';
import { setupWebhook, removeWebhook } from './bot/webhook';
import { getExpressApp } from './web'; // Start web server and get app instance

async function testBotConnection(bot: TelegramBot): Promise<boolean> {
  try {
    const botInfo = await bot.getMe();
    console.log(`✅ Bot connected successfully: @${botInfo.username} (ID: ${botInfo.id})`);
    return true;
  } catch (error) {
    console.error('❌ Bot connection failed:', error);
    return false;
  }
}

async function main(): Promise<void> {
  try {
    console.log('🔧 Loading configuration...');
    console.log(`🤖 Bot username: ${config.BOT_USERNAME}`);
    console.log(`🌐 Environment: ${config.NODE_ENV}`);

    // Initialize MongoDB connection
    console.log('\n📡 BEFORE: Calling ensureMongoDBConnection()');
    await ensureMongoDBConnection();
    console.log('📡 AFTER: ensureMongoDBConnection() completed');

    // Get Express app
    const app = getExpressApp();

    // Create bot
    const bot = createBot();

    // Test bot connection before starting polling/webhook
    testBotConnection(bot).then((connected) => {
      if (connected) {
        console.log(`🔧 WEBHOOK_MODE: ${config.WEBHOOK_MODE} | PORT: ${config.PORT}`);
        if (config.WEBHOOK_MODE) {
          console.log('🔌 Setting up webhook mode for bot');
          setupWebhook(app, bot, config.TELEGRAM_TOKEN, config.PORT);
        } else {
          console.log('🤖 Bot polling started');
        }
      } else {
        console.error('❌ Bot not started due to connection failure');
        process.exit(1);
      }
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      if (config.WEBHOOK_MODE) {
        await removeWebhook(bot);
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
