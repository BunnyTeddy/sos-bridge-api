/**
 * Telegram Bot Integration
 * Kết nối SOS-Bridge Agent với Telegram Bot API
 */

import TelegramBot from 'node-telegram-bot-api';
import { store } from '../store/index.js';
import { createWorkflowRunner } from '../agents/workflow.js';
import {
  startRegistration,
  handleRegistrationMessage,
  handleRegistrationCallback,
  isInRegistration,
  linkWallet,
  setRescuerOnline,
  setRescuerOffline,
  showRescuerProfile,
} from './registration-flow.js';

// ============ CONFIGURATION ============

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

// Workflow timeout (30 seconds)
const WORKFLOW_TIMEOUT = 30000;

// SOS keywords for message filtering
const SOS_KEYWORDS = [
  'cứu', 'giúp', 'sos', 'khẩn', 'ngập', 'lũ', 'kẹt', 'mắc', 
  'nguy', 'hiểm', 'chết', 'đuối', 'trôi', 'cô lập', 'mắc kẹt',
  'cần cứu', 'help', 'emergency'
];

// Processing lock to prevent race conditions
const processingUsers = new Set<string>();

// ============ BOT INSTANCE ============

let bot: TelegramBot | null = null;

/**
 * Check if message contains SOS keywords
 */
function isSosMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return SOS_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Escape special Markdown characters
 */
function escapeMarkdown(text: string): string {
  // Only escape characters that break Telegram's Markdown
  return text
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/\-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

/**
 * Run workflow with timeout
 */
async function runWorkflowWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = WORKFLOW_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Workflow timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Initialize Telegram Bot
 * @param useWebhook - Use webhook mode (production) or polling (development)
 */
export function initBot(useWebhook: boolean = false): TelegramBot {
  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  }

  if (bot) {
    return bot;
  }

  if (useWebhook && WEBHOOK_URL) {
    // Production: Webhook mode
    bot = new TelegramBot(BOT_TOKEN, { webHook: true });
    bot.setWebHook(WEBHOOK_URL);
    console.log(`[Telegram] Bot started in webhook mode: ${WEBHOOK_URL}`);
  } else {
    // Development: Polling mode
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('[Telegram] Bot started in polling mode');
  }

  // Register handlers
  registerCommandHandlers(bot);
  registerMessageHandlers(bot);
  registerPhotoHandlers(bot);
  registerCallbackHandlers(bot);

  return bot;
}

/**
 * Get bot instance
 */
export function getBot(): TelegramBot | null {
  return bot;
}

/**
 * Stop bot
 */
export async function stopBot(): Promise<void> {
  if (bot) {
    await bot.stopPolling();
    bot = null;
    console.log('[Telegram] Bot stopped');
  }
}

// ============ COMMAND HANDLERS ============

function registerCommandHandlers(bot: TelegramBot): void {
  // /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from?.first_name || 'bạn';

    const welcomeMessage = `
🚨 Chào mừng ${userName} đến với SOS-Bridge!

Đây là hệ thống điều phối cứu nạn sử dụng AI.

Cách sử dụng:
1. Gửi tin nhắn mô tả tình huống cần cứu trợ
2. Cung cấp địa chỉ/vị trí và số điện thoại
3. Hệ thống sẽ tự động tìm đội cứu hộ gần nhất

Ví dụ tin nhắn:
"Cứu với! Nhà ông Ba ở xóm Bàu, xã Hải Thượng bị ngập. Có 3 người mắc kẹt. SĐT: 0909123456"

Lệnh hỗ trợ:
/help - Xem hướng dẫn chi tiết
/status - Kiểm tra trạng thái hệ thống
/mytickets - Xem các yêu cầu của bạn

Hãy gửi tin nhắn cầu cứu ngay nếu bạn cần hỗ trợ! 🆘
    `.trim();

    await bot.sendMessage(chatId, welcomeMessage);
  });

  // /help command
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
📖 Hướng dẫn sử dụng SOS-Bridge

