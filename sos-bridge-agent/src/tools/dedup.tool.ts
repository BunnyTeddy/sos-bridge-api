/**
 * Deduplication Tool & Ticket Creation
 * Kiểm tra trùng lặp và tạo ticket
 */

import { FunctionTool } from '@iqai/adk';
import { store } from '../store/index.js';
import { normalizeVietnamesePhone } from '../models/raw-input.js';
import type { PriorityLevel } from '../models/rescue-ticket.js';
import { autoDispatchTicket } from '../services/auto-dispatch.js';

/**
 * Kiểm tra trùng lặp trước khi tạo ticket mới
 */
async function checkDuplicate(
  phone: string,
  lat?: number,
  lng?: number,
  messageContent?: string
) {
  console.log(`[Dedup] Checking duplicate for phone: ${phone}`);
  
  const normalizedPhone = normalizeVietnamesePhone(phone);
  
  // Check 1: Tìm theo số điện thoại
  const existingTicketByPhone = await store.findTicketByPhone(normalizedPhone);
  
  if (existingTicketByPhone) {
    const activeStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'];
    
    if (activeStatuses.includes(existingTicketByPhone.status)) {
      console.log(`[Dedup] Found duplicate by phone: ${existingTicketByPhone.ticket_id}`);
      return {
        is_duplicate: true,
        existing_ticket_id: existingTicketByPhone.ticket_id,
        existing_status: existingTicketByPhone.status,
        match_type: 'phone',
        action: 'skip',
        message: `Ticket ${existingTicketByPhone.ticket_id} với SĐT ${phone} đang được xử lý (${existingTicketByPhone.status})`,
      };
    }
  }
  
  // Check 2: Tìm theo vị trí (nếu có tọa độ)
  if (lat !== undefined && lng !== undefined) {
    const RADIUS_KM = 0.05; // 50 mét
    const nearbyActive = await store.hasActiveTicketNearby(lat, lng, RADIUS_KM);
    
    if (nearbyActive) {
      const nearbyTickets = await store.findTicketsInRadius(lat, lng, RADIUS_KM);
      const activeNearby = nearbyTickets.find(t => 
        ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status)
      );
      
      if (activeNearby) {
        console.log(`[Dedup] Found nearby ticket: ${activeNearby.ticket_id}`);
        return {
          is_duplicate: true,
          existing_ticket_id: activeNearby.ticket_id,
          existing_status: activeNearby.status,
          match_type: 'location',
          action: 'merge',
          message: `Có ticket ${activeNearby.ticket_id} trong bán kính 50m. Có thể gộp thông tin.`,
        };
      }
    }
  }
  
  console.log(`[Dedup] No duplicate found, can create new ticket`);
  return {
    is_duplicate: false,
    existing_ticket_id: null,
    match_type: null,
    action: 'create',
    message: 'Không phát hiện trùng lặp. Có thể tạo ticket mới.',
  };
}

export const deduplicationTool = new FunctionTool(checkDuplicate, {
  name: 'check_duplicate',
  description: `Kiểm tra xem yêu cầu cứu trợ có bị trùng lặp không.
  
  Kiểm tra:
  1. Số điện thoại đã tồn tại trong ticket đang xử lý
  2. Vị trí gần với ticket khác trong bán kính 50m
  
  Kết quả:
  - is_duplicate: true/false
  - action: 'skip', 'merge', hoặc 'create'`,
});

/**
 * Gộp thông tin vào ticket đã có
 */
async function mergeTicketInfo(
  ticketId: string,
  additionalInfo?: string,
  newPeopleCount?: number,
  newPriority?: number,
  newImageUrl?: string
) {
  console.log(`[Dedup] Merging info into ticket: ${ticketId}`);
  
  const ticket = await store.getTicket(ticketId);
  if (!ticket) {
    return {
      success: false,
      message: `Không tìm thấy ticket ${ticketId}`,
    };
  }
  
  const updates: Record<string, unknown> = {};
  
  // Cập nhật số người nếu nhiều hơn
  if (newPeopleCount && newPeopleCount > ticket.victim_info.people_count) {
    updates.victim_info = {
      ...ticket.victim_info,
      people_count: newPeopleCount,
    };
  }
  
  // Nâng mức độ khẩn cấp nếu cao hơn
  if (newPriority && newPriority > ticket.priority) {
    updates.priority = newPriority;
  }
  
  // Thêm ghi chú
  if (additionalInfo) {
    const currentNote = ticket.victim_info.note || '';
    updates.victim_info = {
      ...ticket.victim_info,
      ...(updates.victim_info || {}),
      note: `${currentNote}\n[Update] ${additionalInfo}`.trim(),
    };
  }
  
  if (Object.keys(updates).length > 0) {
    await store.updateTicket(ticketId, updates);
    return {
      success: true,
      ticket_id: ticketId,
      updates_applied: Object.keys(updates),
      message: 'Đã gộp thông tin vào ticket',
    };
  }
  
  return {
    success: true,
    ticket_id: ticketId,
    updates_applied: [],
    message: 'Không có thông tin mới để gộp',
  };
}

