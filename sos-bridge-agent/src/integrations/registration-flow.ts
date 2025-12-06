/**
 * Registration Flow
 * Multi-step registration wizard for rescuers via Telegram
 */

import type TelegramBot from 'node-telegram-bot-api';
import { ethers } from 'ethers';
import { store } from '../store/index.js';
import { 
  createRescuer, 
  type VehicleType, 
  VEHICLE_TYPE_NAMES,
  getVehicleTypeFromName,
} from '../models/rescuer.js';

// ============ REGISTRATION STATE ============

export type RegistrationStep = 
  | 'idle'
  | 'awaiting_name'
  | 'awaiting_phone'
  | 'awaiting_vehicle_type'
  | 'awaiting_vehicle_capacity'
  | 'awaiting_location'
  | 'awaiting_confirmation';

export interface RegistrationState {
  step: RegistrationStep;
  userId: number;
  chatId: number;
  data: {
    name?: string;
    phone?: string;
    vehicle_type?: VehicleType;
    vehicle_capacity?: number;
    location?: { lat: number; lng: number };
  };
  startedAt: number;
  lastUpdatedAt: number;
}

// Registration sessions (in-memory, keyed by telegram user ID)
const registrationSessions = new Map<number, RegistrationState>();

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// ============ SESSION MANAGEMENT ============

/**
 * Get or create registration session
 */
export function getRegistrationSession(userId: number, chatId: number): RegistrationState {
  let session = registrationSessions.get(userId);
  
  // Check if session expired
  if (session && Date.now() - session.lastUpdatedAt > SESSION_TIMEOUT) {
    registrationSessions.delete(userId);
    session = undefined;
  }
  
  if (!session) {
    session = {
      step: 'idle',
      userId,
      chatId,
      data: {},
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };
    registrationSessions.set(userId, session);
  }
  
  return session;
}

/**
 * Update registration session
 */
export function updateRegistrationSession(
  userId: number, 
  updates: Partial<RegistrationState>
): RegistrationState {
  const session = registrationSessions.get(userId);
  if (!session) {
    throw new Error('No registration session found');
  }
  
  Object.assign(session, updates, { lastUpdatedAt: Date.now() });
  return session;
}

/**
 * Clear registration session
 */
export function clearRegistrationSession(userId: number): void {
  registrationSessions.delete(userId);
}

/**
 * Check if user is in registration process
 */
export function isInRegistration(userId: number): boolean {
  const session = registrationSessions.get(userId);
  return session !== undefined && session.step !== 'idle';
}

// ============ REGISTRATION HANDLERS ============

/**
 * Start registration flow
 */
export async function startRegistration(
  bot: TelegramBot,
  chatId: number,
  userId: number
): Promise<void> {
  // Check if already registered
  const allRescuers = await store.getAllRescuers();
  const existingRescuer = allRescuers.find(
    r => r.telegram_user_id === userId
  );
  
  if (existingRescuer) {
    await bot.sendMessage(
      chatId,
      `✅ Bạn đã đăng ký với tên: ${existingRescuer.name}\n\n` +
      `Sử dụng /profile để xem thông tin\n` +
      `Sử dụng /wallet để cập nhật địa chỉ ví`
    );
    return;
  }
  
  // Initialize session
  const session = getRegistrationSession(userId, chatId);
  session.step = 'awaiting_name';
  session.data = {};
  
  await bot.sendMessage(
    chatId,
    `🚀 BẮT ĐẦU ĐĂNG KÝ ĐỘI CỨU HỘ\n\n` +
    `Bạn sẽ được hỏi một số thông tin cơ bản.\n` +
    `Gõ /cancel bất cứ lúc nào để hủy.\n\n` +
    `📝 Bước 1/5: Vui lòng nhập TÊN của bạn hoặc đội cứu hộ:`
  );
}

/**
 * Handle registration message based on current step
 */