1. Gửi yêu cầu cứu trợ:
- Mô tả tình huống ngắn gọn
- Địa chỉ chính xác (xóm, thôn, xã, huyện)
- Số điện thoại liên hệ
- Số người cần cứu

2. Nếu bạn là đội cứu hộ:
- Đăng ký qua /register
- Bật trạng thái sẵn sàng /online
- Nhận thông báo nhiệm vụ tự động
- Gửi ảnh xác nhận hoàn thành

3. Theo dõi tiến độ:
- Nhận thông báo real-time
- Xem trạng thái ticket
- Nhận thưởng USDC khi hoàn thành

Liên hệ hỗ trợ: admin@sosbridge.vn
    `.trim();

    await bot.sendMessage(chatId, helpMessage);
  });

  // /status command
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const stats = await store.getStats();

    const statusMessage = `
📊 Trạng thái hệ thống SOS-Bridge

Tickets:
- Tổng: ${stats.tickets.total}
- Đang mở: ${stats.tickets.open}
- Đang xử lý: ${stats.tickets.in_progress}
- Hoàn thành: ${stats.tickets.completed}

Đội cứu hộ:
- Tổng đăng ký: ${stats.rescuers.total}
- Đang online: ${stats.rescuers.online}
- Đang làm nhiệm vụ: ${stats.rescuers.on_mission}

Giao dịch:
- Tổng: ${stats.transactions.total}
- Đã giải ngân: ${stats.transactions.total_disbursed_usdc} USDC