export const mergeTicketTool = new FunctionTool(mergeTicketInfo, {
  name: 'merge_ticket_info',
  description: `Gộp thông tin mới vào ticket đã tồn tại.`,
});

/**
 * Tạo Rescue Ticket mới và lưu vào store
 */
async function createRescueTicket(
  phone: string,
  lat: number,
  lng: number,
  addressText: string,
  peopleCount: number,
  priority: number,
  rawMessage: string,
  hasElderly: boolean = false,
  hasChildren: boolean = false,
  hasDisabled: boolean = false,
  note: string = '',
  telegramUserId?: string,
) {
  console.log(`[Ticket] Creating new rescue ticket...`);
  
  const normalizedPhone = normalizeVietnamesePhone(phone);
  
  // Validate priority
  const validPriority = Math.max(1, Math.min(5, priority)) as PriorityLevel;
  
  // Create ticket
  const ticket = await store.createAndAddTicket({
    location: {
      lat,
      lng,
      address_text: addressText,
    },
    victim_info: {
      phone: normalizedPhone,
      people_count: peopleCount,
      note: note || `Tin nhắn gốc: ${rawMessage.substring(0, 100)}`,
      has_elderly: hasElderly,
      has_children: hasChildren,
      has_disabled: hasDisabled,
    },
    priority: validPriority,
    raw_message: rawMessage,
    source: telegramUserId ? 'telegram_form' : 'direct',
  });

  // Store telegram user mapping (add to ticket for lookup)
  if (telegramUserId) {
    await store.updateTicket(ticket.ticket_id, {
      // Store telegram user in raw_message metadata
      raw_message: `[TG:${telegramUserId}] ${rawMessage}`,
    } as any);
  }

  console.log(`[Ticket] Created ticket: ${ticket.ticket_id}`);

  // ========== TỰ ĐỘNG TÌM ĐỘI CỨU HỘ ==========
  // Gọi auto-dispatch để tìm và thông báo đến các đội cứu hộ gần nhất
  let dispatchResult = null;
  try {
    console.log(`[Ticket] Đang tự động tìm đội cứu hộ...`);
    dispatchResult = await autoDispatchTicket(ticket.ticket_id);
    
    if (dispatchResult.success) {
      console.log(`[Ticket] ✅ Đã gửi thông báo đến ${dispatchResult.notified_count} đội cứu hộ`);
    } else {
      console.log(`[Ticket] ⚠️ Auto-dispatch: ${dispatchResult.message}`);
    }
  } catch (error) {
    console.error(`[Ticket] ❌ Lỗi auto-dispatch:`, error);
    // Không throw error - ticket vẫn được tạo thành công
  }

  return {
    success: true,
    ticket_id: ticket.ticket_id,
    status: ticket.status,
    priority: ticket.priority,
    location: ticket.location,
    victim_info: ticket.victim_info,
    created_at: new Date(ticket.created_at).toISOString(),
    message: `Đã tạo ticket ${ticket.ticket_id} thành công!`,
    // Thông tin dispatch (nếu có)
    dispatch: dispatchResult ? {
      notified_count: dispatchResult.notified_count,
      rescuers: dispatchResult.rescuers,
      dispatch_message: dispatchResult.message,
    } : null,
  };
}

export const createTicketTool = new FunctionTool(createRescueTicket, {
  name: 'create_rescue_ticket',
  description: `Tạo Rescue Ticket mới sau khi đã phân tích và kiểm tra trùng lặp.
  
  Cần cung cấp:
  - phone: Số điện thoại liên hệ
  - lat, lng: Tọa độ GPS
  - addressText: Địa chỉ dạng text
  - peopleCount: Số người cần cứu
  - priority: Mức độ ưu tiên (1-5)
  - rawMessage: Tin nhắn gốc
  - hasElderly, hasChildren, hasDisabled: Có người già/trẻ em/khuyết tật
  - note: Ghi chú thêm
  - telegramUserId: ID người dùng Telegram (nếu có)
  
  GỌI TOOL NÀY SAU KHI ĐÃ:
  1. parse_sos_message - Phân tích tin nhắn
  2. geocode_address - Lấy tọa độ
  3. check_duplicate - Kiểm tra trùng lặp (action='create')`,
});
