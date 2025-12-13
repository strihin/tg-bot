import { createBot } from './bot';

function main(): void {
  try {
    // Create and start bot
    const bot = createBot();
    console.log('🤖 Bot polling started');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

main();
