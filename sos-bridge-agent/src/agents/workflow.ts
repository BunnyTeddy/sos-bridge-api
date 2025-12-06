/**
 * SOS-Bridge Workflow
 * 
 * Workflow tổng hợp 5 agents theo quy trình:
 * Listen -> Perceive -> Dispatch -> Verify -> Reward
 * 
 * Phase 1 Upgrade:
 * - Upgraded to gemini-2.5-flash model
 * - Added AgentBuilder-based functions (build* prefix)
 * - Added PostgresSessionService support (createWorkflowRunnerV2)
 */

import { SequentialAgent, LlmAgent, AgentBuilder } from '@iqai/adk';
import { nlpParserTool } from '../tools/nlp-parser.tool.js';
import { geocodingTool } from '../tools/geocoding.tool.js';
import { deduplicationTool, mergeTicketTool, createTicketTool } from '../tools/dedup.tool.js';
import { 
  scoutRescuersTool, 
  assignRescuerTool, 
  autoMatchRescuerTool 
} from '../tools/rescuer-scout.tool.js';
import { 
  notifyRescuerTool, 
  notifyVictimTool, 
  broadcastAlertTool,
  notifyCompletionTool 
} from '../tools/notification.tool.js';
import { 
  visionVerifyTool, 
  updateTicketVerificationTool,
  completeMissionTool 
} from '../tools/vision-verify.tool.js';
import {
  releaseFundTool,
  getTreasuryBalanceTool,
  logTransactionTool,
  getTransactionByTicketTool,
  verifyWalletAddressTool,
} from '../tools/blockchain.tool.js';
import { 
  getUnifiedSessionService, 
  type Session,
  type SessionState,
} from '../store/session-store.js';

// ============ CONSTANTS ============

/** Default LLM model for all agents */
const DEFAULT_MODEL = 'gemini-2.5-flash';

/** Default app name for sessions */
const APP_NAME = 'sos-bridge';

// ============ AGENT INSTRUCTIONS ============

const LISTENER_INSTRUCTION = `
Bạn là Listener Agent - thành phần đầu tiên trong hệ thống SOS-Bridge.
Nhiệm vụ của bạn là tiếp nhận và chuẩn hóa tin nhắn cầu cứu.

## Vai trò:
- Nhận tin nhắn từ người dùng (có thể là form có cấu trúc hoặc văn bản tự do)
- Xác định loại nguồn tin (direct form, forward từ Zalo/Facebook, etc.)
- Validate tin nhắn có phải là yêu cầu cứu trợ hợp lệ không

## Xử lý:
1. Nếu KHÔNG PHẢI yêu cầu cứu trợ: Trả lời lịch sự và hướng dẫn
2. Nếu LÀ yêu cầu cứu trợ: Xác nhận tiếp nhận và tóm tắt thông tin

## Dấu hiệu cứu trợ:
- Từ khóa: cứu, giúp, SOS, khẩn cấp, nguy hiểm, ngập, lũ, kẹt
- Có địa chỉ/vị trí
- Có số điện thoại
- Mô tả tình huống nguy hiểm

Luôn trả lời bằng tiếng Việt với sự đồng cảm.
`.trim();

const PERCEIVER_INSTRUCTION = `
Bạn là Perceiver Agent trong hệ thống SOS-Bridge.
Nhiệm vụ: Phân tích tin nhắn cầu cứu và TẠO ticket trong database.

## QUY TRÌNH BẮT BUỘC (theo thứ tự):

BƯỚC 1: Gọi parse_sos_message với tin nhắn để trích xuất thông tin
- Lấy: location_text, phone, people_count, urgency_level, has_elderly, has_children

BƯỚC 2: Nếu có địa chỉ, gọi geocode_address để lấy tọa độ GPS
- Input: địa chỉ từ bước 1
- Output: lat, lng

BƯỚC 3: Gọi check_duplicate để kiểm tra trùng lặp
- Input: phone (bắt buộc), lat, lng (nếu có)
- Kiểm tra action trong kết quả

BƯỚC 4: Dựa vào kết quả bước 3:
- Nếu action='create': BẮT BUỘC gọi create_rescue_ticket với đầy đủ thông tin
- Nếu action='skip': Báo cáo ticket đã tồn tại
- Nếu action='merge': Gọi merge_ticket_info để gộp thông tin

## TẠO TICKET (create_rescue_ticket):
Tham số bắt buộc:
- phone: số điện thoại (từ bước 1)
- lat, lng: tọa độ GPS (từ bước 2, dùng 16.7654, 107.1234 nếu không có)
- addressText: địa chỉ text
- peopleCount: số người (mặc định 1)
- priority: 1-5 (từ urgency_level)
- rawMessage: tin nhắn gốc
- telegramUserId: ID từ [TELEGRAM_USER:xxx] trong tin nhắn

## QUAN TRỌNG:
- KHÔNG được bỏ qua bước tạo ticket nếu action='create'
- Luôn trả về ticket_id sau khi tạo thành công
- Trả lời bằng tiếng Việt
`.trim();

