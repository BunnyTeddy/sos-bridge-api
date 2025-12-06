/**
 * SOS-Bridge Telegram Bot - Entry Point
 * 
 * Chạy bot: npm run bot
 * Hoặc: tsx src/telegram-main.ts
 */

import 'dotenv/config';
import { initBot, stopBot } from './integrations/telegram-bot.js';
import { store, getStoreType } from './store/index.js';

// Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║               🤖 SOS-BRIDGE TELEGRAM BOT 🤖                   ║
║     Hệ thống điều phối cứu nạn qua Telegram                   ║
║                  Powered by IQAI ADK-TS                       ║
╚═══════════════════════════════════════════════════════════════╝
`);

/**
 * Main function
 */
async function main() {
  // Check required environment variables
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is not set!');
    console.error('   Please set it in your .env file.');
    console.error('   Get token from @BotFather on Telegram.');
    process.exit(1);
  }

  if (!process.env.GOOGLE_API_KEY) {
    console.warn('⚠️  Warning: GOOGLE_API_KEY not set.');
    console.warn('   The AI agents may not work correctly without it.');
  }

  // Seed demo data
  console.log(`🔧 Initializing demo data... (Store type: ${getStoreType()})`);
  await store.seedDemoData();

  const stats = await store.getStats();
  console.log(`📊 Demo data loaded:`);
  console.log(`   - Rescuers: ${stats.rescuers.total}`);
  console.log(`   - Tickets: ${stats.tickets.total}`);
  console.log();

  // Determine mode
  const useWebhook = process.env.TELEGRAM_WEBHOOK_URL ? true : false;

  try {
    // Initialize bot
    const bot = initBot(useWebhook);

    console.log('✅ Bot is running!');
    console.log('   Send a message to your bot on Telegram to test.');
    console.log('   Press Ctrl+C to stop.');
    console.log();

    // Get bot info
    const me = await bot.getMe();
    console.log(`🤖 Bot Info:`);
    console.log(`   - Username: @${me.username}`);
    console.log(`   - Name: ${me.first_name}`);
    console.log(`   - ID: ${me.id}`);
    console.log();

  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await stopBot();
    console.log('👋 Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep process alive
  process.stdin.resume();
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

