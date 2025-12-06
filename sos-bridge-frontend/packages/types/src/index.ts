// ============================================
// SOS-Bridge Shared Types
// ============================================

// ============ TICKET TYPES ============

export type TicketStatus = 
  | 'OPEN' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'VERIFIED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

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

export interface VerificationResult {
  is_valid: boolean;
  human_detected: boolean;
  flood_scene_detected: boolean;
  confidence_score: number;
  metadata_valid: boolean;
  notes: string;
}

export interface RescueTicket {
  ticket_id: string;
  status: TicketStatus;
  priority: PriorityLevel;
  location: Location;
  victim_info: VictimInfo;
  assigned_rescuer_id?: string;
  assigned_rescuer?: Rescuer;
  raw_message: string;
  source: 'telegram_form' | 'telegram_forward' | 'direct';
  created_at: number;
  updated_at: number;
  verified_at?: number;
  completed_at?: number;
  verification_image_url?: string;
  verification_result?: VerificationResult;
}

// ============ RESCUER TYPES ============

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
  vehicle_capacity: number;
  wallet_address?: string;
  rating: number;
  completed_missions: number;
  telegram_user_id?: number;
  telegram_chat_id?: number;
  registration_status?: RegistrationStatus;
  created_at: number;
  updated_at?: number;
  last_active_at: number;
}

// ============ TRANSACTION TYPES ============

export type TransactionStatus = 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

export interface RewardTransaction {
  tx_id: string;
  ticket_id: string;
  rescuer_id: string;
  rescuer_wallet: string;
  amount_usdc: number;
  status: TransactionStatus;
  tx_hash?: string;
  block_number?: number;
  network: 'base_sepolia' | 'base_mainnet' | 'ethereum_sepolia' | 'ethereum_mainnet';
  created_at: number;
  confirmed_at?: number;
  error_message?: string;
  gas_used?: string;
  gas_price?: string;
}

export interface TreasuryInfo {
  wallet_address: string;
  balance_usdc: number;
  total_disbursed: number;
  total_transactions: number;
  network: string;
  last_updated: number;
}

// ============ STATS TYPES ============

export interface TicketStats {
  total: number;
  open: number;
  assigned: number;
  in_progress: number;
  verified: number;
  completed: number;
}

export interface RescuerStats {
  total: number;
  online: number;
  on_mission: number;
  offline: number;
}

export interface TransactionStats {
  total: number;
  pending: number;
  submitted: number;
  confirmed: number;
  failed: number;
  total_disbursed_usdc: number;
}

export interface SystemStats {
  tickets: TicketStats;
  rescuers: RescuerStats;
  transactions: TransactionStats;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============ CONSTANTS ============

export const VEHICLE_TYPE_NAMES: Record<VehicleType, string> = {
  cano: 'Ca nô',
  boat: 'Thuyền',
  kayak: 'Thuyền kayak',
  raft: 'Bè mảng',
  other: 'Khác',
};

export const VEHICLE_TYPE_EMOJIS: Record<VehicleType, string> = {
  cano: '🚤',
  boat: '⛵',
  kayak: '🛶',
  raft: '🏊',
  other: '🔧',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: '#ef4444',
  ASSIGNED: '#f97316',
  IN_PROGRESS: '#eab308',
  VERIFIED: '#22c55e',
  COMPLETED: '#3b82f6',
  CANCELLED: '#6b7280',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Đang mở',
  ASSIGNED: 'Đã gán',
  IN_PROGRESS: 'Đang xử lý',
  VERIFIED: 'Đã xác thực',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  1: 'Thấp',
  2: 'Trung bình',
  3: 'Cao',
  4: 'Rất cao',
  5: 'KHẨN CẤP',
};

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};