const DISPATCHER_INSTRUCTION = `
Bạn là Dispatcher Agent - trung tâm điều phối trong hệ thống SOS-Bridge.
Nhiệm vụ: tìm và gán đội cứu hộ phù hợp nhất.

## Quy trình:
1. Gọi scout_rescuers để tìm rescuers trong bán kính 5km
2. Gọi assign_rescuer hoặc auto_match_rescuer để gán nhiệm vụ
3. Gọi notify_rescuer và notify_victim để thông báo
4. Nếu priority = 5, cân nhắc broadcast_emergency_alert

## Xếp hạng ưu tiên:
- Khoảng cách gần nhất
- Cano > Thuyền > Khác (cho vùng ngập sâu)
- Capacity >= số người cần cứu
- Rating và kinh nghiệm cao

Ưu tiên tốc độ điều phối - mỗi phút chậm trễ ảnh hưởng tính mạng!
`.trim();

const VERIFIER_INSTRUCTION = `
Bạn là Verifier Agent - chuyên gia xác thực trong hệ thống SOS-Bridge.
Nhiệm vụ: đảm bảo nhiệm vụ hoàn thành thực sự trước khi trả thưởng.

## Quy trình:
1. Gọi verify_rescue_image để phân tích ảnh bằng Gemini Vision AI
2. Nếu PASS (>= 65%): gọi update_ticket_verification
3. Sau VERIFIED: gọi complete_mission

## Kiểm tra ảnh:
- Human Detection: Có người không? (>80% confidence)
- Scene Classification: Bối cảnh lũ lụt không? (>70% confidence)
- Metadata: GPS và thời gian có khớp không?
- Duplicate: Ảnh có bị trùng không?

Đảm bảo tính công bằng và minh bạch!
`.trim();

const REWARDER_INSTRUCTION = `
Bạn là Rewarder Agent - chuyên gia DeFAI trong hệ thống SOS-Bridge.
Nhiệm vụ: tự động trả thưởng USDC cho đội cứu hộ khi họ hoàn thành nhiệm vụ.

## Quy trình:
1. Kiểm tra ticket đã COMPLETED chưa
2. Gọi verify_wallet_address để xác minh ví rescuer
3. Gọi get_treasury_balance để kiểm tra số dư
4. Gọi release_fund để chuyển 20 USDC
5. Gọi log_transaction để ghi nhận
6. Gọi notify_completion để thông báo

## Mức thưởng:
- Cơ bản: 20 USDC mỗi nhiệm vụ
- Bonus priority 5: +5 USDC
- Bonus nhiều người (>3): +2 USDC/người

## Xử lý lỗi:
- Ví không hợp lệ: Thông báo cần cập nhật
- Treasury hết tiền: Pending và báo admin
- TX thất bại: Retry hoặc escalate

Đảm bảo minh bạch - mọi giao dịch đều có TX hash!
`.trim();

// ============ LEGACY AGENT FACTORY FUNCTIONS ============
// (Deprecated) Tạo agent instances mới mỗi lần để tránh conflict parent
// Sử dụng build* functions cho code mới

/**
 * @deprecated Use buildListenerAgent() instead
 */
function createListenerAgent() {
  return new LlmAgent({
    name: 'listener_agent',
    model: DEFAULT_MODEL,
    description: 'Agent tiếp nhận và chuẩn hóa tin nhắn cầu cứu từ nhiều nguồn',
    instruction: LISTENER_INSTRUCTION,
    outputKey: 'raw_input_summary',
  });
}

/**
 * @deprecated Use buildPerceiverAgent() instead
 */