✅ Hệ thống đang hoạt động bình thường
    `.trim();

    await bot.sendMessage(chatId, statusMessage);
  });

  // /mytickets command
  bot.onText(/\/mytickets/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString() || '';

    console.log(`[Telegram] /mytickets command from user ${userId}`);

    try {
      // Find tickets linked to this telegram user
      const allTickets = await store.getAllTickets();
      console.log(`[Telegram] Total tickets in store: ${allTickets.length}`);
      
      const userTickets = allTickets.filter(ticket => {
        // Check if raw_message contains this user's ID
        const rawMsg = ticket.raw_message || '';
        return rawMsg.includes(`[TG:${userId}]`) || rawMsg.includes(`[TELEGRAM_USER:${userId}]`);
      });

      console.log(`[Telegram] User tickets found: ${userTickets.length}`);

      if (userTickets.length === 0) {
        await bot.sendMessage(chatId, '📭 Bạn chưa có yêu cầu cứu trợ nào.\n\n💡 Gửi tin nhắn mô tả tình huống để tạo yêu cầu mới.');
        return;
      }

      let message = '📋 Các yêu cầu của bạn:\n\n';
      
      for (const ticket of userTickets) {
        const statusEmoji = getStatusEmoji(ticket.status);
        message += `${statusEmoji} ${ticket.ticket_id}\n`;
        message += `   Trạng thái: ${ticket.status}\n`;
        message += `   Địa điểm: ${ticket.location.address_text || 'N/A'}\n`;
        message += `   Tạo lúc: ${new Date(ticket.created_at).toLocaleString('vi-VN')}\n\n`;
      }

      await bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('[Telegram] Error in /mytickets:', error);
      await bot.sendMessage(chatId, '❌ Có lỗi xảy ra. Vui lòng thử lại.');
    }
  });

  // ============ RESCUER COMMANDS ============

  // /register command - Start rescuer registration
  bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      await bot.sendMessage(chatId, '❌ Không thể xác định người dùng.');
      return;
    }

    console.log(`[Telegram] /register command from user ${userId}`);
    await startRegistration(bot, chatId, userId);
  });

  // /wallet command - Link wallet address
  bot.onText(/\/wallet\s*(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const walletAddress = match?.[1]?.trim() || '';

    if (!userId) {
      await bot.sendMessage(chatId, '❌ Không thể xác định người dùng.');
      return;
    }

    console.log(`[Telegram] /wallet command from user ${userId}: ${walletAddress}`);

    if (!walletAddress) {
      await bot.sendMessage(
        chatId,
        '💳 Cách sử dụng: /wallet <địa_chỉ_ví>\n\n' +
        'Ví dụ: /wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f5C000\n\n' +
        'Địa chỉ phải là ví Ethereum (Base Sepolia).'
      );
      return;
    }

    await linkWallet(bot, chatId, userId, walletAddress);
  });

  // /online command - Set rescuer online
  bot.onText(/\/online/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      await bot.sendMessage(chatId, '❌ Không thể xác định người dùng.');
      return;
    }

    console.log(`[Telegram] /online command from user ${userId}`);

    // Check if location was shared
    const location = msg.location ? {
      lat: msg.location.latitude,
      lng: msg.location.longitude,
    } : undefined;

    await setRescuerOnline(bot, chatId, userId, location);
  });

  // /offline command - Set rescuer offline
  bot.onText(/\/offline/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      await bot.sendMessage(chatId, '❌ Không thể xác định người dùng.');
      return;
    }

    console.log(`[Telegram] /offline command from user ${userId}`);
    await setRescuerOffline(bot, chatId, userId);
  });

  // /profile command - Show rescuer profile
  bot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      await bot.sendMessage(chatId, '❌ Không thể xác định người dùng.');
      return;
    }

    console.log(`[Telegram] /profile command from user ${userId}`);
    await showRescuerProfile(bot, chatId, userId);
  });

  // /cancel command - Cancel current registration
  bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    if (isInRegistration(userId)) {
      // Will be handled by registration flow
      await handleRegistrationMessage(bot, chatId, userId, '/cancel');
    } else {
      await bot.sendMessage(chatId, '❓ Không có gì để hủy.');
    }
  });
}

// ============ MESSAGE HANDLERS ============

function registerMessageHandlers(bot: TelegramBot): void {
  // Handle location messages (for rescuer location updates)
  bot.on('location', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId || !msg.location) return;

    console.log(`[Telegram] Received location from user ${userId}`);

    // Update rescuer location if they're registered
    const allRescuers = await store.getAllRescuers();
    const rescuer = allRescuers.find(r => r.telegram_user_id === userId);
    if (rescuer) {
      await store.updateRescuer(rescuer.rescuer_id, {
        location: {
          lat: msg.location.latitude,
          lng: msg.location.longitude,
          last_updated: Date.now(),
        },
      });
      await bot.sendMessage(
        chatId,
        `📍 Đã cập nhật vị trí: ${msg.location.latitude.toFixed(4)}, ${msg.location.longitude.toFixed(4)}`
      );
    }
  });

  // Handle text messages (SOS requests or registration)
  bot.on('message', async (msg) => {
    // Skip commands - already handled by onText
    if (msg.text?.startsWith('/')) return;
    
    // Skip non-text messages (photos, locations handled separately)
    if (!msg.text) return;
    
    // Skip if this is a photo with caption
    if (msg.photo) return;

    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const messageText = msg.text;

    if (!userId) return;

    console.log(`[Telegram] Received message from ${userId}: ${messageText.substring(0, 50)}...`);

    // Check if user is in registration flow
    if (isInRegistration(userId)) {
      console.log(`[Telegram] User ${userId} is in registration flow`);
      const handled = await handleRegistrationMessage(bot, chatId, userId, messageText);
      if (handled) return;
    }

    const userIdStr = userId.toString();

    // Check if user is already being processed (prevent race condition)
    if (processingUsers.has(userIdStr)) {
      console.log(`[Telegram] User ${userIdStr} already has message being processed, skipping`);
      await bot.sendMessage(chatId, '⏳ Tin nhắn trước của bạn đang được xử lý. Vui lòng đợi...');
      return;
    }

    // Check if this is an SOS message
    if (!isSosMessage(messageText)) {
      // Not an SOS message - respond with simple greeting
      console.log(`[Telegram] Non-SOS message detected, sending simple response`);
      await bot.sendMessage(
        chatId,
        `Xin chào! Tôi là bot cứu trợ SOS-Bridge.

