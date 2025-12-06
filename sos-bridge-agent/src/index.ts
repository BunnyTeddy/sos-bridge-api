/**
 * SOS-Bridge Agent - Entry Point
 * 
 * Tổng đài AI điều phối cứu nạn phi tập trung
 * Powered by IQAI ADK-TS
 */

import 'dotenv/config';
import { AgentBuilder } from '@iqai/adk';
import { store, getStoreType } from './store/index.js';
import { 
  createWorkflowRunner,
  createFullWorkflow,
  createIntakeWorkflow,
  createListenerAgent,
  createPerceiverAgent,
  createDispatcherAgent,
  createVerifierAgent,
} from './agents/workflow.js';
import { createApiServer } from './api/server.js';

// Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🚨 SOS-BRIDGE AGENT 🚨                     ║
║     Tổng đài AI điều phối cứu nạn phi tập trung               ║
║                  Powered by IQAI ADK-TS                       ║
╚═══════════════════════════════════════════════════════════════╝
`);

/**
 * Demo: Chạy full workflow với một tin nhắn cầu cứu mẫu
 */
async function runDemo() {
  console.log('🔧 Initializing demo data...\n');
  console.log(`📦 Using store type: ${getStoreType()}\n`);
  
  // Seed demo data
  await store.seedDemoData();
  
  // Hiển thị thống kê
  const stats = await store.getStats();
  console.log('📊 Current stats:');
  console.log(`   Tickets: ${stats.tickets.total} (${stats.tickets.open} open)`);
  console.log(`   Rescuers: ${stats.rescuers.total} (${stats.rescuers.online} online)\n`);
  
  // Tin nhắn cầu cứu mẫu
  const sampleMessage = `