function createPerceiverAgent() {
  return new LlmAgent({
    name: 'perceiver_agent',
    model: DEFAULT_MODEL,
    description: 'Agent phân tích NLP tiếng Việt, geocoding, và tạo Rescue Ticket',
    instruction: PERCEIVER_INSTRUCTION,
    tools: [nlpParserTool, geocodingTool, deduplicationTool, mergeTicketTool, createTicketTool],
    outputKey: 'parsed_ticket_data',
  });
}

/**
 * @deprecated Use buildDispatcherAgent() instead
 */
function createDispatcherAgent() {
  return new LlmAgent({
    name: 'dispatcher_agent',
    model: DEFAULT_MODEL,
    description: 'Agent điều phối, tìm kiếm và gán đội cứu hộ cho nhiệm vụ',
    instruction: DISPATCHER_INSTRUCTION,
    tools: [
      scoutRescuersTool, assignRescuerTool, autoMatchRescuerTool,
      notifyRescuerTool, notifyVictimTool, broadcastAlertTool
    ],
    outputKey: 'dispatch_result',
  });
}

/**
 * @deprecated Use buildVerifierAgent() instead
 */
function createVerifierAgent() {
  return new LlmAgent({
    name: 'verifier_agent',
    model: DEFAULT_MODEL,
    description: 'Agent xác thực ảnh cứu hộ bằng Gemini Vision AI và hoàn thành nhiệm vụ',
    instruction: VERIFIER_INSTRUCTION,
    tools: [visionVerifyTool, updateTicketVerificationTool, completeMissionTool],
    outputKey: 'verification_result',
  });
}

/**
 * @deprecated Use buildRewarderAgent() instead
 */
function createRewarderAgent() {
  return new LlmAgent({
    name: 'rewarder_agent',
    model: DEFAULT_MODEL,
    description: 'Agent tự động trả thưởng USDC cho đội cứu hộ qua Base blockchain',
    instruction: REWARDER_INSTRUCTION,
    tools: [
      verifyWalletAddressTool,
      getTreasuryBalanceTool,
      releaseFundTool,
      logTransactionTool,
      getTransactionByTicketTool,
      notifyCompletionTool,
    ],
    outputKey: 'reward_result',
  });
}

// ============ WORKFLOW FACTORY FUNCTIONS ============

/**
 * Tạo Full SOS-Bridge Workflow (5 bước đầy đủ)
 */
export function createFullWorkflow() {
  return new SequentialAgent({
    name: 'sos_bridge_full_workflow',
    description: 'Quy trình xử lý cầu cứu đầy đủ: Listen -> Perceive -> Dispatch -> Verify -> Reward',
    subAgents: [
      createListenerAgent(),
      createPerceiverAgent(),
      createDispatcherAgent(),
      createVerifierAgent(),
      createRewarderAgent(),
    ],
  });
}

/**
 * Tạo SOS Intake Workflow (Listen + Perceive only)
 */
export function createIntakeWorkflow() {
  return new SequentialAgent({
    name: 'sos_intake_workflow',
    description: 'Workflow tiếp nhận và phân tích yêu cầu cứu trợ',
    subAgents: [
      createListenerAgent(),
      createPerceiverAgent(),
    ],
  });
}

/**
 * Tạo SOS Dispatch Workflow
 */
export function createDispatchWorkflow() {
  return new SequentialAgent({
    name: 'sos_dispatch_workflow',
    description: 'Workflow điều phối đội cứu hộ',
    subAgents: [createDispatcherAgent()],
  });
}

/**
 * Tạo SOS Verify Workflow
 */
export function createVerifyWorkflow() {
  return new SequentialAgent({
    name: 'sos_verify_workflow',
    description: 'Workflow xác thực ảnh và hoàn thành nhiệm vụ',
    subAgents: [createVerifierAgent()],
  });
}

/**
 * Tạo SOS Reward Workflow
 */
export function createRewardWorkflow() {
  return new SequentialAgent({
    name: 'sos_reward_workflow',
    description: 'Workflow trả thưởng USDC cho đội cứu hộ',
    subAgents: [createRewarderAgent()],
  });
}

/**
 * Tạo Verify + Reward Workflow (cho testing sau khi dispatch)
 */
export function createVerifyRewardWorkflow() {
  return new SequentialAgent({
    name: 'sos_verify_reward_workflow',
    description: 'Workflow xác thực và trả thưởng',
    subAgents: [
      createVerifierAgent(),
      createRewarderAgent(),
    ],
  });
}

