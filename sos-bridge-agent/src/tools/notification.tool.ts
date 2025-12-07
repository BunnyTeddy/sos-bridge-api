/**
 * Notification Tool
 * Gửi thông báo đến đội cứu hộ và người báo tin
 */

import { FunctionTool } from '@iqai/adk';
import { store } from '../store/index.js';
import type { RescueTicket } from '../models/rescue-ticket.js';
import type { Rescuer } from '../models/rescuer.js';

/**
 * Format thông báo nhiệm vụ cho rescuer
 */
function formatMissionNotification(ticket: RescueTicket, rescuer: Rescuer, distanceKm: number): string {
  const priorityEmoji = ['', '🟢', '🟡', '🟠', '🔴', '🚨'][ticket.priority];
  const urgencyText = ['', 'Thấp', 'Trung bình', 'Cao', 'Rất cao', 'KHẨN CẤP'][ticket.priority];
  
  let victimDetails = `${ticket.victim_info.people_count} người`;
  const extras = [];
  if (ticket.victim_info.has_elderly) extras.push('có người già');
  if (ticket.victim_info.has_children) extras.push('có trẻ em');
  if (ticket.victim_info.has_disabled) extras.push('có người khuyết tật');
  if (extras.length > 0) {
    victimDetails += ` (${extras.join(', ')})`;
  }

  return `
${priorityEmoji} NHIỆM VỤ CỨU HỘ ${priorityEmoji}

📍 Vị trí: ${ticket.location.address_text}
📏 Khoảng cách: ${distanceKm.toFixed(1)}km

👥 Nạn nhân: ${victimDetails}
⚡ Mức độ: ${urgencyText}
📝 Ghi chú: ${ticket.victim_info.note}

📞 Liên hệ: ${ticket.victim_info.phone}

💰 Hỗ trợ nhiên liệu: 20 USDC

━━━━━━━━━━━━━━━━━
Ticket ID: ${ticket.ticket_id}
`.trim();
}

/**
 * Format thông báo xác nhận cho nạn nhân
 */
function formatVictimNotification(ticket: RescueTicket, rescuer: Rescuer, estimatedMinutes: number): string {
  return `
✅ TIN NHẮN CỦA BẠN ĐÃ ĐƯỢC TIẾP NHẬN

Chúng tôi đã điều phối đội cứu hộ đến hỗ trợ bạn.

🚤 Đội cứu hộ: ${rescuer.name}
📞 Liên hệ: ${rescuer.phone}
⏱️ Dự kiến: ${estimatedMinutes} phút

Hãy giữ bình tĩnh và chờ đợi ở nơi an toàn.

━━━━━━━━━━━━━━━━━
Mã yêu cầu: ${ticket.ticket_id}
`.trim();
}

/**
 * Format thông báo hoàn thành nhiệm vụ
 */
function formatCompletionNotification(ticket: RescueTicket, rescuer: Rescuer): string {
  return `
🎉 NHIỆM VỤ HOÀN THÀNH

Ticket: ${ticket.ticket_id}
Đội cứu hộ: ${rescuer.name}
Địa điểm: ${ticket.location.address_text}
Nạn nhân: ${ticket.victim_info.people_count} người đã an toàn

💰 Đã chuyển 20 USDC hỗ trợ nhiên liệu

Cảm ơn bạn đã tham gia cứu trợ! 🙏
`.trim();
}

/**
 * Gửi thông báo nhiệm vụ đến đội cứu hộ
 */
async function notifyRescuer(ticketId: string, rescuerId: string) {
  console.log(`[Notify] Sending mission notification to rescuer ${rescuerId}`);
  
  const ticket = await store.getTicket(ticketId);
  const rescuer = await store.getRescuer(rescuerId);
  
  if (!ticket) {
    return { success: false, message: `Không tìm thấy ticket ${ticketId}` };
  }
  if (!rescuer) {
    return { success: false, message: `Không tìm thấy rescuer ${rescuerId}` };
  }
  
  // Tính khoảng cách
  const distanceKm = Math.sqrt(
    Math.pow(ticket.location.lat - rescuer.location.lat, 2) +
    Math.pow(ticket.location.lng - rescuer.location.lng, 2)
  ) * 111;
  
  const message = formatMissionNotification(ticket, rescuer, distanceKm);
  
  console.log(`\n========== NOTIFICATION TO RESCUER ==========`);
  console.log(`To: ${rescuer.name} (${rescuer.phone})`);
  console.log(`Message:\n${message}`);
  console.log(`==============================================\n`);
  
  return {
    success: true,
    notification_type: 'mission_alert',
    recipient: {
      id: rescuerId,
      name: rescuer.name,
      telegram_id: rescuer.telegram_user_id,
    },
    message_preview: message.substring(0, 100) + '...',
    message_full: message,
  };
}

export const notifyRescuerTool = new FunctionTool(notifyRescuer, {
  name: 'notify_rescuer',
  description: `Send new mission notification to rescue team.`,
});