Nếu bạn cần cứu trợ khẩn cấp, hãy gửi tin nhắn mô tả tình huống với:
- Địa chỉ/vị trí
- Số điện thoại
- Số người cần cứu

Ví dụ: "Cứu với! Nhà tôi ở xã Hải Thượng bị ngập. Có 2 người mắc kẹt. SĐT: 0909123456"

Gõ /help để xem hướng dẫn chi tiết.
Đội cứu hộ: /register để đăng ký nhận nhiệm vụ.`
      );
      return;
    }

    // Add user to processing set
    processingUsers.add(userIdStr);
    console.log(`[Telegram] Processing SOS message from user ${userIdStr}`);

    // Send "processing" status
    let processingMsg: TelegramBot.Message | null = null;
    try {
      processingMsg = await bot.sendMessage(
        chatId,
        '⏳ Đang xử lý tin nhắn cầu cứu của bạn...',
      );
    } catch (err) {
      console.error('[Telegram] Error sending processing message:', err);
    }

    try {
      // Include telegram user ID in message for ticket linking
      const messageWithUserId = `[TELEGRAM_USER:${userIdStr}] ${messageText}`;
      
      console.log('[Telegram] Running intake workflow with timeout...');
      
      // Run through the intake workflow (Listen + Perceive) with timeout
      const { runner, session } = await createWorkflowRunner('intake', userIdStr);
      const result = await runWorkflowWithTimeout(
        runner.ask(messageWithUserId),
        WORKFLOW_TIMEOUT
      );
      
      console.log('[Telegram] Workflow completed, result type:', typeof result);

      // Delete processing message (ignore errors)
      if (processingMsg) {
        try {
          await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (deleteErr) {
          console.log('[Telegram] Could not delete processing message');
        }
      }

      // Format and send result (without Markdown to avoid parsing issues)
      const formattedResult = formatWorkflowResult(result);
      console.log('[Telegram] Sending result to chat:', chatId);
      
      await bot.sendMessage(chatId, formattedResult, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Xác nhận thông tin đúng', callback_data: 'confirm_sos' },
              { text: '❌ Sửa thông tin', callback_data: 'edit_sos' },
            ],
          ],
        },
      });
      
      console.log('[Telegram] ✅ Response sent successfully!');

      // Check session state for parsed ticket
      const state = session.state as Record<string, unknown>;
      if (state['parsed_ticket_data']) {
        console.log('[Telegram] Ticket data found in session');
      }

    } catch (error) {
      console.error('[Telegram] ❌ Error processing message:', error);
      
      // Delete processing message (ignore errors)
      if (processingMsg) {
        try {
          await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (deleteErr) {
          // Ignore
        }
      }

      const errorMessage = error instanceof Error && error.message === 'Workflow timeout'
        ? '⏱️ Xử lý quá lâu. Vui lòng thử lại sau.'
        : '❌ Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại sau.';

      await bot.sendMessage(chatId, errorMessage);
    } finally {
      // Always remove user from processing set
      processingUsers.delete(userIdStr);
      console.log(`[Telegram] Finished processing for user ${userIdStr}`);
    }
  });
}

// ============ PHOTO HANDLERS ============

function registerPhotoHandlers(bot: TelegramBot): void {
  // Handle photo messages (verification images from rescuers)
  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString() || 'anonymous';
    const caption = msg.caption || '';

    console.log(`[Telegram] Received photo from ${userId} with caption: ${caption}`);

    // Get the largest photo (last in array)
    const photo = msg.photo?.[msg.photo.length - 1];
    if (!photo) {
      await bot.sendMessage(chatId, '❌ Không thể xử lý ảnh. Vui lòng thử lại.');
      return;
    }

    // Send processing status
    let processingMsg: TelegramBot.Message | null = null;
    try {
      processingMsg = await bot.sendMessage(
        chatId,
        '🔍 Đang phân tích ảnh xác nhận cứu hộ...',
      );
    } catch (err) {
      console.error('[Telegram] Error sending processing message:', err);
    }

    try {
      // Get file URL
      const fileLink = await bot.getFileLink(photo.file_id);
      
      // Extract ticket ID from caption (format: "Ticket: SOS_VN_001")
      const ticketIdMatch = caption.match(/ticket[:\s]*([A-Z0-9_]+)/i);
      const ticketId = ticketIdMatch?.[1] || '';

      if (!ticketId) {
        if (processingMsg) {
          await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
        }
        await bot.sendMessage(
          chatId,
          '⚠️ Vui lòng gửi ảnh kèm caption có mã ticket.\nVí dụ: "Ticket: SOS_VN_001"',
        );
        return;
      }

      // Run verify workflow with timeout
      const { runner } = await createWorkflowRunner('verify', userId);
      const verifyMessage = `Xác thực ảnh cứu hộ cho ticket ${ticketId}. URL ảnh: ${fileLink}`;
      const result = await runWorkflowWithTimeout(
        runner.ask(verifyMessage),
        WORKFLOW_TIMEOUT
      );

      // Delete processing message
      if (processingMsg) {
        await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      }

      // Send verification result
      await bot.sendMessage(chatId, formatVerificationResult(result));

    } catch (error) {
      console.error('[Telegram] Error processing photo:', error);
      
      if (processingMsg) {
        await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      }

      const errorMessage = error instanceof Error && error.message === 'Workflow timeout'
        ? '⏱️ Xử lý ảnh quá lâu. Vui lòng thử lại sau.'
        : '❌ Có lỗi xảy ra khi xác thực ảnh. Vui lòng thử lại sau.';

      await bot.sendMessage(chatId, errorMessage);
    }
  });
}

// ============ CALLBACK HANDLERS ============

function registerCallbackHandlers(bot: TelegramBot): void {
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const userId = query.from.id;
    const userIdStr = userId.toString();
    const data = query.data;

    if (!chatId || !data) return;

    // Answer callback query to remove loading state
    await bot.answerCallbackQuery(query.id);

    // Check if this is a registration callback
    if (data.startsWith('vehicle_') || data === 'confirm_registration' || data === 'cancel_registration') {
      const handled = await handleRegistrationCallback(bot, chatId, userId, data);
      if (handled) return;
    }

    // Handle mission callbacks (with ticket ID)
    if (data.startsWith('accept_mission:') || data.startsWith('decline_mission:')) {
      const ticketId = data.split(':')[1];
      if (data.startsWith('accept_mission:')) {
        await handleAcceptMissionById(bot, chatId, userIdStr, ticketId);
      } else {
        await bot.sendMessage(chatId, '❌ Đã từ chối nhiệm vụ. Hệ thống sẽ tìm đội cứu hộ khác.');
      }
      return;
    }

    switch (data) {
      case 'confirm_sos':
        await bot.sendMessage(
          chatId,
          '✅ Đã xác nhận! Hệ thống đang tìm đội cứu hộ gần nhất...\n\nBạn sẽ nhận được thông báo khi có đội cứu hộ nhận nhiệm vụ.',
        );
        // In production: trigger dispatch workflow here
        break;

      case 'edit_sos':
        await bot.sendMessage(
          chatId,
          '📝 Vui lòng gửi lại tin nhắn với thông tin đã chỉnh sửa.',
        );
        break;

      case 'accept_mission':
        await handleAcceptMission(bot, chatId, userIdStr, query.message?.text || '');
        break;

      case 'decline_mission':
        await bot.sendMessage(
          chatId,
          '❌ Đã từ chối nhiệm vụ. Hệ thống sẽ tìm đội cứu hộ khác.',
        );
        break;

      default:
        console.log(`[Telegram] Unknown callback: ${data}`);
    }
  });
}

// ============ NOTIFICATION FUNCTIONS ============

/**
 * Interface for rescuer candidates (from auto-dispatch)
 */
interface RescuerCandidate {
  rescuer_id: string;
  name: string;
  phone: string;
  distance: number;
  vehicle_type: string;
  vehicle_capacity: number;
  rating: number;
  completed_missions: number;
  telegram_user_id?: number;
  wallet_address?: string;
  score: number;
}

/**
 * Send dispatch notifications to multiple rescuers (for auto-dispatch)
 * Gửi thông báo đến nhiều đội cứu hộ cùng lúc
 */
export async function sendDispatchNotifications(
  ticket: {
    ticket_id: string;
    location: { address_text?: string; lat: number; lng: number };
    victim_info: { people_count: number; phone: string };
    priority: number;
  },
  rescuers: RescuerCandidate[],
): Promise<Array<{ rescuer_id: string; success: boolean; error?: string }>> {
  if (!bot) {
    console.error('[Telegram] Bot not initialized for dispatch notifications');
    return rescuers.map(r => ({
      rescuer_id: r.rescuer_id,
      success: false,
      error: 'Bot not initialized',
    }));
  }

  console.log(`[Telegram] Sending dispatch notifications to ${rescuers.length} rescuers for ticket ${ticket.ticket_id}`);

  // Tính thù lao dựa trên priority
  const baseReward = 20;
  const priorityBonus = (ticket.priority - 1) * 5; // Priority 5 = +20 USDC
  const reward = baseReward + priorityBonus;

  // Tạo danh sách promises để gửi song song
  const notificationPromises = rescuers
    .filter(r => r.telegram_user_id) // Chỉ gửi cho rescuers có Telegram ID
    .map(async (rescuer) => {
      try {
        const priorityEmoji = getPriorityEmoji(ticket.priority);
        
        const message = `