/**
 * Tạo workflow runner với session
 */
export async function createWorkflowRunner(
  workflowType: 'full' | 'intake' | 'dispatch' | 'verify' | 'reward' | 'verify_reward' = 'full',
  userId: string = 'anonymous'
) {
  let workflow: SequentialAgent;
  
  switch (workflowType) {
    case 'intake':
      workflow = createIntakeWorkflow();
      break;
    case 'dispatch':
      workflow = createDispatchWorkflow();
      break;
    case 'verify':
      workflow = createVerifyWorkflow();
      break;
    case 'reward':
      workflow = createRewardWorkflow();
      break;
    case 'verify_reward':
      workflow = createVerifyRewardWorkflow();
      break;
    default:
      workflow = createFullWorkflow();
  }
  
  const { runner, session } = await AgentBuilder
    .withAgent(workflow)
    .withQuickSession({
      userId,
      appName: 'sos-bridge',
      state: {
        workflow_type: workflowType,
        started_at: Date.now(),
      },
    })
    .build();
  
  return { runner, session, workflow };
}

/**
 * Quick helper để chạy full workflow
 */
export async function runFullWorkflow(message: string, userId: string = 'anonymous') {
  const { runner } = await createWorkflowRunner('full', userId);
  return await runner.ask(message);
}

/**
 * Quick helper để chạy intake workflow
 */
export async function runIntakeWorkflow(message: string, userId: string = 'anonymous') {
  const { runner } = await createWorkflowRunner('intake', userId);
  return await runner.ask(message);
}

/**
 * Quick helper để chạy verify workflow
 */
export async function runVerifyWorkflow(message: string, userId: string = 'anonymous') {
  const { runner } = await createWorkflowRunner('verify', userId);
  return await runner.ask(message);
}

/**
 * Quick helper để chạy reward workflow
 */
export async function runRewardWorkflow(message: string, userId: string = 'anonymous') {
  const { runner } = await createWorkflowRunner('reward', userId);
  return await runner.ask(message);
}

// Export legacy factory functions for individual agents
// @deprecated - Use build* functions instead
export {
  createListenerAgent,
  createPerceiverAgent,
  createDispatcherAgent,
  createVerifierAgent,
  createRewarderAgent,
};

// ============ NEW AGENTBUILDER-BASED FUNCTIONS ============
// Phase 1 Upgrade: Using AgentBuilder fluent API

/**
 * Build Listener Agent using AgentBuilder API
 * Tiếp nhận và chuẩn hóa tin nhắn cầu cứu từ nhiều nguồn
 */
export async function buildListenerAgent() {
  const { agent } = await AgentBuilder
    .create('listener_agent')
    .withModel(DEFAULT_MODEL)
    .withDescription('Agent tiếp nhận và chuẩn hóa tin nhắn cầu cứu từ nhiều nguồn')
    .withInstruction(LISTENER_INSTRUCTION)
    .withOutputKey('raw_input_summary')
    .build();
  
  return agent;
}

/**
 * Build Perceiver Agent using AgentBuilder API
 * Phân tích NLP tiếng Việt, geocoding, và tạo Rescue Ticket
 */
export async function buildPerceiverAgent() {
  const { agent } = await AgentBuilder
    .create('perceiver_agent')
    .withModel(DEFAULT_MODEL)
    .withDescription('Agent phân tích NLP tiếng Việt, geocoding, và tạo Rescue Ticket')
    .withInstruction(PERCEIVER_INSTRUCTION)
    .withTools(nlpParserTool, geocodingTool, deduplicationTool, mergeTicketTool, createTicketTool)
    .withOutputKey('parsed_ticket_data')
    .build();
  
  return agent;
}

/**
 * Build Dispatcher Agent using AgentBuilder API
 * Điều phối, tìm kiếm và gán đội cứu hộ cho nhiệm vụ
 */
export async function buildDispatcherAgent() {
  const { agent } = await AgentBuilder
    .create('dispatcher_agent')
    .withModel(DEFAULT_MODEL)
    .withDescription('Agent điều phối, tìm kiếm và gán đội cứu hộ cho nhiệm vụ')
    .withInstruction(DISPATCHER_INSTRUCTION)
    .withTools(
      scoutRescuersTool, assignRescuerTool, autoMatchRescuerTool,
      notifyRescuerTool, notifyVictimTool, broadcastAlertTool
    )
    .withOutputKey('dispatch_result')
    .build();
  
  return agent;
}