/**
 * Gửi thông báo xác nhận cho nạn nhân
 */
async function notifyVictim(ticketId: string, victimPhone?: string) {
  const ticket = await store.getTicket(ticketId);
  
  if (!ticket) {
    return { success: false, message: `Không tìm thấy ticket ${ticketId}` };
  }
  
  if (!ticket.assigned_rescuer_id) {
    return { success: false, message: 'Chưa có đội cứu hộ được gán' };
  }
  
  const rescuer = await store.getRescuer(ticket.assigned_rescuer_id);
  if (!rescuer) {
    return { success: false, message: 'Không tìm thấy thông tin đội cứu hộ' };
  }
  
  const distanceKm = Math.sqrt(
    Math.pow(ticket.location.lat - rescuer.location.lat, 2) +
    Math.pow(ticket.location.lng - rescuer.location.lng, 2)
  ) * 111;
  const estimatedMinutes = Math.ceil(distanceKm / 5 * 60);
  
  const phone = victimPhone || ticket.victim_info.phone;
  const message = formatVictimNotification(ticket, rescuer, estimatedMinutes);
  
  console.log(`\n========== NOTIFICATION TO VICTIM ==========`);
  console.log(`To: ${phone}`);
  console.log(`Message:\n${message}`);
  console.log(`=============================================\n`);
  
  return {
    success: true,
    notification_type: 'rescue_confirmed',
    recipient: { phone },
    estimated_arrival_minutes: estimatedMinutes,
    message_preview: message.substring(0, 100) + '...',
    message_full: message,
  };
}

export const notifyVictimTool = new FunctionTool(notifyVictim, {
  name: 'notify_victim',
  description: `Send confirmation notification to reporter/victim.`,
});

/**
 * Gửi thông báo hoàn thành
 */
async function notifyCompletion(ticketId: string) {
  const ticket = await store.getTicket(ticketId);
  
  if (!ticket) {
    return { success: false, message: `Không tìm thấy ticket ${ticketId}` };
  }
  
  if (!ticket.assigned_rescuer_id) {
    return { success: false, message: 'Không có thông tin đội cứu hộ' };
  }
  
  const rescuer = await store.getRescuer(ticket.assigned_rescuer_id);
  if (!rescuer) {
    return { success: false, message: 'Không tìm thấy thông tin đội cứu hộ' };
  }
  
  const message = formatCompletionNotification(ticket, rescuer);
  
  console.log(`\n========== COMPLETION NOTIFICATION ==========`);
  console.log(`Ticket: ${ticketId}`);
  console.log(`Message:\n${message}`);
  console.log(`==============================================\n`);
  
  return {
    success: true,
    notification_type: 'mission_completed',
    ticket_id: ticketId,
    rescuer_name: rescuer.name,
    victim_count: ticket.victim_info.people_count,
    message_full: message,
  };
}

export const notifyCompletionTool = new FunctionTool(notifyCompletion, {
  name: 'notify_completion',
  description: `Send mission completion confirmation notification.`,
});

/**
 * Phát cảnh báo khẩn cấp đến tất cả rescuers
 */
async function broadcastEmergencyAlert(ticketId: string, radiusKm: number = 10) {
  const ticket = await store.getTicket(ticketId);
  
  if (!ticket) {
    return { success: false, message: `Không tìm thấy ticket ${ticketId}` };
  }
  
  const allRescuers = await store.findAvailableRescuersInRadius(
    ticket.location.lat,
    ticket.location.lng,
    radiusKm
  );
  
  if (allRescuers.length === 0) {
    return {
      success: false,
      message: `Không có đội cứu hộ trong bán kính ${radiusKm}km`,
    };
  }
  
  const alertMessage = `
🚨🚨🚨 CẢNH BÁO KHẨN CẤP 🚨🚨🚨

Có trường hợp CỰC KỲ NGUY HIỂM cần hỗ trợ ngay!

📍 ${ticket.location.address_text}
👥 ${ticket.victim_info.people_count} người đang gặp nguy hiểm

Mọi đội cứu hộ trong khu vực xin hãy phản hồi!
`.trim();
  
  console.log(`\n========== EMERGENCY BROADCAST ==========`);
  console.log(`Ticket: ${ticketId}`);
  console.log(`Recipients: ${allRescuers.length} rescuers`);
  console.log(`Message:\n${alertMessage}`);
  console.log(`==========================================\n`);
  
  return {
    success: true,
    notification_type: 'emergency_broadcast',
    ticket_id: ticketId,
    recipients_count: allRescuers.length,
    recipients: allRescuers.map(r => ({
      id: r.rescuer_id,
      name: r.name,
      distance_km: r.distance,
    })),
    message: alertMessage,
  };
}

export const broadcastAlertTool = new FunctionTool(broadcastEmergencyAlert, {
  name: 'broadcast_emergency_alert',
  description: `Broadcast emergency alert to all rescuers in the area.`,
});
