import { createBot } from './bot';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
const PORT = parseInt(process.env.BOT_PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

async function main(): Promise<void> {
  if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN environment variable is required');
  }

  const bot = createBot(BOT_TOKEN);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[bot] Received ${signal}, shutting down...`);
    bot.stop(signal);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  if (NODE_ENV === 'production' && WEBHOOK_DOMAIN) {
    // Production: webhook mode
    const webhookPath = `/webhook/${BOT_TOKEN}`;
    await bot.launch({
      webhook: {
        domain: WEBHOOK_DOMAIN,
        path: webhookPath,
        port: PORT,
      },
    });
    console.log(`[bot] Started in webhook mode on port ${PORT}`);
  } else {
    // Development: long polling
    await bot.launch();
    console.log('[bot] Started in polling mode');
  }
}

main().catch((err) => {
  console.error('[bot] Fatal error:', err);
  process.exit(1);
});
