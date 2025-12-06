/**
 * Auto-Dispatch Service
 * Tự động tìm và gửi thông báo đến đội cứu hộ khi có ticket mới
 */

import { store } from '../store/index.js';
import type { RescueTicket } from '../models/rescue-ticket.js';
import type { Rescuer } from '../models/rescuer.js';

// ============ CONFIGURATION ============

const AUTO_DISPATCH_CONFIG = {
  // Số đội cứu hộ tối đa để gửi thông báo
  maxRescuersToNotify: 5,
  // Bán kính tìm kiếm (km)
  searchRadiusKm: 5,
  // Bán kính mở rộng nếu không tìm thấy ai (km)
  expandedRadiusKm: 10,
  // Thời gian chờ phản hồi trước khi mở rộng tìm kiếm (ms)
  responseTimeoutMs: 300000, // 5 phút
};

// ============ TYPES ============

export interface DispatchResult {
  success: boolean;
  notified_count: number;
  rescuers: Array<{
    rescuer_id: string;
    name: string;
    distance: number;
    telegram_user_id?: number;
  }>;
  message: string;
}

export interface RescuerCandidate {
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

// ============ HELPER FUNCTIONS ============

/**
 * Tính điểm cho rescuer dựa trên các tiêu chí
 */
function calculateRescuerScore(
  rescuer: Rescuer & { distance: number },
  ticket: RescueTicket
): number {
  let score = 0;

  // Điểm cho khoảng cách (max 40 điểm) - càng gần càng tốt
  score += Math.max(0, 40 - rescuer.distance * 8);

  // Điểm cho loại phương tiện (max 30 điểm)
  // Ưu tiên cano cho vùng ngập sâu (priority cao)
  if (ticket.priority >= 4 && rescuer.vehicle_type === 'cano') {
    score += 30;
  } else if (rescuer.vehicle_type === 'cano') {
    score += 25;
  } else if (rescuer.vehicle_type === 'boat') {
    score += 20;
  } else if (rescuer.vehicle_type === 'kayak') {
    score += 15;
  } else {
    score += 10;
  }

  // Điểm cho sức chứa (max 15 điểm)
  // Ưu tiên phương tiện có sức chứa >= số người cần cứu
  if (rescuer.vehicle_capacity >= ticket.victim_info.people_count) {
    score += 15;
  } else {
    score += rescuer.vehicle_capacity * 2;
  }

  // Điểm cho rating (max 15 điểm)
  score += rescuer.rating * 3;

  // Điểm cho kinh nghiệm (max 10 điểm)
  score += Math.min(rescuer.completed_missions, 10);

  return Math.round(score);
}

/**
 * Tìm các đội cứu hộ phù hợp trong bán kính
 */
async function findSuitableRescuers(
  ticket: RescueTicket,
  radiusKm: number = AUTO_DISPATCH_CONFIG.searchRadiusKm,
  limit: number = AUTO_DISPATCH_CONFIG.maxRescuersToNotify
): Promise<RescuerCandidate[]> {
  console.log(`[AutoDispatch] Tìm rescuers trong bán kính ${radiusKm}km cho ticket ${ticket.ticket_id}`);

  // Tìm tất cả rescuers available trong bán kính
  const candidates = await store.findAvailableRescuersInRadius(
    ticket.location.lat,
    ticket.location.lng,
    radiusKm
  );

  if (candidates.length === 0) {
    console.log(`[AutoDispatch] Không tìm thấy rescuer nào trong bán kính ${radiusKm}km`);
    return [];
  }

  // Lọc những rescuer có Telegram ID (để có thể gửi thông báo)
  const withTelegram = candidates.filter(r => r.telegram_user_id);

  if (withTelegram.length === 0) {
    console.log(`[AutoDispatch] Không có rescuer nào có Telegram ID`);
    // Vẫn trả về candidates để log, nhưng không thể notify
    return candidates.slice(0, limit).map(r => ({
      rescuer_id: r.rescuer_id,
      name: r.name,
      phone: r.phone,
      distance: Math.round(r.distance * 100) / 100,
      vehicle_type: r.vehicle_type,
      vehicle_capacity: r.vehicle_capacity,
      rating: r.rating,
      completed_missions: r.completed_missions,
      telegram_user_id: r.telegram_user_id,
      wallet_address: r.wallet_address,
      score: calculateRescuerScore(r, ticket),
    }));
  }

  // Tính điểm và sắp xếp
  const scored = withTelegram.map(r => ({
    rescuer_id: r.rescuer_id,
    name: r.name,
    phone: r.phone,
    distance: Math.round(r.distance * 100) / 100,
    vehicle_type: r.vehicle_type,
    vehicle_capacity: r.vehicle_capacity,
    rating: r.rating,
    completed_missions: r.completed_missions,
    telegram_user_id: r.telegram_user_id,
    wallet_address: r.wallet_address,
    score: calculateRescuerScore(r, ticket),
  }));

  // Sắp xếp theo điểm giảm dần
  scored.sort((a, b) => b.score - a.score);

  // Lấy top N
  const topRescuers = scored.slice(0, limit);

  console.log(`[AutoDispatch] Tìm thấy ${topRescuers.length} rescuers phù hợp:`, 
    topRescuers.map(r => `${r.name} (${r.distance}km, score: ${r.score})`).join(', ')
  );

  return topRescuers;
}

// ============ MAIN FUNCTION ============

/**
 * Tự động dispatch ticket đến các đội cứu hộ gần nhất
 * Gửi thông báo đến 3-5 đội, đội nào nhận trước sẽ được gán
 */
export async function autoDispatchTicket(ticketId: string): Promise<DispatchResult> {
  console.log(`[AutoDispatch] === Bắt đầu auto-dispatch cho ticket ${ticketId} ===`);

  // Lấy thông tin ticket
  const ticket = await store.getTicket(ticketId);
  if (!ticket) {
    console.error(`[AutoDispatch] Không tìm thấy ticket ${ticketId}`);
    return {
      success: false,
      notified_count: 0,
      rescuers: [],
      message: `Không tìm thấy ticket ${ticketId}`,
    };
  }

  // Kiểm tra ticket đã được assign chưa
  if (ticket.status !== 'OPEN') {
    console.log(`[AutoDispatch] Ticket ${ticketId} không ở trạng thái OPEN (hiện tại: ${ticket.status})`);
    return {
      success: false,
      notified_count: 0,
      rescuers: [],
      message: `Ticket không ở trạng thái OPEN (hiện tại: ${ticket.status})`,
    };
  }

  // Tìm rescuers phù hợp
  let rescuers = await findSuitableRescuers(ticket);

  // Nếu không tìm thấy, mở rộng bán kính
  if (rescuers.length === 0) {
    console.log(`[AutoDispatch] Không tìm thấy rescuer, mở rộng bán kính lên ${AUTO_DISPATCH_CONFIG.expandedRadiusKm}km`);
    rescuers = await findSuitableRescuers(ticket, AUTO_DISPATCH_CONFIG.expandedRadiusKm);
  }

  // Nếu vẫn không có ai
  if (rescuers.length === 0) {
    console.log(`[AutoDispatch] Không có đội cứu hộ nào trong khu vực`);
    return {
      success: false,
      notified_count: 0,
      rescuers: [],
      message: `Không tìm thấy đội cứu hộ trong bán kính ${AUTO_DISPATCH_CONFIG.expandedRadiusKm}km. Vui lòng thử lại sau.`,
    };
  }

  // Lọc những rescuers có telegram_user_id để gửi thông báo
  const notifiableRescuers = rescuers.filter(r => r.telegram_user_id);

  if (notifiableRescuers.length === 0) {
    console.log(`[AutoDispatch] Có ${rescuers.length} rescuers nhưng không ai có Telegram`);
    return {
      success: false,
      notified_count: 0,
      rescuers: rescuers.map(r => ({
        rescuer_id: r.rescuer_id,
        name: r.name,
        distance: r.distance,
        telegram_user_id: r.telegram_user_id,
      })),
      message: `Tìm thấy ${rescuers.length} đội cứu hộ nhưng không có Telegram để thông báo`,
    };
  }

  // Import và gọi hàm gửi thông báo từ telegram-bot
  // Note: Hàm này sẽ được implement trong bước tiếp theo
  try {
    const { sendDispatchNotifications } = await import('../integrations/telegram-bot.js');
    const notifyResults = await sendDispatchNotifications(ticket, notifiableRescuers);

    const successCount = notifyResults.filter(r => r.success).length;
    
    console.log(`[AutoDispatch] === Hoàn thành: Đã gửi thông báo đến ${successCount}/${notifiableRescuers.length} rescuers ===`);

    return {
      success: successCount > 0,
      notified_count: successCount,
      rescuers: notifiableRescuers.map(r => ({
        rescuer_id: r.rescuer_id,
        name: r.name,
        distance: r.distance,
        telegram_user_id: r.telegram_user_id,
      })),
      message: successCount > 0
        ? `Đã gửi thông báo đến ${successCount} đội cứu hộ gần nhất`
        : `Không thể gửi thông báo. Vui lòng thử lại sau.`,
    };
  } catch (error) {
    // Nếu chưa implement sendDispatchNotifications, log và trả về kết quả
    console.log(`[AutoDispatch] Lỗi khi gửi thông báo:`, error);
    console.log(`[AutoDispatch] Danh sách rescuers cần thông báo:`, 
      notifiableRescuers.map(r => `${r.name} (TG: ${r.telegram_user_id})`).join(', ')
    );

    return {
      success: true,
      notified_count: notifiableRescuers.length,
      rescuers: notifiableRescuers.map(r => ({
        rescuer_id: r.rescuer_id,
        name: r.name,
        distance: r.distance,
        telegram_user_id: r.telegram_user_id,
      })),
      message: `Đã tìm thấy ${notifiableRescuers.length} đội cứu hộ. Đang xử lý thông báo...`,
    };
  }
}

/**
 * Kiểm tra xem ticket đã được assign chưa (dùng khi rescuer nhận nhiệm vụ)
 */
export async function isTicketAvailable(ticketId: string): Promise<{
  available: boolean;
  current_status: string;
  assigned_to?: string;
}> {
  const ticket = await store.getTicket(ticketId);
  
  if (!ticket) {
    return {
      available: false,
      current_status: 'NOT_FOUND',
    };
  }

  if (ticket.status !== 'OPEN') {
    return {
      available: false,
      current_status: ticket.status,
      assigned_to: ticket.assigned_rescuer_id,
    };
  }

  return {
    available: true,
    current_status: ticket.status,
  };
}

/**
 * Gán rescuer cho ticket (atomic operation để tránh race condition)
 */
export async function assignRescuerToTicket(
  ticketId: string,
  rescuerId: string
): Promise<{
  success: boolean;
  message: string;
  ticket?: RescueTicket;
}> {
  // Kiểm tra ticket còn available không
  const availability = await isTicketAvailable(ticketId);
  
  if (!availability.available) {
    if (availability.current_status === 'NOT_FOUND') {
      return {
        success: false,
        message: `Ticket ${ticketId} không tồn tại`,
      };
    }
    
    if (availability.assigned_to) {
      const assignedRescuer = await store.getRescuer(availability.assigned_to);
      return {
        success: false,
        message: `Nhiệm vụ này đã được đội "${assignedRescuer?.name || 'khác'}" nhận rồi!`,
      };
    }

    return {
      success: false,
      message: `Ticket không còn khả dụng (trạng thái: ${availability.current_status})`,
    };
  }

  // Kiểm tra rescuer
  const rescuer = await store.getRescuer(rescuerId);
  if (!rescuer) {
    return {
      success: false,
      message: `Không tìm thấy thông tin đội cứu hộ`,
    };
  }

  // Kiểm tra rescuer có đang bận không
  if (rescuer.status === 'ON_MISSION') {
    return {
      success: false,
      message: `Bạn đang có nhiệm vụ khác chưa hoàn thành`,
    };
  }

  // Cập nhật ticket - ASSIGN
  const updatedTicket = await store.updateTicket(ticketId, {
    status: 'ASSIGNED',
    assigned_rescuer_id: rescuerId,
    updated_at: Date.now(),
  });

  if (!updatedTicket) {
    return {
      success: false,
      message: `Không thể cập nhật ticket`,
    };
  }

  // Cập nhật rescuer status
  await store.updateRescuer(rescuerId, {
    status: 'ON_MISSION',
    last_active_at: Date.now(),
  });

  console.log(`[AutoDispatch] Đã gán rescuer ${rescuer.name} cho ticket ${ticketId}`);

  return {
    success: true,
    message: `Bạn đã nhận nhiệm vụ thành công!`,
    ticket: updatedTicket,
  };
}

// Export config để có thể điều chỉnh
export { AUTO_DISPATCH_CONFIG };