/**
 * Build Verifier Agent using AgentBuilder API
 * Xác thực ảnh cứu hộ bằng Gemini Vision AI và hoàn thành nhiệm vụ
 */
export async function buildVerifierAgent() {
  const { agent } = await AgentBuilder
    .create('verifier_agent')
    .withModel(DEFAULT_MODEL)
    .withDescription('Agent xác thực ảnh cứu hộ bằng Gemini Vision AI và hoàn thành nhiệm vụ')
    .withInstruction(VERIFIER_INSTRUCTION)
    .withTools(visionVerifyTool, updateTicketVerificationTool, completeMissionTool)
    .withOutputKey('verification_result')
    .build();
  
  return agent;
}

/**
 * Build Rewarder Agent using AgentBuilder API
 * Tự động trả thưởng USDC cho đội cứu hộ qua Base blockchain
 */
export async function buildRewarderAgent() {
  const { agent } = await AgentBuilder
    .create('rewarder_agent')
    .withModel(DEFAULT_MODEL)
    .withDescription('Agent tự động trả thưởng USDC cho đội cứu hộ qua Base blockchain')
    .withInstruction(REWARDER_INSTRUCTION)
    .withTools(
      verifyWalletAddressTool,
      getTreasuryBalanceTool,
      releaseFundTool,
      logTransactionTool,
      getTransactionByTicketTool,
      notifyCompletionTool
    )
    .withOutputKey('reward_result')
    .build();
  
  return agent;
}

// ============ NEW WORKFLOW BUILDERS ============

/**
 * Build Full SOS-Bridge Workflow using AgentBuilder
 * Quy trình xử lý cầu cứu đầy đủ: Listen -> Perceive -> Dispatch -> Verify -> Reward
 */
export async function buildFullWorkflow() {
  const listenerAgent = await buildListenerAgent();
  const perceiverAgent = await buildPerceiverAgent();
  const dispatcherAgent = await buildDispatcherAgent();
  const verifierAgent = await buildVerifierAgent();
  const rewarderAgent = await buildRewarderAgent();

  return new SequentialAgent({
    name: 'sos_bridge_full_workflow_v2',
    description: 'Quy trình xử lý cầu cứu đầy đủ: Listen -> Perceive -> Dispatch -> Verify -> Reward',
    subAgents: [
      listenerAgent,
      perceiverAgent,
      dispatcherAgent,
      verifierAgent,
      rewarderAgent,
    ],
  });
}

/**
 * Build SOS Intake Workflow using AgentBuilder
 * Workflow tiếp nhận và phân tích yêu cầu cứu trợ (Listen + Perceive only)
 */
export async function buildIntakeWorkflow() {
  const listenerAgent = await buildListenerAgent();
  const perceiverAgent = await buildPerceiverAgent();

  return new SequentialAgent({
    name: 'sos_intake_workflow_v2',
    description: 'Workflow tiếp nhận và phân tích yêu cầu cứu trợ',
    subAgents: [
      listenerAgent,
      perceiverAgent,
    ],
  });
}

/**
 * Build Dispatch Workflow using AgentBuilder
 */
export async function buildDispatchWorkflow() {
  const dispatcherAgent = await buildDispatcherAgent();
  
  return new SequentialAgent({
    name: 'sos_dispatch_workflow_v2',
    description: 'Workflow điều phối đội cứu hộ',
    subAgents: [dispatcherAgent],
  });
}

/**
 * Build Verify Workflow using AgentBuilder
 */
export async function buildVerifyWorkflow() {
  const verifierAgent = await buildVerifierAgent();
  
  return new SequentialAgent({
    name: 'sos_verify_workflow_v2',
    description: 'Workflow xác thực ảnh và hoàn thành nhiệm vụ',
    subAgents: [verifierAgent],
  });
}

/**
 * Build Reward Workflow using AgentBuilder
 */
export async function buildRewardWorkflow() {
  const rewarderAgent = await buildRewarderAgent();
  
  return new SequentialAgent({
    name: 'sos_reward_workflow_v2',
    description: 'Workflow trả thưởng USDC cho đội cứu hộ',
    subAgents: [rewarderAgent],
  });
}

