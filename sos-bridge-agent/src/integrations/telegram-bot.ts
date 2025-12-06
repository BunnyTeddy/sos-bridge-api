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
import {
  messages,
  t,
  getUserLanguage,
  setUserLanguage,
  isValidLanguage,
  Language,
} from '../i18n/index.js';

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
    const userId = msg.from?.id?.toString() || '';
    const userName = msg.from?.first_name || 'bạn';
    const lang = getUserLanguage(userId);

    const welcomeMessage = t('welcome', lang)(userName);
    await bot.sendMessage(chatId, welcomeMessage);
  });

  // /lang command - Change language
  bot.onText(/\/lang\s*(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id?.toString() || '';
    const newLang = match?.[1]?.trim().toLowerCase() || '';
    const currentLang = getUserLanguage(userId);

    if (!newLang) {
      // Show current language and options
      await bot.sendMessage(chatId, t('langCommand', currentLang));
      return;
    }

    if (!isValidLanguage(newLang)) {
      await bot.sendMessage(chatId, t('langInvalid', currentLang));
      return;
    }

    setUserLanguage(userId, newLang as Language);
    await bot.sendMessage(chatId, t('langChanged', newLang as Language));
  });

  // /help command
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id?.toString() || '';
    const lang = getUserLanguage(userId);

    await bot.sendMessage(chatId, t('help', lang));
  });

  // /status command
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id?.toString() || '';
    const lang = getUserLanguage(userId);
    const stats = await store.getStats();

    const statusMessage = t('status', lang)(stats);
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

      const lang = getUserLanguage(userId);

      if (userTickets.length === 0) {
        await bot.sendMessage(chatId, t('noTickets', lang));
        return;
      }

      let message = t('ticketListHeader', lang);
      
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
      const lang = getUserLanguage(userId);
      await bot.sendMessage(chatId, t('genericError', lang));
    }
  });

  // ============ RESCUER COMMANDS ============

  // /register command - Start rescuer registration
  bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      const lang = getUserLanguage(msg.from?.id?.toString() || '');
      await bot.sendMessage(chatId, t('userNotFound', lang));
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
    const lang = getUserLanguage(userId?.toString() || '');

    if (!userId) {
      await bot.sendMessage(chatId, t('userNotFound', lang));
      return;
    }

    console.log(`[Telegram] /wallet command from user ${userId}: ${walletAddress}`);

    if (!walletAddress) {
      await bot.sendMessage(chatId, t('walletUsage', lang));
      return;
    }

    await linkWallet(bot, chatId, userId, walletAddress);
  });

  // /online command - Set rescuer online
  bot.onText(/\/online/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const lang = getUserLanguage(userId?.toString() || '');

    if (!userId) {
      await bot.sendMessage(chatId, t('userNotFound', lang));
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
    const lang = getUserLanguage(userId?.toString() || '');

    if (!userId) {
      await bot.sendMessage(chatId, t('userNotFound', lang));
      return;
    }

    console.log(`[Telegram] /offline command from user ${userId}`);
    await setRescuerOffline(bot, chatId, userId);
  });

  // /profile command - Show rescuer profile
  bot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const lang = getUserLanguage(userId?.toString() || '');

    if (!userId) {
      await bot.sendMessage(chatId, t('userNotFound', lang));
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
      const lang = getUserLanguage(userId.toString());
      await bot.sendMessage(chatId, t('nothingToCancel', lang));
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
      const lang = getUserLanguage(userId.toString());
      await bot.sendMessage(
        chatId,
        t('locationUpdated', lang)(msg.location.latitude, msg.location.longitude)
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

    const lang = getUserLanguage(userIdStr);

    // Check if user is already being processed (prevent race condition)
    if (processingUsers.has(userIdStr)) {
      console.log(`[Telegram] User ${userIdStr} already has message being processed, skipping`);
      await bot.sendMessage(chatId, t('alreadyProcessing', lang));
      return;
    }

    // Check if this is an SOS message
    if (!isSosMessage(messageText)) {
      // Not an SOS message - respond with simple greeting
      console.log(`[Telegram] Non-SOS message detected, sending simple response`);
      await bot.sendMessage(chatId, t('nonSosResponse', lang));
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
        t('processingMessage', lang),
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
      const formattedResult = formatWorkflowResult(result, lang);
      console.log('[Telegram] Sending result to chat:', chatId);
      
      await bot.sendMessage(chatId, formattedResult, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: t('confirmButton', lang), callback_data: 'confirm_sos' },
              { text: t('editButton', lang), callback_data: 'edit_sos' },
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
        ? t('workflowTimeout', lang)
        : t('processingError', lang);

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
    const lang = getUserLanguage(userId);

    console.log(`[Telegram] Received photo from ${userId} with caption: ${caption}`);

    // Get the largest photo (last in array)
    const photo = msg.photo?.[msg.photo.length - 1];
    if (!photo) {
      await bot.sendMessage(chatId, t('photoError', lang));
      return;
    }

    // Send processing status
    let processingMsg: TelegramBot.Message | null = null;
    try {
      processingMsg = await bot.sendMessage(
        chatId,
        t('processingPhoto', lang),
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
        await bot.sendMessage(chatId, t('photoMissingTicket', lang));
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
      await bot.sendMessage(chatId, formatVerificationResult(result, lang));

    } catch (error) {
      console.error('[Telegram] Error processing photo:', error);
      
      if (processingMsg) {
        await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      }

      const errorMessage = error instanceof Error && error.message === 'Workflow timeout'
        ? t('photoTimeout', lang)
        : t('photoVerifyError', lang);

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
    const lang = getUserLanguage(userIdStr);

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
        await bot.sendMessage(chatId, t('declinedMission', lang));
      }
      return;
    }

    switch (data) {
      case 'confirm_sos':
        await bot.sendMessage(chatId, t('confirmSos', lang));
        // In production: trigger dispatch workflow here
        break;

      case 'edit_sos':
        await bot.sendMessage(chatId, t('editSos', lang));
        break;

      case 'accept_mission':
        await handleAcceptMission(bot, chatId, userIdStr, query.message?.text || '');
        break;

      case 'decline_mission':
        await bot.sendMessage(chatId, t('declinedMission', lang));
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
        const lang = getUserLanguage(rescuer.telegram_user_id!.toString());
        const address = ticket.location.address_text || `${ticket.location.lat.toFixed(4)}, ${ticket.location.lng.toFixed(4)}`;
        
        const message = t('newMission', lang)(
          priorityEmoji,
          address,
          rescuer.distance,
          ticket.victim_info.people_count,
          reward,
          ticket.ticket_id
        );

        await bot!.sendMessage(rescuer.telegram_user_id!, message, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: t('acceptMissionButton', lang), callback_data: `accept_mission:${ticket.ticket_id}` },
                { text: t('declineMissionButton', lang), callback_data: `decline_mission:${ticket.ticket_id}` },
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
    const lang = getUserLanguage(rescuerTelegramId.toString());
    const message = t('newMission', lang)('🚨', address, distance, victimCount, reward, ticketId);

    await bot.sendMessage(rescuerTelegramId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t('acceptMissionButton', lang), callback_data: `accept_mission:${ticketId}` },
            { text: t('declineMissionButton', lang), callback_data: `decline_mission:${ticketId}` },
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
    const lang = getUserLanguage(victimTelegramId.toString());
    let message = '';

    switch (status) {
      case 'ASSIGNED':
        message = t('victimAssigned', lang)(rescuerName || 'N/A', eta || 15, ticketId);
        break;

      case 'COMPLETED':
        message = t('victimCompleted', lang)(ticketId);
        break;

      default:
        message = `📋 Ticket ${ticketId}: ${status}`;
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
    const lang = getUserLanguage(rescuerTelegramId.toString());
    
    const message = t('rewardSent', lang)(ticketId, amount, txHash, explorerUrl);

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
  const lang = getUserLanguage(userId);

  if (!ticketId) {
    await bot.sendMessage(chatId, t('ticketNotFound', lang));
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
  const lang = getUserLanguage(userId);

  // Find rescuer by telegram user ID
  const allRescuers = await store.getAllRescuers();
  const rescuer = allRescuers.find(
    r => r.telegram_user_id === parseInt(userId)
  );

  if (!rescuer) {
    await bot.sendMessage(chatId, t('notRegistered', lang));
    return;
  }

  // Check if rescuer has wallet
  if (!rescuer.wallet_address) {
    await bot.sendMessage(chatId, t('noWallet', lang));
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

    const acceptedMessage = t('missionAccepted', lang)(
      ticketId,
      ticket.location.address_text || 'N/A',
      ticket.victim_info.phone,
      ticket.victim_info.people_count
    );
    await bot.sendMessage(chatId, acceptedMessage);

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
    await bot.sendMessage(chatId, t('genericError', lang));
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

function formatWorkflowResult(result: unknown, lang: Language = 'vi'): string {
  const resultStr = String(result);
  
  // Simple formatting without Markdown to avoid parsing issues
  let formatted = t('workflowResult', lang);
  formatted += resultStr;
  
  return formatted;
}

function formatVerificationResult(result: unknown, lang: Language = 'vi'): string {
  const resultStr = String(result);
  
  let formatted = t('verificationResult', lang);
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
