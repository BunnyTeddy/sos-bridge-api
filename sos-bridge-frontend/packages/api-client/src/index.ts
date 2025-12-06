// ============================================
// SOS-Bridge API Client
// ============================================

import type {
  RescueTicket,
  Rescuer,
  RewardTransaction,
  TreasuryInfo,
  SystemStats,
  ApiResponse,
  PaginatedResponse,
  TicketStatus,
  RescuerStatus,
} from '@sos-bridge/types';

// ============ CONFIGURATION ============

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

// ============ API CLIENT CLASS ============

// Debug logging helper
const DEBUG = true; // Set to false in production

function debugLog(category: string, message: string, data?: unknown) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[API ${timestamp}] [${category}] ${message}`, data !== undefined ? data : '');
  }
}

function debugError(category: string, message: string, error?: unknown) {
  const timestamp = new Date().toISOString();
  console.error(`[API ${timestamp}] [${category}] ERROR: ${message}`, error !== undefined ? error : '');
}

export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    debugLog('INIT', `API Client initialized with baseUrl: ${this.baseUrl}`);
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    const requestId = Math.random().toString(36).substring(7);
    
    debugLog('REQUEST', `[${requestId}] ${method} ${url}`, {
      headers: this.headers,
      body: options.body ? JSON.parse(options.body as string) : undefined,
    });

    try {
      const startTime = Date.now();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      const duration = Date.now() - startTime;
      debugLog('RESPONSE', `[${requestId}] Status: ${response.status} (${duration}ms)`);

      // Try to parse response as JSON
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
          debugLog('RESPONSE', `[${requestId}] Data received:`, data);
        } catch (parseError) {
          debugError('PARSE', `[${requestId}] Failed to parse JSON response`, parseError);
          return {
            success: false,
            error: `Failed to parse server response: ${parseError}`,
          };
        }
      } else {
        const text = await response.text();
        debugError('RESPONSE', `[${requestId}] Non-JSON response:`, text.substring(0, 200));
        return {
          success: false,
          error: `Server returned non-JSON response: ${text.substring(0, 100)}`,
        };
      }

      if (!response.ok) {
        const errorMsg = (data as any)?.error || (data as any)?.message || `HTTP ${response.status}`;
        debugError('RESPONSE', `[${requestId}] Request failed:`, errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      debugLog('SUCCESS', `[${requestId}] Request completed successfully`);
      return {
        success: true,
        data,
      };
    } catch (error) {
      // Detailed network error logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      
      debugError('NETWORK', `[${requestId}] ${errorName}: ${errorMessage}`, {
        url,
        method,
        errorType: errorName,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Check for specific error types
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        return {
          success: false,
          error: `Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại. (${errorMessage})`,
        };
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        return {
          success: false,
          error: `Yêu cầu quá thời gian chờ. Vui lòng thử lại. (${errorMessage})`,
        };
      }

      return {
        success: false,
        error: `Lỗi: ${errorMessage}`,
      };
    }
  }

  // ============ TICKET ENDPOINTS ============

  async getTickets(params?: {
    status?: TicketStatus;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<RescueTicket>>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return this.fetch(`/tickets${queryString ? `?${queryString}` : ''}`);
  }

  async getTicket(ticketId: string): Promise<ApiResponse<RescueTicket>> {
    return this.fetch(`/tickets/${ticketId}`);
  }

  async createTicket(data: {
    phone: string;
    lat: number;
    lng: number;
    address_text: string;
    people_count: number;
    priority: number;
    note?: string;
    has_elderly?: boolean;
    has_children?: boolean;
    telegram_user_id?: number;
  }): Promise<ApiResponse<RescueTicket>> {
    return this.fetch('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTicket(
    ticketId: string,
    updates: Partial<RescueTicket>
  ): Promise<ApiResponse<RescueTicket>> {
    return this.fetch(`/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async assignRescuer(
    ticketId: string,
    rescuerId: string
  ): Promise<ApiResponse<RescueTicket>> {
    return this.fetch(`/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ rescuer_id: rescuerId }),
    });
  }

  // ============ RESCUER ENDPOINTS ============

  async getRescuers(params?: {
    status?: RescuerStatus;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Rescuer>>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return this.fetch(`/rescuers${queryString ? `?${queryString}` : ''}`);
  }

  async getRescuer(rescuerId: string): Promise<ApiResponse<Rescuer>> {
    return this.fetch(`/rescuers/${rescuerId}`);
  }

  async getRescuerByTelegramId(telegramId: number): Promise<ApiResponse<Rescuer>> {
    return this.fetch(`/rescuers/telegram/${telegramId}`);
  }

  async updateRescuer(
    rescuerId: string,
    updates: Partial<Rescuer>
  ): Promise<ApiResponse<Rescuer>> {
    return this.fetch(`/rescuers/${rescuerId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async createRescuer(data: {
    name: string;
    phone: string;
    vehicle_type: string;
    vehicle_capacity?: number;
    lat?: number;
    lng?: number;
    telegram_user_id?: number;
    wallet_address?: string;
  }): Promise<ApiResponse<Rescuer>> {
    return this.fetch('/rescuers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRescuerStatus(
    rescuerId: string,
    status: RescuerStatus
  ): Promise<ApiResponse<Rescuer>> {
    return this.fetch(`/rescuers/${rescuerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateRescuerLocation(
    rescuerId: string,
    lat: number,
    lng: number
  ): Promise<ApiResponse<Rescuer>> {
    return this.fetch(`/rescuers/${rescuerId}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ lat, lng }),
    });
  }

  async getNearbyRescuers(
    lat: number,
    lng: number,
    radiusKm: number = 5
  ): Promise<ApiResponse<Array<Rescuer & { distance: number }>>> {
    return this.fetch(`/rescuers/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
  }

  // ============ TRANSACTION ENDPOINTS ============

  async getTransactions(params?: {
    ticket_id?: string;
    rescuer_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<RewardTransaction>>> {
    const query = new URLSearchParams();
    if (params?.ticket_id) query.set('ticket_id', params.ticket_id);
    if (params?.rescuer_id) query.set('rescuer_id', params.rescuer_id);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return this.fetch(`/transactions${queryString ? `?${queryString}` : ''}`);
  }

  async manualPayout(data: {
    ticket_id: string;
    rescuer_id: string;
    amount_usdc: number;
  }): Promise<ApiResponse<RewardTransaction>> {
    return this.fetch('/transactions/payout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ TREASURY ENDPOINTS ============

  async getTreasury(): Promise<ApiResponse<TreasuryInfo>> {
    return this.fetch('/treasury');
  }

  // ============ STATS ENDPOINTS ============

  async getStats(): Promise<ApiResponse<SystemStats>> {
    return this.fetch('/stats');
  }

  // ============ MISSION ENDPOINTS (For Mini App) ============

  async acceptMission(
    ticketId: string,
    rescuerId: string
  ): Promise<ApiResponse<RescueTicket>> {
    return this.fetch(`/missions/${ticketId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ rescuer_id: rescuerId }),
    });
  }

  async declineMission(
    ticketId: string,
    rescuerId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.fetch(`/missions/${ticketId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ rescuer_id: rescuerId }),
    });
  }

  async completeMission(
    ticketId: string,
    imageUrl: string
  ): Promise<ApiResponse<RescueTicket>> {
    return this.fetch(`/missions/${ticketId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl }),
    });
  }

  async getActiveMission(rescuerId: string): Promise<ApiResponse<RescueTicket | null>> {
    return this.fetch(`/missions/active/${rescuerId}`);
  }

  async getNearbyMissions(
    lat: number,
    lng: number,
    radiusKm: number = 5
  ): Promise<ApiResponse<RescueTicket[]>> {
    return this.fetch(`/missions/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
  }
}

// ============ SINGLETON INSTANCE ============

export const apiClient = new ApiClient();

// ============ REACT QUERY HOOKS HELPERS ============

export const queryKeys = {
  tickets: {
    all: ['tickets'] as const,
    list: (filters?: Record<string, unknown>) => ['tickets', 'list', filters] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
  },
  rescuers: {
    all: ['rescuers'] as const,
    list: (filters?: Record<string, unknown>) => ['rescuers', 'list', filters] as const,
    detail: (id: string) => ['rescuers', 'detail', id] as const,
    byTelegram: (id: number) => ['rescuers', 'telegram', id] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters?: Record<string, unknown>) => ['transactions', 'list', filters] as const,
  },
  treasury: ['treasury'] as const,
  stats: ['stats'] as const,
  missions: {
    nearby: (lat: number, lng: number) => ['missions', 'nearby', lat, lng] as const,
    active: (rescuerId: string) => ['missions', 'active', rescuerId] as const,
  },
};