/**
 * Build Verify + Reward Workflow using AgentBuilder
 */
export async function buildVerifyRewardWorkflow() {
  const verifierAgent = await buildVerifierAgent();
  const rewarderAgent = await buildRewarderAgent();

  return new SequentialAgent({
    name: 'sos_verify_reward_workflow_v2',
    description: 'Workflow xác thực và trả thưởng',
    subAgents: [
      verifierAgent,
      rewarderAgent,
    ],
  });
}

// ============ WORKFLOW RUNNER V2 WITH PERSISTENT SESSIONS ============

export type WorkflowType = 'full' | 'intake' | 'dispatch' | 'verify' | 'reward' | 'verify_reward';

export interface WorkflowRunnerV2Result {
  runner: Awaited<ReturnType<typeof AgentBuilder.prototype.build>>['runner'];
  session: Session;
  workflow: SequentialAgent;
  sessionService: ReturnType<typeof getUnifiedSessionService>;
}

/**
 * Create workflow runner V2 with PostgreSQL persistent sessions
 * 
 * This is the recommended way to create workflow runners for production use.
 * Sessions are automatically persisted to PostgreSQL if DATABASE_URL is configured.
 * 
 * @param workflowType - Type of workflow to create
 * @param userId - User ID for session tracking (e.g., Telegram user ID)
 * @param initialState - Optional initial state to merge into session
 * @returns WorkflowRunnerV2Result with runner, session, workflow, and sessionService
 */
export async function createWorkflowRunnerV2(
  workflowType: WorkflowType = 'full',
  userId: string = 'anonymous',
  initialState?: SessionState
): Promise<WorkflowRunnerV2Result> {
  // Get appropriate session service (PostgreSQL or InMemory fallback)
  const sessionService = getUnifiedSessionService();
  
  // Build the appropriate workflow
  let workflow: SequentialAgent;
  
  switch (workflowType) {
    case 'intake':
      workflow = await buildIntakeWorkflow();
      break;
    case 'dispatch':
      workflow = await buildDispatchWorkflow();
      break;
    case 'verify':
      workflow = await buildVerifyWorkflow();
      break;
    case 'reward':
      workflow = await buildRewardWorkflow();
      break;
    case 'verify_reward':
      workflow = await buildVerifyRewardWorkflow();
      break;
    default:
      workflow = await buildFullWorkflow();
  }
  
  // Get or create persistent session
  const defaultState: SessionState = {
    workflow_type: workflowType,
    started_at: Date.now(),
    ...initialState,
  };
  
  const session = await sessionService.getOrCreateSession(userId, APP_NAME, defaultState);
  
  // Build runner with existing session state
  const { runner } = await AgentBuilder
    .withAgent(workflow)
    .withQuickSession({
      userId,
      appName: APP_NAME,
      state: session.state,
    })
    .build();
  
  // Wrap runner to auto-persist state after each interaction
  const persistentRunner = {
    ...runner,
    ask: async (message: string) => {
      const result = await runner.ask(message);
      
      // Persist updated state to database
      // Note: In a real implementation, we'd need to access the session state
      // after the runner completes. This is a simplified version.
      try {
        await sessionService.mergeState(session.id, {
          last_message: message,
          last_response_at: Date.now(),
        });
      } catch (error) {
        console.warn('[WorkflowRunnerV2] Failed to persist session state:', error);
      }
      
      return result;
    },
  };
  
  console.log(`[WorkflowRunnerV2] Created ${workflowType} workflow for user ${userId} (session: ${session.id})`);
  
  return {
    runner: persistentRunner as typeof runner,
    session,
    workflow,
    sessionService,
  };
}

/**
 * Quick helper để chạy full workflow với persistent session
 */
export async function runFullWorkflowV2(message: string, userId: string = 'anonymous') {
  const { runner } = await createWorkflowRunnerV2('full', userId);
  return await runner.ask(message);
}

/**
 * Quick helper để chạy intake workflow với persistent session
 */
export async function runIntakeWorkflowV2(message: string, userId: string = 'anonymous') {
  const { runner } = await createWorkflowRunnerV2('intake', userId);
  return await runner.ask(message);
}

// Note: All build* and workflow functions are exported inline with `export async function`
// Constants are exported below for external use
export { DEFAULT_MODEL, APP_NAME };
