/**
 * MemoryStore - In-memory database cho MVP
 * Lưu trữ tickets, rescuers và transactions trong bộ nhớ
 */

import { 
  RescueTicket, 
  TicketStatus, 
  createRescueTicket,
  type Location,
  type VictimInfo,
  type PriorityLevel
} from '../models/rescue-ticket.js';
import { 
  Rescuer, 
  RescuerStatus, 
  createRescuer,
  calculateDistance,
  type VehicleType
} from '../models/rescuer.js';
import type { RewardTransaction } from '../models/transaction.js';

class MemoryStore {
  private tickets: Map<string, RescueTicket> = new Map();
  private rescuers: Map<string, Rescuer> = new Map();
  private transactions: Map<string, RewardTransaction> = new Map();
  private phoneToTicketId: Map<string, string> = new Map(); // For deduplication

  // ==================== TICKET OPERATIONS ====================

  /**
   * Thêm ticket mới
   */
  addTicket(ticket: RescueTicket): RescueTicket {
    this.tickets.set(ticket.ticket_id, ticket);
    // Index by phone for dedup
    if (ticket.victim_info.phone) {
      this.phoneToTicketId.set(ticket.victim_info.phone, ticket.ticket_id);
    }
    console.log(`[Store] Added ticket: ${ticket.ticket_id}`);
    return ticket;
  }

  /**
   * Tạo và thêm ticket mới
   */
  createAndAddTicket(params: {
    location: Location;
    victim_info: VictimInfo;
    priority: PriorityLevel;
    raw_message: string;
    source: RescueTicket['source'];
  }): RescueTicket {
    const ticket = createRescueTicket(params);
    return this.addTicket(ticket);
  }

  /**
   * Lấy ticket theo ID
   */
  getTicket(ticketId: string): RescueTicket | undefined {
    return this.tickets.get(ticketId);
  }

  /**
   * Lấy tất cả tickets
   */
  getAllTickets(): RescueTicket[] {
    return Array.from(this.tickets.values());
  }

  /**
   * Lấy tickets theo status
   */
  getTicketsByStatus(status: TicketStatus): RescueTicket[] {
    return this.getAllTickets().filter(t => t.status === status);
  }

  /**
   * Cập nhật ticket
   */
  updateTicket(ticketId: string, updates: Partial<RescueTicket>): RescueTicket | undefined {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return undefined;

    const updated = {
      ...ticket,
      ...updates,
      updated_at: Date.now(),
    };
    this.tickets.set(ticketId, updated);
    console.log(`[Store] Updated ticket: ${ticketId}, status: ${updated.status}`);
    return updated;
  }

  /**
   * Cập nhật status của ticket
   */
  updateTicketStatus(ticketId: string, status: TicketStatus): RescueTicket | undefined {
    return this.updateTicket(ticketId, { status });
  }

  /**
   * Check trùng lặp theo số điện thoại
   */
  findTicketByPhone(phone: string): RescueTicket | undefined {
    const ticketId = this.phoneToTicketId.get(phone);
    if (ticketId) {
      return this.tickets.get(ticketId);
    }
    return undefined;
  }

  /**
   * Tìm tickets trong bán kính (km) từ một điểm
   */
  findTicketsInRadius(lat: number, lng: number, radiusKm: number): RescueTicket[] {
    return this.getAllTickets().filter(ticket => {
      const distance = calculateDistance(lat, lng, ticket.location.lat, ticket.location.lng);
      return distance <= radiusKm;
    });
  }

  /**
   * Check xem có ticket nào đang pending/processing gần vị trí không
   */
  hasActiveTicketNearby(lat: number, lng: number, radiusKm: number = 0.05): boolean {
    const activeStatuses: TicketStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'];
    return this.getAllTickets().some(ticket => {
      if (!activeStatuses.includes(ticket.status)) return false;
      const distance = calculateDistance(lat, lng, ticket.location.lat, ticket.location.lng);
      return distance <= radiusKm;
    });
  }

  // ==================== RESCUER OPERATIONS ====================

  /**
   * Thêm rescuer mới
   */
  addRescuer(rescuer: Rescuer): Rescuer {
    this.rescuers.set(rescuer.rescuer_id, rescuer);
    console.log(`[Store] Added rescuer: ${rescuer.rescuer_id} (${rescuer.name})`);
    return rescuer;
  }

