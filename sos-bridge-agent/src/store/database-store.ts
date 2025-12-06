/**
 * DatabaseStore - PostgreSQL database storage
 * Production-ready persistent storage implementation
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
import { getPool, query, queryOne, transaction } from '../database/index.js';

// Extended Rescuer type with new fields for registration
export type RegistrationStatus = 'pending' | 'verified' | 'active' | 'suspended';

export interface ExtendedRescuer extends Rescuer {
  telegram_chat_id?: number;
  registration_status: RegistrationStatus;
  updated_at: number;
}

class DatabaseStore {
  // ==================== TICKET OPERATIONS ====================

  /**
   * Add a new ticket
   */
  async addTicket(ticket: RescueTicket): Promise<RescueTicket> {
    await query(`
      INSERT INTO rescue_tickets (
        ticket_id, status, priority,
        location_lat, location_lng, address_text,
        victim_phone, victim_people_count, victim_note,
        victim_has_elderly, victim_has_children, victim_has_disabled,
        assigned_rescuer_id, raw_message, source,
        telegram_user_id,
        verification_image_url, verification_is_valid,
        verification_human_detected, verification_flood_detected,
        verification_confidence, verification_metadata_valid,
        verification_notes,
        created_at, updated_at, verified_at, completed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
    `, [
      ticket.ticket_id, ticket.status, ticket.priority,
      ticket.location.lat, ticket.location.lng, ticket.location.address_text,
      ticket.victim_info.phone, ticket.victim_info.people_count, ticket.victim_info.note,
      ticket.victim_info.has_elderly, ticket.victim_info.has_children, ticket.victim_info.has_disabled,
      ticket.assigned_rescuer_id, ticket.raw_message, ticket.source,
      null, // telegram_user_id - extract from raw_message if needed
      ticket.verification_image_url,
      ticket.verification_result?.is_valid,
      ticket.verification_result?.human_detected,
      ticket.verification_result?.flood_scene_detected,
      ticket.verification_result?.confidence_score,
      ticket.verification_result?.metadata_valid,
      ticket.verification_result?.notes,
      ticket.created_at, ticket.updated_at, ticket.verified_at, ticket.completed_at,
    ]);

    // Update phone_ticket_map for deduplication
    if (ticket.victim_info.phone) {
      await query(`
        INSERT INTO phone_ticket_map (phone, ticket_id, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (phone) DO UPDATE SET ticket_id = $2
      `, [ticket.victim_info.phone, ticket.ticket_id, ticket.created_at]);
    }

    console.log(`[DatabaseStore] Added ticket: ${ticket.ticket_id}`);
    return ticket;
  }

  /**
   * Create and add a new ticket
   */
  async createAndAddTicket(params: {
    location: Location;
    victim_info: VictimInfo;
    priority: PriorityLevel;
    raw_message: string;
    source: RescueTicket['source'];
  }): Promise<RescueTicket> {
    const ticket = createRescueTicket(params);
    return this.addTicket(ticket);
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string): Promise<RescueTicket | undefined> {
    const row = await queryOne<TicketRow>(`
      SELECT * FROM rescue_tickets WHERE ticket_id = $1
    `, [ticketId]);

    return row ? this.rowToTicket(row) : undefined;
  }

  /**
   * Get all tickets
   */
  async getAllTickets(): Promise<RescueTicket[]> {
    const rows = await query<TicketRow>(`
      SELECT * FROM rescue_tickets ORDER BY created_at DESC
    `);
    return rows.map(this.rowToTicket);
  }

  /**
   * Get tickets by status
   */
  async getTicketsByStatus(status: TicketStatus): Promise<RescueTicket[]> {
    const rows = await query<TicketRow>(`
      SELECT * FROM rescue_tickets WHERE status = $1 ORDER BY priority DESC, created_at ASC
    `, [status]);
    return rows.map(this.rowToTicket);
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, updates: Partial<RescueTicket>): Promise<RescueTicket | undefined> {
    const now = Date.now();
    const setClauses: string[] = ['updated_at = $1'];
    const values: unknown[] = [now];
    let paramIndex = 2;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }
    if (updates.assigned_rescuer_id !== undefined) {
      setClauses.push(`assigned_rescuer_id = $${paramIndex++}`);
      values.push(updates.assigned_rescuer_id);
    }
    if (updates.verified_at !== undefined) {
      setClauses.push(`verified_at = $${paramIndex++}`);
      values.push(updates.verified_at);
    }
    if (updates.completed_at !== undefined) {
      setClauses.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completed_at);
    }
    if (updates.verification_image_url !== undefined) {
      setClauses.push(`verification_image_url = $${paramIndex++}`);
      values.push(updates.verification_image_url);
    }
    if (updates.verification_result !== undefined) {
      setClauses.push(`verification_is_valid = $${paramIndex++}`);
      values.push(updates.verification_result.is_valid);
      setClauses.push(`verification_human_detected = $${paramIndex++}`);
      values.push(updates.verification_result.human_detected);
      setClauses.push(`verification_flood_detected = $${paramIndex++}`);
      values.push(updates.verification_result.flood_scene_detected);
      setClauses.push(`verification_confidence = $${paramIndex++}`);
      values.push(updates.verification_result.confidence_score);
      setClauses.push(`verification_metadata_valid = $${paramIndex++}`);
      values.push(updates.verification_result.metadata_valid);
      setClauses.push(`verification_notes = $${paramIndex++}`);
      values.push(updates.verification_result.notes);
    }

    values.push(ticketId);

    const rows = await query<TicketRow>(`
      UPDATE rescue_tickets 
      SET ${setClauses.join(', ')}
      WHERE ticket_id = $${paramIndex}
      RETURNING *
    `, values);

    if (rows.length === 0) return undefined;

    console.log(`[DatabaseStore] Updated ticket: ${ticketId}, status: ${rows[0].status}`);
    return this.rowToTicket(rows[0]);
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<RescueTicket | undefined> {
    return this.updateTicket(ticketId, { status });
  }

  /**
   * Find ticket by phone (for deduplication)
   */
  async findTicketByPhone(phone: string): Promise<RescueTicket | undefined> {
    const row = await queryOne<{ ticket_id: string }>(`
      SELECT ticket_id FROM phone_ticket_map WHERE phone = $1
    `, [phone]);

    if (!row) return undefined;
    return this.getTicket(row.ticket_id);
  }

  /**
   * Find tickets within radius
   */
  async findTicketsInRadius(lat: number, lng: number, radiusKm: number): Promise<RescueTicket[]> {
    const rows = await query<TicketRow>(`
      SELECT *, calculate_distance($1, $2, location_lat, location_lng) as distance
      FROM rescue_tickets
      WHERE calculate_distance($1, $2, location_lat, location_lng) <= $3
      ORDER BY distance ASC
    `, [lat, lng, radiusKm]);

    return rows.map(this.rowToTicket);
  }

  /**
   * Check if active ticket exists nearby
   */
  async hasActiveTicketNearby(lat: number, lng: number, radiusKm: number = 0.05): Promise<boolean> {
    const row = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM rescue_tickets
      WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')
        AND calculate_distance($1, $2, location_lat, location_lng) <= $3
    `, [lat, lng, radiusKm]);

    return row ? parseInt(row.count) > 0 : false;
  }

  // ==================== RESCUER OPERATIONS ====================

  /**
   * Add a new rescuer
   */
  async addRescuer(rescuer: Rescuer): Promise<Rescuer> {
    const now = Date.now();
    await query(`
      INSERT INTO rescuers (
        rescuer_id, name, phone, status,
        location_lat, location_lng, location_updated_at,
        vehicle_type, vehicle_capacity, wallet_address,
        telegram_user_id, telegram_chat_id, registration_status,
        rating, completed_missions,
        created_at, updated_at, last_active_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      rescuer.rescuer_id, rescuer.name, rescuer.phone, rescuer.status,
      rescuer.location.lat, rescuer.location.lng, rescuer.location.last_updated,
      rescuer.vehicle_type, rescuer.vehicle_capacity, rescuer.wallet_address,
      rescuer.telegram_user_id, null, 'pending',
      rescuer.rating, rescuer.completed_missions,
      rescuer.created_at, now, rescuer.last_active_at,
    ]);

    console.log(`[DatabaseStore] Added rescuer: ${rescuer.rescuer_id} (${rescuer.name})`);
    return rescuer;
  }

  /**
   * Create and add a new rescuer
   */
  async createAndAddRescuer(params: {
    name: string;
    phone: string;
    location: { lat: number; lng: number };
    vehicle_type: VehicleType;
    vehicle_capacity: number;
    telegram_user_id?: number;
    wallet_address?: string;
  }): Promise<Rescuer> {
    const rescuer = createRescuer(params);
    return this.addRescuer(rescuer);
  }

  /**
   * Get rescuer by ID
   */
  async getRescuer(rescuerId: string): Promise<Rescuer | undefined> {
    const row = await queryOne<RescuerRow>(`
      SELECT * FROM rescuers WHERE rescuer_id = $1
    `, [rescuerId]);

    return row ? this.rowToRescuer(row) : undefined;
  }

  /**
   * Get rescuer by Telegram user ID
   */
  async getRescuerByTelegramId(telegramUserId: number): Promise<ExtendedRescuer | undefined> {
    const row = await queryOne<RescuerRow>(`
      SELECT * FROM rescuers WHERE telegram_user_id = $1
    `, [telegramUserId]);

    return row ? this.rowToExtendedRescuer(row) : undefined;
  }

  /**
   * Get all rescuers
   */
  async getAllRescuers(): Promise<Rescuer[]> {
    const rows = await query<RescuerRow>(`
      SELECT * FROM rescuers ORDER BY created_at DESC
    `);
    return rows.map(this.rowToRescuer);
  }

  /**
   * Update rescuer
   */
  async updateRescuer(rescuerId: string, updates: Partial<ExtendedRescuer>): Promise<Rescuer | undefined> {
    const now = Date.now();
    const setClauses: string[] = ['updated_at = $1', 'last_active_at = $1'];
    const values: unknown[] = [now];
    let paramIndex = 2;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(updates.phone);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.location !== undefined) {
      setClauses.push(`location_lat = $${paramIndex++}`);
      values.push(updates.location.lat);
      setClauses.push(`location_lng = $${paramIndex++}`);
      values.push(updates.location.lng);
      setClauses.push(`location_updated_at = $${paramIndex++}`);
      values.push(updates.location.last_updated || now);
    }
    if (updates.vehicle_type !== undefined) {
      setClauses.push(`vehicle_type = $${paramIndex++}`);
      values.push(updates.vehicle_type);
    }
    if (updates.vehicle_capacity !== undefined) {
      setClauses.push(`vehicle_capacity = $${paramIndex++}`);
      values.push(updates.vehicle_capacity);
    }
    if (updates.wallet_address !== undefined) {
      setClauses.push(`wallet_address = $${paramIndex++}`);
      values.push(updates.wallet_address);
    }
    if (updates.telegram_user_id !== undefined) {
      setClauses.push(`telegram_user_id = $${paramIndex++}`);
      values.push(updates.telegram_user_id);
    }
    if (updates.telegram_chat_id !== undefined) {
      setClauses.push(`telegram_chat_id = $${paramIndex++}`);
      values.push(updates.telegram_chat_id);
    }
    if (updates.registration_status !== undefined) {
      setClauses.push(`registration_status = $${paramIndex++}`);
      values.push(updates.registration_status);
    }
    if (updates.rating !== undefined) {
      setClauses.push(`rating = $${paramIndex++}`);
      values.push(updates.rating);
    }
    if (updates.completed_missions !== undefined) {
      setClauses.push(`completed_missions = $${paramIndex++}`);
      values.push(updates.completed_missions);
    }

    values.push(rescuerId);

    const rows = await query<RescuerRow>(`
      UPDATE rescuers
      SET ${setClauses.join(', ')}
      WHERE rescuer_id = $${paramIndex}
      RETURNING *
    `, values);

    if (rows.length === 0) return undefined;

    console.log(`[DatabaseStore] Updated rescuer: ${rescuerId}`);
    return this.rowToRescuer(rows[0]);
  }

  /**
   * Update rescuer status
   */
  async updateRescuerStatus(rescuerId: string, status: RescuerStatus): Promise<Rescuer | undefined> {
    return this.updateRescuer(rescuerId, { status });
  }

  /**
   * Update rescuer location
   */
  async updateRescuerLocation(rescuerId: string, lat: number, lng: number): Promise<Rescuer | undefined> {
    return this.updateRescuer(rescuerId, {
      location: {
        lat,
        lng,
        last_updated: Date.now(),
      },
    });
  }

  /**
   * Find available rescuers within radius
   */
  async findAvailableRescuersInRadius(
    lat: number,
    lng: number,
    radiusKm: number = 5
  ): Promise<Array<Rescuer & { distance: number }>> {
    const rows = await query<RescuerRow & { distance: number }>(`
      SELECT *, calculate_distance($1, $2, location_lat, location_lng) as distance
      FROM rescuers
      WHERE status IN ('ONLINE', 'IDLE')
        AND registration_status = 'active'
        AND calculate_distance($1, $2, location_lat, location_lng) <= $3
      ORDER BY distance ASC
    `, [lat, lng, radiusKm]);

    return rows.map(row => ({
      ...this.rowToRescuer(row),
      distance: Number(row.distance),
    }));
  }

  /**
   * Find best rescuer for a ticket
   */
  async findBestRescuerForTicket(
    ticket: RescueTicket,
    radiusKm: number = 5
  ): Promise<(Rescuer & { distance: number; score: number }) | undefined> {
    const candidates = await this.findAvailableRescuersInRadius(
      ticket.location.lat,
      ticket.location.lng,
      radiusKm
    );

    if (candidates.length === 0) return undefined;

    // Score each rescuer
    const scored = candidates.map(r => {
      let score = 0;
      
      // Distance score (closer is better)
      score += Math.max(0, 100 - r.distance * 20);
      
      // Vehicle type score
      if (r.vehicle_type === 'cano') score += 30;
      else if (r.vehicle_type === 'boat') score += 20;
      
      // Capacity score
      if (r.vehicle_capacity >= ticket.victim_info.people_count) {
        score += 20;
      }
      
      // Rating score
      score += r.rating * 5;
      
      // Experience score
      score += Math.min(r.completed_missions, 20);

      return { ...r, score };
    });

    // Sort by score and return best
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  // ==================== TRANSACTION OPERATIONS ====================

  /**
   * Add a new transaction
   */
  async addTransaction(tx: RewardTransaction): Promise<RewardTransaction> {
    await query(`
      INSERT INTO transactions (
        tx_id, ticket_id, rescuer_id, rescuer_wallet,
        amount_usdc, status, tx_hash, block_number, network,
        error_message, gas_used, gas_price,
        created_at, confirmed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      tx.tx_id, tx.ticket_id, tx.rescuer_id, tx.rescuer_wallet,
      tx.amount_usdc, tx.status, tx.tx_hash, tx.block_number, tx.network,
      tx.error_message, tx.gas_used, tx.gas_price,
      tx.created_at, tx.confirmed_at,
    ]);

    console.log(`[DatabaseStore] Added transaction: ${tx.tx_id} for ticket ${tx.ticket_id}`);
    return tx;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<RewardTransaction | undefined> {
    const row = await queryOne<TransactionRow>(`
      SELECT * FROM transactions WHERE tx_id = $1
    `, [txId]);

    return row ? this.rowToTransaction(row) : undefined;
  }

  /**
   * Update transaction
   */
  async updateTransaction(txId: string, updates: Partial<RewardTransaction>): Promise<RewardTransaction | undefined> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.tx_hash !== undefined) {
      setClauses.push(`tx_hash = $${paramIndex++}`);
      values.push(updates.tx_hash);
    }
    if (updates.block_number !== undefined) {
      setClauses.push(`block_number = $${paramIndex++}`);
      values.push(updates.block_number);
    }
    if (updates.confirmed_at !== undefined) {
      setClauses.push(`confirmed_at = $${paramIndex++}`);
      values.push(updates.confirmed_at);
    }
    if (updates.error_message !== undefined) {
      setClauses.push(`error_message = $${paramIndex++}`);
      values.push(updates.error_message);
    }
    if (updates.gas_used !== undefined) {
      setClauses.push(`gas_used = $${paramIndex++}`);
      values.push(updates.gas_used);
    }
    if (updates.gas_price !== undefined) {
      setClauses.push(`gas_price = $${paramIndex++}`);
      values.push(updates.gas_price);
    }

    if (setClauses.length === 0) return this.getTransaction(txId);

    values.push(txId);

    const rows = await query<TransactionRow>(`
      UPDATE transactions
      SET ${setClauses.join(', ')}
      WHERE tx_id = $${paramIndex}
      RETURNING *
    `, values);

    if (rows.length === 0) return undefined;

    console.log(`[DatabaseStore] Updated transaction: ${txId}, status: ${rows[0].status}`);
    return this.rowToTransaction(rows[0]);
  }

  /**
   * Get all transactions
   */
  async getAllTransactions(): Promise<RewardTransaction[]> {
    const rows = await query<TransactionRow>(`
      SELECT * FROM transactions ORDER BY created_at DESC
    `);
    return rows.map(this.rowToTransaction);
  }

  /**
   * Get transactions by ticket ID
   */
  async getTransactionsByTicket(ticketId: string): Promise<RewardTransaction[]> {
    const rows = await query<TransactionRow>(`
      SELECT * FROM transactions WHERE ticket_id = $1 ORDER BY created_at DESC
    `, [ticketId]);
    return rows.map(this.rowToTransaction);
  }

  /**
   * Get transactions by rescuer ID
   */
  async getTransactionsByRescuer(rescuerId: string): Promise<RewardTransaction[]> {
    const rows = await query<TransactionRow>(`
      SELECT * FROM transactions WHERE rescuer_id = $1 ORDER BY created_at DESC
    `, [rescuerId]);
    return rows.map(this.rowToTransaction);
  }

  /**
   * Get total disbursed amount
   */
  async getTotalDisbursed(): Promise<number> {
    const row = await queryOne<{ total: string }>(`
      SELECT COALESCE(SUM(amount_usdc), 0) as total
      FROM transactions
      WHERE status = 'CONFIRMED'
    `);
    return row ? parseFloat(row.total) : 0;
  }

  /**
   * Get transaction count
   */
  async getTransactionCount(): Promise<number> {
    const row = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM transactions
    `);
    return row ? parseInt(row.count) : 0;
  }

  // ==================== STATISTICS ====================

  /**
   * Get overall statistics
   */
  async getStats() {
    const [ticketStats, rescuerStats, txStats] = await Promise.all([
      query<{ status: string; count: string }>(`
        SELECT status, COUNT(*) as count FROM rescue_tickets GROUP BY status
      `),
      query<{ status: string; count: string }>(`
        SELECT status, COUNT(*) as count FROM rescuers GROUP BY status
      `),
      query<{ status: string; count: string; total: string }>(`
        SELECT status, COUNT(*) as count, COALESCE(SUM(amount_usdc), 0) as total 
        FROM transactions GROUP BY status
      `),
    ]);

    const ticketCounts = ticketStats.reduce((acc, row) => {
      acc[row.status.toLowerCase()] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);

    const rescuerCounts = rescuerStats.reduce((acc, row) => {
      acc[row.status.toLowerCase()] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);

    const txCounts = txStats.reduce((acc, row) => {
      acc[row.status.toLowerCase()] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);

    const totalDisbursed = txStats
      .filter(t => t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + parseFloat(t.total), 0);

    return {
      tickets: {
        total: Object.values(ticketCounts).reduce((a, b) => a + b, 0),
        open: ticketCounts['open'] || 0,
        assigned: ticketCounts['assigned'] || 0,
        in_progress: ticketCounts['in_progress'] || 0,
        verified: ticketCounts['verified'] || 0,
        completed: ticketCounts['completed'] || 0,
      },
      rescuers: {
        total: Object.values(rescuerCounts).reduce((a, b) => a + b, 0),
        online: (rescuerCounts['online'] || 0) + (rescuerCounts['idle'] || 0),
        on_mission: (rescuerCounts['on_mission'] || 0) + (rescuerCounts['busy'] || 0),
        offline: rescuerCounts['offline'] || 0,
      },
      transactions: {
        total: Object.values(txCounts).reduce((a, b) => a + b, 0),
        pending: txCounts['pending'] || 0,
        submitted: txCounts['submitted'] || 0,
        confirmed: txCounts['confirmed'] || 0,
        failed: txCounts['failed'] || 0,
        total_disbursed_usdc: totalDisbursed,
      },
    };
  }

  /**
   * Clear all data (for testing)
   */
  async clear(): Promise<void> {
    await transaction(async (client) => {
      await client.query('DELETE FROM transactions');
      await client.query('DELETE FROM phone_ticket_map');
      await client.query('DELETE FROM rescue_tickets');
      await client.query('DELETE FROM rescuers');
    });
    console.log('[DatabaseStore] Cleared all data');
  }

  /**
   * Seed demo data (for testing)
   */
  async seedDemoData(): Promise<void> {
    // Use the seed script: npm run db:seed
    console.log('[DatabaseStore] Run "npm run db:seed" to seed demo data');
  }

  // ==================== HELPER METHODS ====================

  private rowToTicket(row: TicketRow): RescueTicket {
    const ticket: RescueTicket = {
      ticket_id: row.ticket_id,
      status: row.status as TicketStatus,
      priority: row.priority as PriorityLevel,
      location: {
        lat: parseFloat(String(row.location_lat)),
        lng: parseFloat(String(row.location_lng)),
        address_text: row.address_text || '',
      },
      victim_info: {
        phone: row.victim_phone || '',
        people_count: row.victim_people_count,
        note: row.victim_note || '',
        has_elderly: row.victim_has_elderly || false,
        has_children: row.victim_has_children || false,
        has_disabled: row.victim_has_disabled || false,
      },
      assigned_rescuer_id: row.assigned_rescuer_id || undefined,
      raw_message: row.raw_message || '',
      source: row.source as RescueTicket['source'],
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      verified_at: row.verified_at ? Number(row.verified_at) : undefined,
      completed_at: row.completed_at ? Number(row.completed_at) : undefined,
      verification_image_url: row.verification_image_url || undefined,
    };

    if (row.verification_is_valid !== null) {
      ticket.verification_result = {
        is_valid: row.verification_is_valid,
        human_detected: row.verification_human_detected || false,
        flood_scene_detected: row.verification_flood_detected || false,
        confidence_score: parseFloat(String(row.verification_confidence)) || 0,
        metadata_valid: row.verification_metadata_valid || false,
        notes: row.verification_notes || '',
      };
    }

    return ticket;
  }

  private rowToRescuer(row: RescuerRow): Rescuer {
    return {
      rescuer_id: row.rescuer_id,
      name: row.name,
      phone: row.phone,
      status: row.status as RescuerStatus,
      location: {
        lat: parseFloat(String(row.location_lat)),
        lng: parseFloat(String(row.location_lng)),
        last_updated: row.location_updated_at ? Number(row.location_updated_at) : Date.now(),
      },
      vehicle_type: row.vehicle_type as VehicleType,
      vehicle_capacity: row.vehicle_capacity,
      wallet_address: row.wallet_address || undefined,
      rating: parseFloat(String(row.rating)),
      completed_missions: row.completed_missions,
      telegram_user_id: row.telegram_user_id ? Number(row.telegram_user_id) : undefined,
      created_at: Number(row.created_at),
      last_active_at: row.last_active_at ? Number(row.last_active_at) : Date.now(),
    };
  }

  private rowToExtendedRescuer(row: RescuerRow): ExtendedRescuer {
    return {
      ...this.rowToRescuer(row),
      telegram_chat_id: row.telegram_chat_id ? Number(row.telegram_chat_id) : undefined,
      registration_status: row.registration_status as RegistrationStatus,
      updated_at: Number(row.updated_at),
    };
  }

  private rowToTransaction(row: TransactionRow): RewardTransaction {
    return {
      tx_id: row.tx_id,
      ticket_id: row.ticket_id,
      rescuer_id: row.rescuer_id,
      rescuer_wallet: row.rescuer_wallet,
      amount_usdc: parseFloat(String(row.amount_usdc)),
      status: row.status as RewardTransaction['status'],
      tx_hash: row.tx_hash || undefined,
      block_number: row.block_number ? Number(row.block_number) : undefined,
      network: row.network as RewardTransaction['network'],
      created_at: Number(row.created_at),
      confirmed_at: row.confirmed_at ? Number(row.confirmed_at) : undefined,
      error_message: row.error_message || undefined,
      gas_used: row.gas_used || undefined,
      gas_price: row.gas_price || undefined,
    };
  }
}

// Database row types
interface TicketRow {
  ticket_id: string;
  status: string;
  priority: number;
  location_lat: string | number;
  location_lng: string | number;
  address_text: string | null;
  victim_phone: string | null;
  victim_people_count: number;
  victim_note: string | null;
  victim_has_elderly: boolean | null;
  victim_has_children: boolean | null;
  victim_has_disabled: boolean | null;
  assigned_rescuer_id: string | null;
  raw_message: string | null;
  source: string;
  telegram_user_id: string | null;
  verification_image_url: string | null;
  verification_is_valid: boolean | null;
  verification_human_detected: boolean | null;
  verification_flood_detected: boolean | null;
  verification_confidence: string | number | null;
  verification_metadata_valid: boolean | null;
  verification_notes: string | null;
  created_at: string | number;
  updated_at: string | number;
  verified_at: string | number | null;
  completed_at: string | number | null;
}

interface RescuerRow {
  rescuer_id: string;
  name: string;
  phone: string;
  status: string;
  location_lat: string | number;
  location_lng: string | number;
  location_updated_at: string | number | null;
  vehicle_type: string;
  vehicle_capacity: number;
  wallet_address: string | null;
  telegram_user_id: string | number | null;
  telegram_chat_id: string | number | null;
  registration_status: string;
  rating: string | number;
  completed_missions: number;
  created_at: string | number;
  updated_at: string | number;
  last_active_at: string | number | null;
}

interface TransactionRow {
  tx_id: string;
  ticket_id: string;
  rescuer_id: string;
  rescuer_wallet: string;
  amount_usdc: string | number;
  status: string;
  tx_hash: string | null;
  block_number: string | number | null;
  network: string;
  error_message: string | null;
  gas_used: string | null;
  gas_price: string | null;
  created_at: string | number;
  confirmed_at: string | number | null;
}

// Singleton instance
export const databaseStore = new DatabaseStore();
export { DatabaseStore };