Cấp cứu bà con ơi! Nhà ông Bảy ở xóm Bàu, xã Hải Thượng nước lên gần mái rồi. 
Có 2 ông bà già với đứa cháu nhỏ. Ai có thuyền vô cứu với. 
Sđt con ông: 0912.345.678
  `.trim();
  
  console.log('📨 Sample SOS Message:');
  console.log('─'.repeat(60));
  console.log(sampleMessage);
  console.log('─'.repeat(60));
  console.log();
  
  try {
    // Tạo workflow runner
    console.log('🚀 Starting SOS-Bridge Workflow...\n');
    
    const { runner, session } = await createWorkflowRunner('intake', 'demo-user-001');
    
    // Chạy workflow
    console.log('📍 Step 1: Listener Agent - Tiếp nhận tin nhắn...');
    console.log('📍 Step 2: Perceiver Agent - Phân tích NLP & Geocoding...\n');
    
    const result = await runner.ask(sampleMessage);
    
    console.log('\n✅ Workflow completed!');
    console.log('─'.repeat(60));
    console.log('📋 Final Result:');
    console.log(result);
    
    // Hiển thị session state
    console.log('\n📦 Session State:');
    const state = session.state as Record<string, unknown>;
    console.log('  raw_input_summary:', state['raw_input_summary'] || 'N/A');
    console.log('  parsed_ticket_data:', state['parsed_ticket_data'] || 'N/A');
    
    // Hiển thị thống kê sau
    const statsAfter = await store.getStats();
    console.log('\n📊 Stats after workflow:');
    console.log(`   Tickets: ${statsAfter.tickets.total} (${statsAfter.tickets.open} open)`);
    
  } catch (error) {
    console.error('❌ Error running workflow:', error);
  }
}

/**
 * Interactive mode: Nhận input từ command line
 */
async function runInteractive() {
  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  console.log('💬 Interactive Mode - Gửi tin nhắn cầu cứu để test');
  console.log('   Gõ "exit" để thoát, "stats" để xem thống kê\n');
  
  // Seed data
  await store.seedDemoData();
  
  const askQuestion = () => {
    rl.question('📨 Nhập tin nhắn: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
        rl.close();
        return;
      }
      
      if (input.toLowerCase() === 'stats') {
        const stats = await store.getStats();
        console.log('\n📊 Stats:');
        console.log(JSON.stringify(stats, null, 2));
        console.log();
        askQuestion();
        return;
      }
      
      if (!input.trim()) {
        askQuestion();
        return;
      }
      
      try {
        console.log('\n🔄 Processing...\n');
        
        const { runner } = await createWorkflowRunner('intake', 'interactive-user');
        const result = await runner.ask(input);
        
        console.log('\n✅ Result:');
        console.log(result);
        console.log();
        
      } catch (error) {
        console.error('❌ Error:', error);
      }
      
      askQuestion();
    });
  };
  
  askQuestion();
}

/**
 * Test individual agents
 */
async function testIndividualAgents() {
  console.log('🧪 Testing individual agents...\n');
  
  // Test Listener Agent
  console.log('1️⃣ Testing Listener Agent...');
  const { runner: listenerRunner } = await AgentBuilder
    .withAgent(createListenerAgent())
    .withQuickSession({ userId: 'test', appName: 'test' })
    .build();
  
  const listenerResult = await listenerRunner.ask('Cứu với! Nhà tôi ở xã Hải Lăng bị ngập');
  console.log('   Result:', String(listenerResult).substring(0, 200) + '...\n');
  
  // Test Perceiver Agent
  console.log('2️⃣ Testing Perceiver Agent...');
  const { runner: perceiverRunner } = await AgentBuilder
    .withAgent(createPerceiverAgent())
    .withQuickSession({ userId: 'test', appName: 'test' })
    .build();
  
  const perceiverResult = await perceiverRunner.ask(
    'Phân tích tin nhắn: "Cứu gấp! Nhà ông Ba ở xóm Bàu, Hải Thượng. 3 người mắc kẹt, có trẻ em. SĐT: 0909123456"'
  );
  console.log('   Result:', String(perceiverResult).substring(0, 200) + '...\n');
  
  console.log('✅ Individual agent tests completed!\n');
}

/**
 * Start API Server for frontend
 */
async function runApiServer() {
  console.log('🌐 Starting API Server...\n');
  console.log(`📦 Using store type: ${getStoreType()}\n`);
  
  // Seed demo data
  await store.seedDemoData();
  
  // Show stats
  const stats = await store.getStats();
  console.log('📊 Current stats:');
  console.log(`   Tickets: ${stats.tickets.total} (${stats.tickets.open} open)`);
  console.log(`   Rescuers: ${stats.rescuers.total} (${stats.rescuers.online} online)\n`);
  
  // Start API server (Railway uses PORT, locally use API_PORT or default 3002)
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

/**
 * Main entry point
 */
async function main() {
  // Check for GOOGLE_API_KEY
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('⚠️  Warning: GOOGLE_API_KEY not set. Please set it in .env file.');
    console.warn('   The agents may not work correctly without it.\n');
  }
  
  const args = process.argv.slice(2);
  const mode = args[0] || 'demo';
  
  switch (mode) {
    case 'demo':
      await runDemo();
      break;
    case 'interactive':
    case '-i':
      await runInteractive();
      break;
    case 'test':
      await testIndividualAgents();
      break;
    case 'api':
    case 'server':
      await runApiServer();
      break;
    default:
      console.log('Usage: npm run dev [mode]');
      console.log('  demo        - Run demo with sample message (default)');
      console.log('  interactive - Interactive mode');
      console.log('  test        - Test individual agents');
      console.log('  api         - Start REST API server for frontend');
  }
}

// Run
main().catch(console.error);

// Export for external use
export {
  createWorkflowRunner,
  createFullWorkflow,
  createIntakeWorkflow,
  createListenerAgent,
  createPerceiverAgent,
  createDispatcherAgent,
  createVerifierAgent,
  store,
  createApiServer,
};
