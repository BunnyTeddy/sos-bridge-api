/**
 * Rescuer Scout Tool
 * Tìm kiếm đội cứu hộ phù hợp trong bán kính
 */

import { FunctionTool } from '@iqai/adk';
import { store } from '../store/index.js';

/**
 * Tìm đội cứu hộ trong bán kính
 */
async function scoutRescuers(
  lat: number,
  lng: number,
  radiusKm: number = 5,
  minCapacity: number = 1,
  preferCano: boolean = false
) {
  console.log(`[Scout] Searching rescuers within ${radiusKm}km of (${lat}, ${lng})`);
  
  const candidates = await store.findAvailableRescuersInRadius(lat, lng, radiusKm);
  
  if (candidates.length === 0) {
    console.log(`[Scout] No rescuers found`);
    return {
      success: false,
      rescuers: [],
      total_found: 0,
      message: `Không tìm thấy đội cứu hộ trong bán kính ${radiusKm}km`,
    };
  }
  
  // Lọc theo capacity
  let filtered = candidates.filter(r => r.vehicle_capacity >= minCapacity);
  
  // Tính điểm cho mỗi rescuer
  const scored = filtered.map(r => {
    let score = 0;
    
    // Điểm cho khoảng cách (max 40 điểm)
    score += Math.max(0, 40 - r.distance * 8);
    
    // Điểm cho loại phương tiện
    if (preferCano && r.vehicle_type === 'cano') {
      score += 30;
    } else if (r.vehicle_type === 'cano') {
      score += 20;
    } else if (r.vehicle_type === 'boat') {
      score += 15;
    }
    
    // Điểm cho capacity
    score += Math.min(r.vehicle_capacity * 2, 15);
    
    // Điểm cho rating
    score += r.rating * 3;
    
    // Điểm cho kinh nghiệm
    score += Math.min(r.completed_missions, 10);
    
    return {
      rescuer_id: r.rescuer_id,
      name: r.name,
      phone: r.phone,
      distance_km: Math.round(r.distance * 100) / 100,
      vehicle_type: r.vehicle_type,
      vehicle_capacity: r.vehicle_capacity,
      rating: r.rating,
      completed_missions: r.completed_missions,
      score: Math.round(score),
      telegram_user_id: r.telegram_user_id,
      wallet_address: r.wallet_address,
    };
  });
  
  // Sắp xếp theo điểm
  scored.sort((a, b) => b.score - a.score);
  
  console.log(`[Scout] Found ${scored.length} rescuers, best: ${scored[0]?.name}`);
  
  return {
    success: true,
    rescuers: scored,
    total_found: scored.length,
    best_match: scored[0] || null,
    message: `Tìm thấy ${scored.length} đội cứu hộ phù hợp`,
  };
}

export const scoutRescuersTool = new FunctionTool(scoutRescuers, {
  name: 'scout_rescuers',
  description: `Search for online and available rescue teams within radius from ticket location.`,
});

/**
 * Gán đội cứu hộ cho ticket
 */
async function assignRescuer(ticketId: string, rescuerId: string) {
  console.log(`[Scout] Assigning rescuer ${rescuerId} to ticket ${ticketId}`);
  
  const ticket = await store.getTicket(ticketId);
  if (!ticket) {
    return {
      success: false,
      message: `Không tìm thấy ticket ${ticketId}`,
    };
  }
  
  const rescuer = await store.getRescuer(rescuerId);
  if (!rescuer) {
    return {
      success: false,
      message: `Không tìm thấy rescuer ${rescuerId}`,
    };
  }
  
  // Kiểm tra rescuer có available không
  if (rescuer.status !== 'IDLE' && rescuer.status !== 'ONLINE') {
    return {
      success: false,
      message: `Rescuer ${rescuer.name} đang bận (status: ${rescuer.status})`,
    };
  }
  
  // Cập nhật ticket
  await store.updateTicket(ticketId, {
    status: 'ASSIGNED',
    assigned_rescuer_id: rescuerId,
  });
  
  // Cập nhật rescuer status
  await store.updateRescuerStatus(rescuerId, 'ON_MISSION');
  
  console.log(`[Scout] Successfully assigned ${rescuer.name} to ${ticketId}`);
  
  return {
    success: true,
    ticket_id: ticketId,
    rescuer_id: rescuerId,
    rescuer_name: rescuer.name,
    rescuer_phone: rescuer.phone,
    message: `Đã gán ${rescuer.name} cho nhiệm vụ ${ticketId}`,
  };
}

export const assignRescuerTool = new FunctionTool(assignRescuer, {
  name: 'assign_rescuer',
  description: `Assign a rescue team to a rescue ticket.`,
});

/**
 * Auto-match và assign rescuer tốt nhất cho ticket
 */
async function autoMatchRescuer(ticketId: string, radiusKm: number = 5) {
  console.log(`[Scout] Auto-matching rescuer for ticket ${ticketId}`);
  
  const ticket = await store.getTicket(ticketId);
  if (!ticket) {
    return {
      success: false,
      message: `Không tìm thấy ticket ${ticketId}`,
    };
  }
  
  // Tìm rescuer tốt nhất
  const bestMatch = await store.findBestRescuerForTicket(ticket, radiusKm);
  
  if (!bestMatch) {
    return {
      success: false,
      message: `Không tìm thấy đội cứu hộ phù hợp trong bán kính ${radiusKm}km`,
    };
  }
  
  // Assign rescuer
  await store.updateTicket(ticketId, {
    status: 'ASSIGNED',
    assigned_rescuer_id: bestMatch.rescuer_id,
  });
  
  await store.updateRescuerStatus(bestMatch.rescuer_id, 'ON_MISSION');
  
  return {
    success: true,
    ticket_id: ticketId,
    rescuer: {
      id: bestMatch.rescuer_id,
      name: bestMatch.name,
      phone: bestMatch.phone,
      distance_km: Math.round(bestMatch.distance * 100) / 100,
      vehicle_type: bestMatch.vehicle_type,
      score: bestMatch.score,
      wallet_address: bestMatch.wallet_address,
    },
    message: `Đã gán ${bestMatch.name} (cách ${Math.round(bestMatch.distance * 100) / 100}km) cho nhiệm vụ`,
  };
}

export const autoMatchRescuerTool = new FunctionTool(autoMatchRescuer, {
  name: 'auto_match_rescuer',
  description: `Automatically find and assign best rescuer for ticket.`,
});