🚨 ${priorityEmoji} NHIỆM VỤ CỨU HỘ MỚI!

📍 Địa điểm: ${ticket.location.address_text || `${ticket.location.lat.toFixed(4)}, ${ticket.location.lng.toFixed(4)}`}
📏 Khoảng cách: ${rescuer.distance.toFixed(1)} km từ bạn
👥 Số người cần cứu: ${ticket.victim_info.people_count}
💰 Thù lao: ${reward} USDC
⚡ Mức độ: ${ticket.priority}/5

📋 Mã ticket: ${ticket.ticket_id}

⏰ Ai nhận trước sẽ được giao nhiệm vụ!
        `.trim();

        await bot!.sendMessage(rescuer.telegram_user_id!, message, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ NHẬN NHIỆM VỤ', callback_data: `accept_mission:${ticket.ticket_id}` },
                { text: '❌ Từ chối', callback_data: `decline_mission:${ticket.ticket_id}` },
              ],
            ],
          },
        });

        console.log(`[Telegram] ✅ Sent notification to ${rescuer.name} (${rescuer.telegram_user_id})`);
        return { rescuer_id: rescuer.rescuer_id, success: true };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Telegram] ❌ Failed to notify ${rescuer.name}:`, errorMsg);
        return { rescuer_id: rescuer.rescuer_id, success: false, error: errorMsg };
      }
    });

  // Chờ tất cả notifications hoàn thành
  const results = await Promise.all(notificationPromises);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`[Telegram] Dispatch notifications: ${successCount}/${rescuers.length} sent successfully`);

  return results;
}

