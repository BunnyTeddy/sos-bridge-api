/**
 * Rescuer - Đội cứu hộ
 * Đại diện cho một đội/người cứu hộ trong hệ thống
 */

export type RescuerStatus = 'ONLINE' | 'OFFLINE' | 'IDLE' | 'BUSY' | 'ON_MISSION';
export type VehicleType = 'cano' | 'boat' | 'kayak' | 'raft' | 'other';
export type RegistrationStatus = 'pending' | 'verified' | 'active' | 'suspended';

export interface RescuerLocation {
  lat: number;
  lng: number;
  last_updated: number;
}

export interface Rescuer {
  rescuer_id: string;
  name: string;
  phone: string;
  status: RescuerStatus;
  location: RescuerLocation;
  vehicle_type: VehicleType;
  vehicle_capacity: number; // Số người có thể chở
  wallet_address?: string; // Địa chỉ ví crypto để nhận thưởng
  rating: number; // 1-5 stars
  completed_missions: number;
  telegram_user_id?: number;
  telegram_chat_id?: number; // Chat ID for sending notifications
  registration_status?: RegistrationStatus; // Registration workflow status
  created_at: number;
  updated_at?: number;
  last_active_at: number;
}

/**
 * Vehicle type display names
 */
export const VEHICLE_TYPE_NAMES: Record<VehicleType, string> = {
  cano: 'Ca nô',
  boat: 'Thuyền',
  kayak: 'Thuyền kayak',
  raft: 'Bè mảng',
  other: 'Khác',
};

/**
 * Get vehicle type from Vietnamese name
 */
export function getVehicleTypeFromName(name: string): VehicleType | undefined {
  const normalized = name.toLowerCase().trim();
  
  if (normalized.includes('ca nô') || normalized.includes('cano')) return 'cano';
  if (normalized.includes('thuyền kayak') || normalized.includes('kayak')) return 'kayak';
  if (normalized.includes('thuyền') || normalized.includes('boat')) return 'boat';
  if (normalized.includes('bè') || normalized.includes('raft')) return 'raft';
  if (normalized.includes('khác') || normalized.includes('other')) return 'other';
  
  return undefined;
}

/**
 * Tạo rescuer ID unique
 */
export function generateRescuerId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `RSC_${timestamp}_${random}`.toUpperCase();
}

/**
 * Tạo một Rescuer mới
 */
export function createRescuer(
  params: {
    name: string;
    phone: string;
    location: { lat: number; lng: number };
    vehicle_type: VehicleType;
    vehicle_capacity: number;
    telegram_user_id?: number;
    telegram_chat_id?: number;
    wallet_address?: string;
    registration_status?: RegistrationStatus;
  }
): Rescuer {
  const now = Date.now();
  return {
    rescuer_id: generateRescuerId(),
    name: params.name,
    phone: params.phone,
    status: 'OFFLINE', // Start as offline until they go /online
    location: {
      lat: params.location.lat,
      lng: params.location.lng,
      last_updated: now,
    },
    vehicle_type: params.vehicle_type,
    vehicle_capacity: params.vehicle_capacity,
    wallet_address: params.wallet_address,
    rating: 5.0,
    completed_missions: 0,
    telegram_user_id: params.telegram_user_id,
    telegram_chat_id: params.telegram_chat_id,
    registration_status: params.registration_status || 'pending',
    created_at: now,
    updated_at: now,
    last_active_at: now,
  };
}

/**
 * Format rescuer profile for display
 */
export function formatRescuerProfile(rescuer: Rescuer): string {
  const statusEmoji = {
    ONLINE: '🟢',
    OFFLINE: '🔴',
    IDLE: '🟡',
    BUSY: '🟠',
    ON_MISSION: '🚀',
  }[rescuer.status];

  const registrationEmoji = {
    pending: '⏳',
    verified: '✅',
    active: '🎯',
    suspended: '🚫',
  }[rescuer.registration_status || 'pending'];

  return `
👤 ${rescuer.name}
${statusEmoji} Trạng thái: ${rescuer.status}
${registrationEmoji} Đăng ký: ${rescuer.registration_status || 'pending'}

📞 SĐT: ${rescuer.phone}
🚤 Phương tiện: ${VEHICLE_TYPE_NAMES[rescuer.vehicle_type]} (${rescuer.vehicle_capacity} người)
⭐ Rating: ${rescuer.rating.toFixed(1)}/5
🏆 Nhiệm vụ hoàn thành: ${rescuer.completed_missions}

💳 Ví: ${rescuer.wallet_address ? `${rescuer.wallet_address.substring(0, 10)}...${rescuer.wallet_address.substring(38)}` : '(Chưa thiết lập)'}
  `.trim();
}

/**
 * Tính khoảng cách giữa 2 điểm (Haversine formula) - đơn vị km
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