  /**
   * Tạo và thêm rescuer mới
   */
  createAndAddRescuer(params: {
    name: string;
    phone: string;
    location: { lat: number; lng: number };
    vehicle_type: VehicleType;
    vehicle_capacity: number;
    telegram_user_id?: number;
    wallet_address?: string;
  }): Rescuer {
    const rescuer = createRescuer(params);
    return this.addRescuer(rescuer);
  }

  /**
   * Lấy rescuer theo ID
   */
  getRescuer(rescuerId: string): Rescuer | undefined {
    return this.rescuers.get(rescuerId);
  }

  /**
   * Lấy tất cả rescuers
   */
  getAllRescuers(): Rescuer[] {
    return Array.from(this.rescuers.values());
  }

  /**
   * Cập nhật rescuer
   */
  updateRescuer(rescuerId: string, updates: Partial<Rescuer>): Rescuer | undefined {
    const rescuer = this.rescuers.get(rescuerId);
    if (!rescuer) return undefined;

    const updated = {
      ...rescuer,
      ...updates,
      last_active_at: Date.now(),
    };
    this.rescuers.set(rescuerId, updated);
    console.log(`[Store] Updated rescuer: ${rescuerId}`);
    return updated;
  }

  /**
   * Cập nhật status của rescuer
   */
  updateRescuerStatus(rescuerId: string, status: RescuerStatus): Rescuer | undefined {
    return this.updateRescuer(rescuerId, { status });
  }

  /**
   * Cập nhật vị trí của rescuer
   */
  updateRescuerLocation(rescuerId: string, lat: number, lng: number): Rescuer | undefined {
    return this.updateRescuer(rescuerId, {
      location: {
        lat,
        lng,
        last_updated: Date.now(),
      },
    });
  }

  /**
   * Tìm rescuers đang rảnh trong bán kính
   */
  findAvailableRescuersInRadius(
    lat: number,
    lng: number,
    radiusKm: number = 5
  ): Array<Rescuer & { distance: number }> {
    const availableStatuses: RescuerStatus[] = ['ONLINE', 'IDLE'];
    
    return this.getAllRescuers()
      .filter(r => availableStatuses.includes(r.status))
      .map(r => ({
        ...r,
        distance: calculateDistance(lat, lng, r.location.lat, r.location.lng),
      }))
      .filter(r => r.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance); // Sắp xếp theo khoảng cách
  }