/**
 * Get priority emoji
 */
function getPriorityEmoji(priority: number): string {
  const emojis: Record<number, string> = {
    1: '🟢',
    2: '🟡',
    3: '🟠',
    4: '🔴',
    5: '🚨',
  };
  return emojis[priority] || '⚪';
}

/**
 * Send notification to a rescuer about new mission
 */
export async function notifyRescuerNewMission(
  rescuerTelegramId: number,
  ticketId: string,
  distance: number,
  victimCount: number,
  address: string,
  reward: number = 20,
): Promise<boolean> {
  if (!bot) {
    console.error('[Telegram] Bot not initialized');
    return false;
  }

  try {
    const message = `
🚨 CÓ NHIỆM VỤ MỚI!

📍 Địa điểm: ${address}
📏 Khoảng cách: ${distance.toFixed(1)} km
👥 Số người cần cứu: ${victimCount}
💰 Thù lao: ${reward} USDC

Mã ticket: ${ticketId}
    `.trim();

    await bot.sendMessage(rescuerTelegramId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ NHẬN NHIỆM VỤ', callback_data: `accept_mission:${ticketId}` },
            { text: '❌ Từ chối', callback_data: `decline_mission:${ticketId}` },
          ],
        ],
      },
    });

    console.log(`[Telegram] Sent mission notification to rescuer ${rescuerTelegramId}`);
    return true;
  } catch (error) {
    console.error('[Telegram] Error sending notification:', error);
    return false;
  }
}

