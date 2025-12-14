import { createBot } from './bot';
import { setupWebhookServer, startServer } from './server';

async function main(): Promise<void> {
  try {
    // Create bot instance
    const bot = createBot();
    console.log('🤖 Bot instance created');

    // Setup Express server with webhook endpoints
    const app = await setupWebhookServer(bot);
    console.log('✅ Webhook server configured');

    // Start the server
    await startServer(app);
    console.log('✅ Webhook server started');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      try {
        // Optionally remove webhook on shutdown
        // await bot.deleteWebHook();
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

main();
