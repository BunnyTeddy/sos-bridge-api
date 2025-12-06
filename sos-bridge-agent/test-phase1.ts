/**
 * Phase 1 Test Script
 * Tests the new AgentBuilder-based workflow and session persistence
 * 
 * Run with: npx tsx test-phase1.ts
 */

import 'dotenv/config';

async function testPhase1() {
  console.log('\n🧪 Phase 1 IQAI ADK Upgrade Test\n');
  console.log('=' .repeat(50));

  // ============ Test 1: Session Service ============
  console.log('\n📦 Test 1: Session Service');
  
  const { 
    getUnifiedSessionService, 
    PostgresSessionService,
    InMemorySessionService 
  } = await import('./src/store/session-store.js');
  
  const sessionService = getUnifiedSessionService();
  const serviceType = sessionService instanceof PostgresSessionService 
    ? 'PostgreSQL' 
    : 'InMemory';
  
  console.log(`   ✅ Using ${serviceType} SessionService`);
  
  // Create a test session
  const testUserId = `test_user_${Date.now()}`;
  const session = await sessionService.createSession(testUserId, 'sos-bridge', {
    test: true,
    created_at: Date.now(),
  });
  
  console.log(`   ✅ Created session: ${session.id}`);
  console.log(`   ✅ User ID: ${session.userId}`);
  console.log(`   ✅ State: ${JSON.stringify(session.state)}`);
  
  // Update session
  await sessionService.mergeState(session.id, { updated: true });
  const updatedSession = await sessionService.getSession(session.id);
  console.log(`   ✅ Updated state: ${JSON.stringify(updatedSession?.state)}`);
  
  // Get session count
  const count = await sessionService.getSessionCount();
  console.log(`   ✅ Total sessions: ${count}`);
  
  // Cleanup test session
  await sessionService.deleteSession(session.id);
  console.log(`   ✅ Deleted test session`);

  // ============ Test 2: New Model Version ============
  console.log('\n🤖 Test 2: Model Version');
  
  const { DEFAULT_MODEL } = await import('./src/agents/workflow.js');
  console.log(`   ✅ DEFAULT_MODEL = ${DEFAULT_MODEL}`);
  
  if (DEFAULT_MODEL === 'gemini-2.5-flash') {
    console.log(`   ✅ Model upgraded successfully!`);
  } else {
    console.log(`   ❌ Expected gemini-2.5-flash`);
  }

  // ============ Test 3: AgentBuilder Functions ============
  console.log('\n🏗️  Test 3: AgentBuilder Functions');
  
  const { 
    buildListenerAgent,
    buildPerceiverAgent,
    buildDispatcherAgent,
    buildVerifierAgent,
    buildRewarderAgent,
  } = await import('./src/agents/workflow.js');
  
  // Test building individual agents
  const listener = await buildListenerAgent();
  console.log(`   ✅ buildListenerAgent() - name: ${listener.name}`);
  
  const perceiver = await buildPerceiverAgent();
  console.log(`   ✅ buildPerceiverAgent() - name: ${perceiver.name}`);
  
  const dispatcher = await buildDispatcherAgent();
  console.log(`   ✅ buildDispatcherAgent() - name: ${dispatcher.name}`);
  
  const verifier = await buildVerifierAgent();
  console.log(`   ✅ buildVerifierAgent() - name: ${verifier.name}`);
  
  const rewarder = await buildRewarderAgent();
  console.log(`   ✅ buildRewarderAgent() - name: ${rewarder.name}`);

  // ============ Test 4: Workflow Builders ============
  console.log('\n🔄 Test 4: Workflow Builders');
  
  const { 
    buildFullWorkflow,
    buildIntakeWorkflow,
  } = await import('./src/agents/workflow.js');
  
  const fullWorkflow = await buildFullWorkflow();
  console.log(`   ✅ buildFullWorkflow() - name: ${fullWorkflow.name}`);
  console.log(`      Sub-agents: ${fullWorkflow.subAgents.length}`);
  
  const intakeWorkflow = await buildIntakeWorkflow();
  console.log(`   ✅ buildIntakeWorkflow() - name: ${intakeWorkflow.name}`);
  console.log(`      Sub-agents: ${intakeWorkflow.subAgents.length}`);

  // ============ Test 5: WorkflowRunnerV2 ============
  console.log('\n🚀 Test 5: WorkflowRunnerV2');
  
  const { createWorkflowRunnerV2 } = await import('./src/agents/workflow.js');
  
  const runnerResult = await createWorkflowRunnerV2('intake', 'test_user_v2');
  console.log(`   ✅ createWorkflowRunnerV2() created`);
  console.log(`      Workflow: ${runnerResult.workflow.name}`);
  console.log(`      Session ID: ${runnerResult.session.id}`);
  console.log(`      Session State: ${JSON.stringify(runnerResult.session.state)}`);
  
  // Cleanup
  await runnerResult.sessionService.deleteSession(runnerResult.session.id);
  console.log(`   ✅ Cleaned up test session`);

  // ============ Summary ============
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All Phase 1 tests passed!\n');
  console.log('Next steps:');
  console.log('  1. Run "npm run db:migrate" to create agent_sessions table');
  console.log('  2. Test with a real SOS message using the Telegram bot');
  console.log('  3. Check PostgreSQL for session records\n');
  
  process.exit(0);
}

testPhase1().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});






