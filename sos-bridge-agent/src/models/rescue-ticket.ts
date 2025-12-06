/**
 * RescueTicket - Vé cứu hộ
 * Đại diện cho một yêu cầu cứu trợ trong hệ thống
 */

export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'VERIFIED' | 'COMPLETED' | 'CANCELLED';
export type PriorityLevel = 1 | 2 | 3 | 4 | 5; // 1 = Thấp, 5 = Rất cao

export interface Location {
  lat: number;
  lng: number;
  address_text: string;
}

export interface VictimInfo {
  phone: string;
  people_count: number;
  note: string;
  has_elderly: boolean;
  has_children: boolean;
  has_disabled: boolean;
}

export interface RescueTicket {
  ticket_id: string;
  status: TicketStatus;
  priority: PriorityLevel;
  location: Location;
  victim_info: VictimInfo;
  assigned_rescuer_id?: string;
  raw_message: string;
  source: 'telegram_form' | 'telegram_forward' | 'direct';
  created_at: number;
  updated_at: number;
  verified_at?: number;
  completed_at?: number;
  verification_image_url?: string;
  verification_result?: VerificationResult;
}

export interface VerificationResult {
  is_valid: boolean;
  human_detected: boolean;
  flood_scene_detected: boolean;
  confidence_score: number;
  metadata_valid: boolean;
  notes: string;
}

/**
 * Tạo ticket ID unique
 */
export function generateTicketId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `SOS_VN_${timestamp}_${random}`.toUpperCase();
}

/**
 * Tạo một RescueTicket mới
 */
export function createRescueTicket(
  params: {
    location: Location;
    victim_info: VictimInfo;
    priority: PriorityLevel;
    raw_message: string;
    source: RescueTicket['source'];
  }
): RescueTicket {
  const now = Date.now();
  return {
    ticket_id: generateTicketId(),
    status: 'OPEN',
    priority: params.priority,
    location: params.location,
    victim_info: params.victim_info,
    raw_message: params.raw_message,
    source: params.source,
    created_at: now,
    updated_at: now,
  };
}