export async function handleRegistrationMessage(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  message: string
): Promise<boolean> {
  const session = registrationSessions.get(userId);
  
  if (!session || session.step === 'idle') {
    return false; // Not in registration
  }
  
  // Handle cancel
  if (message.toLowerCase() === '/cancel') {
    clearRegistrationSession(userId);
    await bot.sendMessage(chatId, '❌ Đã hủy đăng ký.');
    return true;
  }
  
  // Process based on current step
  switch (session.step) {
    case 'awaiting_name':
      return await handleNameStep(bot, chatId, userId, message);
    case 'awaiting_phone':
      return await handlePhoneStep(bot, chatId, userId, message);
    case 'awaiting_vehicle_type':
      return await handleVehicleTypeStep(bot, chatId, userId, message);
    case 'awaiting_vehicle_capacity':
      return await handleCapacityStep(bot, chatId, userId, message);
    case 'awaiting_confirmation':
      return await handleConfirmationStep(bot, chatId, userId, message);
    default:
      return false;
  }
}

/**
 * Handle callback queries during registration
 */
export async function handleRegistrationCallback(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  data: string
): Promise<boolean> {
  const session = registrationSessions.get(userId);
  
  if (!session || session.step === 'idle') {
    return false;
  }
  
  // Handle vehicle type selection
  if (data.startsWith('vehicle_')) {
    const vehicleType = data.replace('vehicle_', '') as VehicleType;
    session.data.vehicle_type = vehicleType;
    session.step = 'awaiting_vehicle_capacity';
    
    await bot.sendMessage(
      chatId,
      `✅ Đã chọn: ${VEHICLE_TYPE_NAMES[vehicleType]}\n\n` +
      `📝 Bước 4/5: Phương tiện của bạn chở được tối đa BAO NHIÊU NGƯỜI?\n` +
      `(Nhập số, ví dụ: 5)`
    );
    return true;
  }
  
  // Handle confirmation
  if (data === 'confirm_registration') {
    return await completeRegistration(bot, chatId, userId);
  }
  
  if (data === 'cancel_registration') {
    clearRegistrationSession(userId);
    await bot.sendMessage(chatId, '❌ Đã hủy đăng ký.');
    return true;
  }
  
  return false;
}

// ============ STEP HANDLERS ============

async function handleNameStep(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  message: string
): Promise<boolean> {
  const name = message.trim();
  
  if (name.length < 2 || name.length > 100) {
    await bot.sendMessage(chatId, '⚠️ Tên phải từ 2-100 ký tự. Vui lòng nhập lại:');
    return true;
  }
  
  const session = registrationSessions.get(userId)!;
  session.data.name = name;
  session.step = 'awaiting_phone';
  
  await bot.sendMessage(
    chatId,
    `✅ Tên: ${name}\n\n` +
    `📝 Bước 2/5: Vui lòng nhập SỐ ĐIỆN THOẠI liên hệ:\n` +
    `(Ví dụ: 0909123456)`
  );
  
  return true;
}