/**
 * Send notification to victim about rescue status
 */
export async function notifyVictimStatus(
  victimTelegramId: number,
  ticketId: string,
  status: string,
  rescuerName?: string,
  eta?: number,
): Promise<boolean> {
  if (!bot) {
    console.error('[Telegram] Bot not initialized');
    return false;
  }

  try {
    let message = '';

    switch (status) {
      case 'ASSIGNED':
        message = `
✅ Tin tốt!

Đã tìm được đội cứu hộ cho yêu cầu của bạn.

👤 Đội cứu hộ: ${rescuerName || 'N/A'}
⏱️ Thời gian dự kiến: ${eta || 'N/A'} phút
📋 Mã ticket: ${ticketId}

Hãy giữ liên lạc và chờ đợi ở vị trí an toàn!
        `.trim();
        break;

      case 'COMPLETED':
        message = `
🎉 Nhiệm vụ hoàn thành!

Đội cứu hộ đã xác nhận đã tiếp cận và hỗ trợ bạn thành công.

📋 Mã ticket: ${ticketId}

Cảm ơn bạn đã sử dụng SOS-Bridge. Chúc bạn bình an!
        `.trim();
        break;

      default:
        message = `📋 Ticket ${ticketId}: Trạng thái đã cập nhật thành ${status}`;
    }

    await bot.sendMessage(victimTelegramId, message);
    return true;
  } catch (error) {
    console.error('[Telegram] Error sending victim notification:', error);
    return false;
  }
}

/**
 * Send completion notification with transaction details
 */
export async function notifyRewardSent(
  rescuerTelegramId: number,
  ticketId: string,
  amount: number,
  txHash: string,
): Promise<boolean> {
  if (!bot) {
    console.error('[Telegram] Bot not initialized');
    return false;
  }

  try {
    const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;
    
    const message = `
💰 Đã nhận thưởng!

Cảm ơn bạn đã hoàn thành nhiệm vụ cứu hộ!

📋 Ticket: ${ticketId}
💵 Số tiền: ${amount} USDC
🔗 TX Hash: ${txHash.substring(0, 20)}...

Xem giao dịch: ${explorerUrl}
    `.trim();

    await bot.sendMessage(rescuerTelegramId, message, {
      disable_web_page_preview: true,
    });

    return true;
  } catch (error) {
    console.error('[Telegram] Error sending reward notification:', error);
    return false;
  }
}

// ============ HELPER FUNCTIONS ============

async function handleAcceptMission(
  bot: TelegramBot,
  chatId: number,
  userId: string,
  messageText: string,
): Promise<void> {
  // Extract ticket ID from message
  const ticketIdMatch = messageText.match(/ticket[:\s]*([A-Z0-9_]+)/i);
  const ticketId = ticketIdMatch?.[1];

  if (!ticketId) {
    await bot.sendMessage(chatId, '❌ Không tìm thấy mã ticket.');
    return;
  }

  await handleAcceptMissionById(bot, chatId, userId, ticketId);
}