  /**
   * Tìm rescuer phù hợp nhất cho một ticket
   * Ưu tiên: Khoảng cách gần + Cano (cho vùng ngập sâu)
   */
  findBestRescuerForTicket(
    ticket: RescueTicket,
    radiusKm: number = 5
  ): (Rescuer & { distance: number; score: number }) | undefined {
    const candidates = this.findAvailableRescuersInRadius(
      ticket.location.lat,
      ticket.location.lng,
      radiusKm
    );

    if (candidates.length === 0) return undefined;

    // Tính điểm cho mỗi rescuer
    const scored = candidates.map(r => {
      let score = 0;
      
      // Điểm cho khoảng cách (càng gần càng tốt)
      score += Math.max(0, 100 - r.distance * 20);
      
      // Điểm cho loại phương tiện
      if (r.vehicle_type === 'cano') score += 30;
      else if (r.vehicle_type === 'boat') score += 20;
      
      // Điểm cho capacity (nếu cần chở nhiều người)
      if (r.vehicle_capacity >= ticket.victim_info.people_count) {
        score += 20;
      }
      
      // Điểm cho rating
      score += r.rating * 5;
      
      // Điểm cho kinh nghiệm
      score += Math.min(r.completed_missions, 20);

      return { ...r, score };
    });

    // Sắp xếp theo điểm và trả về người tốt nhất
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  // ==================== TRANSACTION OPERATIONS ====================

  /**
   * Thêm transaction mới
   */
  addTransaction(transaction: RewardTransaction): RewardTransaction {
    this.transactions.set(transaction.tx_id, transaction);
    console.log(`[Store] Added transaction: ${transaction.tx_id} for ticket ${transaction.ticket_id}`);
    return transaction;
  }

  /**
   * Lấy transaction theo ID
   */
  getTransaction(txId: string): RewardTransaction | undefined {
    return this.transactions.get(txId);
  }

  /**
   * Cập nhật transaction
   */
  updateTransaction(txId: string, updates: Partial<RewardTransaction>): RewardTransaction | undefined {
    const transaction = this.transactions.get(txId);
    if (!transaction) return undefined;

    const updated = {
      ...transaction,
      ...updates,
    };
    this.transactions.set(txId, updated);
    console.log(`[Store] Updated transaction: ${txId}, status: ${updated.status}`);
    return updated;
  }

  /**
   * Lấy tất cả transactions
   */
  getAllTransactions(): RewardTransaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Lấy transactions theo ticket ID
   */
  getTransactionsByTicket(ticketId: string): RewardTransaction[] {
    return this.getAllTransactions().filter(t => t.ticket_id === ticketId);
  }

  /**
   * Lấy transactions theo rescuer ID
   */
  getTransactionsByRescuer(rescuerId: string): RewardTransaction[] {
    return this.getAllTransactions().filter(t => t.rescuer_id === rescuerId);
  }

  /**
   * Tính tổng số tiền đã giải ngân
   */
  getTotalDisbursed(): number {
    return this.getAllTransactions()
      .filter(t => t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount_usdc, 0);
  }

  /**
   * Đếm số lượng transactions
   */
  getTransactionCount(): number {
    return this.transactions.size;
  }

  // ==================== STATISTICS ====================

  /**
   * Lấy thống kê tổng quan
   */
  getStats() {
    const tickets = this.getAllTickets();
    const rescuers = this.getAllRescuers();
    const transactions = this.getAllTransactions();

    return {
      tickets: {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'OPEN').length,
        assigned: tickets.filter(t => t.status === 'ASSIGNED').length,
        in_progress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        verified: tickets.filter(t => t.status === 'VERIFIED').length,
        completed: tickets.filter(t => t.status === 'COMPLETED').length,
      },
      rescuers: {
        total: rescuers.length,
        online: rescuers.filter(r => r.status === 'ONLINE' || r.status === 'IDLE').length,
        on_mission: rescuers.filter(r => r.status === 'ON_MISSION' || r.status === 'BUSY').length,
        offline: rescuers.filter(r => r.status === 'OFFLINE').length,
      },
      transactions: {
        total: transactions.length,
        pending: transactions.filter(t => t.status === 'PENDING').length,
        submitted: transactions.filter(t => t.status === 'SUBMITTED').length,
        confirmed: transactions.filter(t => t.status === 'CONFIRMED').length,
        failed: transactions.filter(t => t.status === 'FAILED').length,
        total_disbursed_usdc: this.getTotalDisbursed(),
      },
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.tickets.clear();
    this.rescuers.clear();
    this.transactions.clear();
    this.phoneToTicketId.clear();
    console.log('[Store] Cleared all data');
  }

  /**
   * Seed demo data (for testing)
   */
  seedDemoData(): void {
    // Thêm một số rescuers mẫu ở khu vực Quảng Trị với wallet addresses
    this.createAndAddRescuer({
      name: 'Đội Cứu Hộ Hải Thượng',
      phone: '0901234567',
      location: { lat: 16.7650, lng: 107.1230 },
      vehicle_type: 'cano',
      vehicle_capacity: 8,
      wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5C000', // Demo wallet
    });

    this.createAndAddRescuer({
      name: 'Anh Minh - Thuyền Cứu Hộ',
      phone: '0912345678',
      location: { lat: 16.7700, lng: 107.1280 },
      vehicle_type: 'boat',
      vehicle_capacity: 5,
      wallet_address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', // Demo wallet
    });

    this.createAndAddRescuer({
      name: 'Nhóm Thanh Niên Xung Kích',
      phone: '0923456789',
      location: { lat: 16.7600, lng: 107.1180 },
      vehicle_type: 'kayak',
      vehicle_capacity: 2,
      wallet_address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', // Demo wallet
    });

    console.log('[Store] Seeded demo data with 3 rescuers (with wallet addresses)');
  }
}

// Singleton instance
export const store = new MemoryStore();
export { MemoryStore };