async function handlePhoneStep(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  message: string
): Promise<boolean> {
  // Normalize phone number
  let phone = message.trim().replace(/[\s.-]/g, '');
  
  // Convert to format with leading 0
  if (phone.startsWith('+84')) {
    phone = '0' + phone.substring(3);
  } else if (phone.startsWith('84') && phone.length === 11) {
    phone = '0' + phone.substring(2);
  }
  
  // Validate Vietnam phone number
  if (!/^0[0-9]{9}$/.test(phone)) {
    await bot.sendMessage(
      chatId,
      '⚠️ Số điện thoại không hợp lệ.\n' +
      'Vui lòng nhập số điện thoại Việt Nam (10 số, bắt đầu bằng 0):'
    );
    return true;
  }
  
  const session = registrationSessions.get(userId)!;
  session.data.phone = phone;
  session.step = 'awaiting_vehicle_type';
  
  // Send vehicle type selection with inline keyboard
  await bot.sendMessage(
    chatId,
    `✅ SĐT: ${phone}\n\n` +
    `📝 Bước 3/5: Chọn LOẠI PHƯƠNG TIỆN của bạn:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🚤 Ca nô', callback_data: 'vehicle_cano' },
            { text: '⛵ Thuyền', callback_data: 'vehicle_boat' },
          ],
          [
            { text: '🛶 Kayak', callback_data: 'vehicle_kayak' },
            { text: '🏊 Bè mảng', callback_data: 'vehicle_raft' },
          ],
          [
            { text: '🔧 Khác', callback_data: 'vehicle_other' },
          ],
        ],
      },
    }
  );
  
  return true;
}

async function handleVehicleTypeStep(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  message: string
): Promise<boolean> {
  // Try to parse vehicle type from text if user types instead of clicking
  const vehicleType = getVehicleTypeFromName(message);
  
  if (!vehicleType) {
    await bot.sendMessage(
      chatId,
      '⚠️ Vui lòng chọn loại phương tiện bằng cách nhấn vào các nút ở trên.',
    );
    return true;
  }
  
  const session = registrationSessions.get(userId)!;
  session.data.vehicle_type = vehicleType;
  session.step = 'awaiting_vehicle_capacity';
  
  await bot.sendMessage(
    chatId,
    `✅ Đã chọn: ${VEHICLE_TYPE_NAMES[vehicleType]}\n\n` +
    `📝 Bước 4/5: Phương tiện của bạn chở được tối đa BAO NHIÊU NGƯỜI?\n` +
    `(Nhập số, ví dụ: 5)`
  );
  
  return true;
}

async function handleCapacityStep(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  message: string
): Promise<boolean> {
  const capacity = parseInt(message.trim());
  
  if (isNaN(capacity) || capacity < 1 || capacity > 50) {
    await bot.sendMessage(
      chatId,
      '⚠️ Số người phải từ 1-50. Vui lòng nhập lại:'
    );
    return true;
  }
  
  const session = registrationSessions.get(userId)!;
  session.data.vehicle_capacity = capacity;
  session.step = 'awaiting_confirmation';
  
  // Default location (center of Quang Tri)
  session.data.location = { lat: 16.7654, lng: 107.1234 };
  
  // Show confirmation
  await bot.sendMessage(
    chatId,
    `📝 Bước 5/5: XÁC NHẬN THÔNG TIN\n\n` +
    `👤 Tên: ${session.data.name}\n` +
    `📞 SĐT: ${session.data.phone}\n` +
    `🚤 Phương tiện: ${VEHICLE_TYPE_NAMES[session.data.vehicle_type!]}\n` +
    `👥 Sức chở: ${capacity} người\n\n` +
    `Thông tin đã chính xác chưa?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Xác nhận đăng ký', callback_data: 'confirm_registration' },
          ],
          [
            { text: '❌ Hủy và làm lại', callback_data: 'cancel_registration' },
          ],
        ],
      },
    }
  );
  
  return true;
}

async function handleConfirmationStep(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  message: string
): Promise<boolean> {
  // User typed instead of clicking button
  const lower = message.toLowerCase();
  
  if (lower.includes('xác nhận') || lower === 'ok' || lower === 'yes' || lower === 'có') {
    return await completeRegistration(bot, chatId, userId);
  }
  
  if (lower.includes('hủy') || lower === 'no' || lower === 'không') {
    clearRegistrationSession(userId);
    await bot.sendMessage(chatId, '❌ Đã hủy đăng ký. Gõ /register để bắt đầu lại.');
    return true;
  }
  
  await bot.sendMessage(
    chatId,
    '⚠️ Vui lòng nhấn nút "Xác nhận đăng ký" hoặc "Hủy và làm lại".'
  );
  
  return true;
}

/**
 * Complete registration and save rescuer
 */