async function handleAcceptMissionById(
  bot: TelegramBot,
  chatId: number,
  userId: string,
  ticketId: string,
): Promise<void> {
  console.log(`[Telegram] User ${userId} trying to accept mission ${ticketId}`);

  // Find rescuer by telegram user ID
  const allRescuers = await store.getAllRescuers();
  const rescuer = allRescuers.find(
    r => r.telegram_user_id === parseInt(userId)
  );

  if (!rescuer) {
    await bot.sendMessage(
      chatId,
      '❌ Bạn chưa đăng ký làm đội cứu hộ.\n\nVui lòng đăng ký với /register trước.'
    );
    return;
  }

  // Check if rescuer has wallet
  if (!rescuer.wallet_address) {
    await bot.sendMessage(
      chatId,
      '⚠️ Bạn chưa thiết lập ví nhận thưởng.\n\n' +
      'Vui lòng thiết lập ví trước khi nhận nhiệm vụ: /wallet <địa_chỉ>'
    );
    return;
  }

  // Import và sử dụng assignRescuerToTicket để xử lý race condition
  // Đảm bảo chỉ 1 rescuer được gán cho ticket
  try {
    const { assignRescuerToTicket } = await import('../services/auto-dispatch.js');
    const result = await assignRescuerToTicket(ticketId, rescuer.rescuer_id);

    if (!result.success) {
      // Ticket đã được người khác nhận hoặc có lỗi
      console.log(`[Telegram] Assignment failed for ${rescuer.name}: ${result.message}`);
      await bot.sendMessage(chatId, `⚠️ ${result.message}`);
      return;
    }

    // Lấy thông tin ticket sau khi đã assign
    const ticket = result.ticket!;

    await bot.sendMessage(
      chatId,
      `✅ Đã nhận nhiệm vụ ${ticketId}!\n\n` +
      `📍 Địa điểm: ${ticket.location.address_text || 'N/A'}\n` +
      `📞 SĐT nạn nhân: ${ticket.victim_info.phone}\n` +
      `👥 Số người: ${ticket.victim_info.people_count}\n\n` +
      `Hãy di chuyển đến địa điểm và gửi ảnh xác nhận khi hoàn thành.\n\n` +
      `📸 Gửi ảnh kèm caption: "Ticket: ${ticketId}"`
    );

    console.log(`[Telegram] ✅ Rescuer ${rescuer.rescuer_id} (${rescuer.name}) accepted mission ${ticketId}`);

    // Thông báo cho nạn nhân (nếu có telegram ID)
    const victimTgId = extractTelegramUserId(ticket.raw_message || '');
    if (victimTgId) {
      try {
        await notifyVictimStatus(
          victimTgId,
          ticketId,
          'ASSIGNED',
          rescuer.name,
          Math.ceil(rescuer.location?.last_updated ? 10 : 15) // ETA estimate
        );
      } catch (notifyErr) {
        console.error('[Telegram] Could not notify victim:', notifyErr);
      }
    }

  } catch (error) {
    console.error('[Telegram] Error accepting mission:', error);
    await bot.sendMessage(chatId, '❌ Có lỗi xảy ra. Vui lòng thử lại.');
  }
}

/**
 * Extract Telegram user ID from raw message
 */
function extractTelegramUserId(rawMessage: string): number | null {
  // Try [TG:userId] format
  const tgMatch = rawMessage.match(/\[TG:(\d+)\]/);
  if (tgMatch) {
    return parseInt(tgMatch[1]);
  }
  
  // Try [TELEGRAM_USER:userId] format
  const telegramMatch = rawMessage.match(/\[TELEGRAM_USER:(\d+)\]/);
  if (telegramMatch) {
    return parseInt(telegramMatch[1]);
  }
  
  return null;
}

function formatWorkflowResult(result: unknown): string {
  const resultStr = String(result);
  
  // Simple formatting without Markdown to avoid parsing issues
  let formatted = '📋 Kết quả xử lý:\n\n';
  formatted += resultStr;
  
  return formatted;
}

function formatVerificationResult(result: unknown): string {
  const resultStr = String(result);
  
  let formatted = '🔍 Kết quả xác thực:\n\n';
  formatted += resultStr;
  
  return formatted;
}

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    OPEN: '🆕',
    ASSIGNED: '👤',
    IN_PROGRESS: '🚀',
    VERIFIED: '✅',
    COMPLETED: '🎉',
    CANCELLED: '❌',
  };
  return emojis[status] || '❓';
}

// Export types
export type { TelegramBot };
