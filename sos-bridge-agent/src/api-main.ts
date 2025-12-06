/**
 * SOS-Bridge API Server - Standalone Entry Point
 * This entry point is for production API server without @iqai/adk dependency
 */

import 'dotenv/config';
import { store, getStoreType } from './store/index.js';
import { createApiServer } from './api/server.js';

// Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🚨 SOS-BRIDGE API 🚨                       ║
║            REST API Server for SOS-Bridge                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

async function main() {
  console.log('🌐 Starting API Server...\n');
  console.log(`📦 Using store type: ${getStoreType()}\n`);
  
  // Seed demo data if needed
  await store.seedDemoData();
  
  // Get stats
  const stats = await store.getStats();
  console.log('📊 Current stats:');
  console.log(`   Tickets: ${stats.tickets.total} (${stats.tickets.open} open)`);
  console.log(`   Rescuers: ${stats.rescuers.total} (${stats.rescuers.online} online)\n`);
  
  // Start API server (Railway uses PORT)
  const port = parseInt(process.env.PORT || process.env.API_PORT || '3002');
  createApiServer(port);
  
  console.log('\n📡 API Endpoints:');
  console.log('   GET  /api/tickets          - List tickets');
  console.log('   POST /api/tickets          - Create ticket');
  console.log('   GET  /api/tickets/:id      - Get ticket');
  console.log('   GET  /api/rescuers         - List rescuers');
  console.log('   GET  /api/rescuers/:id     - Get rescuer');
  console.log('   GET  /api/transactions     - List transactions');
  console.log('   GET  /api/treasury         - Get treasury info');
  console.log('   GET  /api/stats            - Get stats');
  console.log('   GET  /api/missions/nearby  - Get nearby missions');
  console.log('\n✅ API Server ready for frontend connections!\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});