async function completeRegistration(
  bot: TelegramBot,
  chatId: number,
  userId: number
): Promise<boolean> {
  const session = registrationSessions.get(userId);
  
  if (!session || !session.data.name || !session.data.phone || !session.data.vehicle_type) {
    await bot.sendMessage(chatId, '❌ Thiếu thông tin. Vui lòng bắt đầu lại với /register');
    clearRegistrationSession(userId);
    return true;
  }
  
  try {
    // Create rescuer
    const rescuer = createRescuer({
      name: session.data.name,
      phone: session.data.phone,
      vehicle_type: session.data.vehicle_type,
      vehicle_capacity: session.data.vehicle_capacity || 2,
      location: session.data.location || { lat: 16.7654, lng: 107.1234 },
      telegram_user_id: userId,
      telegram_chat_id: chatId,
      registration_status: 'pending',
    });
    
    // Save to store
    await store.addRescuer(rescuer);
    
    // Clear session
    clearRegistrationSession(userId);
    
    // Send success message
    await bot.sendMessage(
      chatId,
      `🎉 ĐĂNG KÝ THÀNH CÔNG!\n\n` +
      `ID của bạn: ${rescuer.rescuer_id}\n\n` +
      `Để nhận nhiệm vụ cứu hộ, bạn cần:\n` +
      `1. 💳 Thiết lập ví nhận thưởng: /wallet <địa_chỉ>\n` +
      `2. 🟢 Bật trạng thái online: /online\n\n` +
      `Các lệnh khác:\n` +
      `• /profile - Xem thông tin cá nhân\n` +
      `• /offline - Tắt nhận nhiệm vụ\n\n` +
      `Cảm ơn bạn đã tham gia đội cứu hộ! 🙏`
    );
    
    console.log(`[Registration] New rescuer registered: ${rescuer.rescuer_id} (${rescuer.name})`);
    
    return true;
    
  } catch (error) {
    console.error('[Registration] Error:', error);
    await bot.sendMessage(chatId, '❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
    clearRegistrationSession(userId);
    return true;
  }
}

// ============ WALLET LINKING ============

/**
 * Link wallet address to rescuer
 */
export async function linkWallet(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  walletAddress: string
): Promise<void> {
  // Find rescuer
  const allRescuers = await store.getAllRescuers();
  const rescuer = allRescuers.find(r => r.telegram_user_id === userId);
  
  if (!rescuer) {
    await bot.sendMessage(
      chatId,
      '❌ Bạn chưa đăng ký. Vui lòng đăng ký trước với /register'
    );
    return;
  }
  
  // Validate wallet address
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    await bot.sendMessage(
      chatId,
      '❌ Địa chỉ ví không hợp lệ.\n\n' +
      'Định dạng đúng: 0x... (42 ký tự)\n' +
      'Ví dụ: /wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f5C000'
    );
    return;
  }
  
  const checksummed = ethers.getAddress(walletAddress);
  
  // Update rescuer
  await store.updateRescuer(rescuer.rescuer_id, { wallet_address: checksummed });
  
  await bot.sendMessage(
    chatId,
    `✅ Đã liên kết ví thành công!\n\n` +
    `💳 Địa chỉ: ${checksummed}\n` +
    `🌐 Network: Base Sepolia\n\n` +
    `Tiền thưởng từ các nhiệm vụ sẽ được chuyển vào ví này.\n` +
    `Xem ví trên: https://sepolia.basescan.org/address/${checksummed}`
  );
  
  console.log(`[Registration] Wallet linked for ${rescuer.rescuer_id}: ${checksummed}`);
}

// ============ STATUS MANAGEMENT ============

/**
 * Set rescuer online status
 */
export async function setRescuerOnline(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  location?: { lat: number; lng: number }
): Promise<void> {
  const allRescuers = await store.getAllRescuers();
  const rescuer = allRescuers.find(r => r.telegram_user_id === userId);
  
  if (!rescuer) {
    await bot.sendMessage(
      chatId,
      '❌ Bạn chưa đăng ký. Vui lòng đăng ký trước với /register'
    );
    return;
  }
  
  // Update status and location
  const updates: Record<string, unknown> = { status: 'ONLINE' };
  
  if (location) {
    updates.location = {
      lat: location.lat,
      lng: location.lng,
      last_updated: Date.now(),
    };
  }
  
  await store.updateRescuer(rescuer.rescuer_id, updates);
  
  const locationText = location 
    ? `📍 Vị trí: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}\n`
    : '📍 Vị trí: (Chưa cập nhật - Chia sẻ vị trí để cập nhật)\n';
  
  await bot.sendMessage(
    chatId,
    `🟢 BẬT CHẾ ĐỘ NHẬN NHIỆM VỤ\n\n` +
    `${locationText}` +
    `\nBạn sẽ nhận được thông báo khi có nhiệm vụ cứu hộ gần đây.\n\n` +
    `Để tắt, gõ /offline`
  );
  
  console.log(`[Registration] Rescuer ${rescuer.rescuer_id} is now ONLINE`);
}

/**
 * Set rescuer offline status
 */
export async function setRescuerOffline(
  bot: TelegramBot,
  chatId: number,
  userId: number
): Promise<void> {
  const allRescuers = await store.getAllRescuers();
  const rescuer = allRescuers.find(r => r.telegram_user_id === userId);
  
  if (!rescuer) {
    await bot.sendMessage(
      chatId,
      '❌ Bạn chưa đăng ký. Vui lòng đăng ký trước với /register'
    );
    return;
  }
  
  await store.updateRescuer(rescuer.rescuer_id, { status: 'OFFLINE' });
  
  await bot.sendMessage(
    chatId,
    `🔴 TẮT CHẾ ĐỘ NHẬN NHIỆM VỤ\n\n` +
    `Bạn sẽ không nhận được thông báo nhiệm vụ mới.\n\n` +
    `Để bật lại, gõ /online`
  );
  
  console.log(`[Registration] Rescuer ${rescuer.rescuer_id} is now OFFLINE`);
}

/**
 * Get rescuer profile
 */
export async function showRescuerProfile(
  bot: TelegramBot,
  chatId: number,
  userId: number
): Promise<void> {
  const allRescuers = await store.getAllRescuers();
  const rescuer = allRescuers.find(r => r.telegram_user_id === userId);
  
  if (!rescuer) {
    await bot.sendMessage(
      chatId,
      '❌ Bạn chưa đăng ký. Vui lòng đăng ký trước với /register'
    );
    return;
  }
  
  // Get total rewards
  const transactions = await store.getTransactionsByRescuer(rescuer.rescuer_id);
  const totalRewards = transactions
    .filter(t => t.status === 'CONFIRMED')
    .reduce((sum, t) => sum + t.amount_usdc, 0);
  
  const statusEmoji = {
    ONLINE: '🟢',
    OFFLINE: '🔴',
    IDLE: '🟡',
    BUSY: '🟠',
    ON_MISSION: '🚀',
  }[rescuer.status];
  
  const profileText = `
👤 THÔNG TIN CÁ NHÂN

📋 ID: ${rescuer.rescuer_id}
👤 Tên: ${rescuer.name}
📞 SĐT: ${rescuer.phone}

${statusEmoji} Trạng thái: ${rescuer.status}
🚤 Phương tiện: ${VEHICLE_TYPE_NAMES[rescuer.vehicle_type]}
👥 Sức chở: ${rescuer.vehicle_capacity} người

⭐ Rating: ${rescuer.rating.toFixed(1)}/5
🏆 Nhiệm vụ hoàn thành: ${rescuer.completed_missions}
💰 Tổng thưởng đã nhận: ${totalRewards} USDC

💳 Ví: ${rescuer.wallet_address 
    ? `${rescuer.wallet_address.substring(0, 10)}...${rescuer.wallet_address.substring(38)}`
    : '(Chưa thiết lập - /wallet <địa_chỉ>)'}

📅 Đăng ký: ${new Date(rescuer.created_at).toLocaleDateString('vi-VN')}
  `.trim();
  
  await bot.sendMessage(chatId, profileText);
}



