/**
 * Store Factory
 * Provides unified interface for data storage
 * Switches between MemoryStore and DatabaseStore based on configuration
 */

import { MemoryStore, store as memoryStoreInstance } from './memory-store.js';
import { DatabaseStore, databaseStore } from './database-store.js';
import { isDatabaseConfigured } from '../database/index.js';
import type { RescueTicket, TicketStatus, Location, VictimInfo, PriorityLevel } from '../models/rescue-ticket.js';
import type { Rescuer, RescuerStatus, VehicleType } from '../models/rescuer.js';
import type { RewardTransaction } from '../models/transaction.js';

/**
 * Store interface that both MemoryStore and DatabaseStore implement
 */
export interface IStore {
  // Ticket operations
  addTicket(ticket: RescueTicket): RescueTicket | Promise<RescueTicket>;
  createAndAddTicket(params: {
    location: Location;
    victim_info: VictimInfo;
    priority: PriorityLevel;
    raw_message: string;
    source: RescueTicket['source'];
  }): RescueTicket | Promise<RescueTicket>;
  getTicket(ticketId: string): RescueTicket | undefined | Promise<RescueTicket | undefined>;
  getAllTickets(): RescueTicket[] | Promise<RescueTicket[]>;
  getTicketsByStatus(status: TicketStatus): RescueTicket[] | Promise<RescueTicket[]>;
  updateTicket(ticketId: string, updates: Partial<RescueTicket>): RescueTicket | undefined | Promise<RescueTicket | undefined>;
  updateTicketStatus(ticketId: string, status: TicketStatus): RescueTicket | undefined | Promise<RescueTicket | undefined>;
  findTicketByPhone(phone: string): RescueTicket | undefined | Promise<RescueTicket | undefined>;
  findTicketsInRadius(lat: number, lng: number, radiusKm: number): RescueTicket[] | Promise<RescueTicket[]>;
  hasActiveTicketNearby(lat: number, lng: number, radiusKm?: number): boolean | Promise<boolean>;

  // Rescuer operations
  addRescuer(rescuer: Rescuer): Rescuer | Promise<Rescuer>;
  createAndAddRescuer(params: {
    name: string;
    phone: string;
    location: { lat: number; lng: number };
    vehicle_type: VehicleType;
    vehicle_capacity: number;
    telegram_user_id?: number;
    wallet_address?: string;
  }): Rescuer | Promise<Rescuer>;
  getRescuer(rescuerId: string): Rescuer | undefined | Promise<Rescuer | undefined>;
  getAllRescuers(): Rescuer[] | Promise<Rescuer[]>;
  updateRescuer(rescuerId: string, updates: Partial<Rescuer>): Rescuer | undefined | Promise<Rescuer | undefined>;
  updateRescuerStatus(rescuerId: string, status: RescuerStatus): Rescuer | undefined | Promise<Rescuer | undefined>;
  updateRescuerLocation(rescuerId: string, lat: number, lng: number): Rescuer | undefined | Promise<Rescuer | undefined>;
  findAvailableRescuersInRadius(lat: number, lng: number, radiusKm?: number): Array<Rescuer & { distance: number }> | Promise<Array<Rescuer & { distance: number }>>;
  findBestRescuerForTicket(ticket: RescueTicket, radiusKm?: number): (Rescuer & { distance: number; score: number }) | undefined | Promise<(Rescuer & { distance: number; score: number }) | undefined>;

  // Transaction operations
  addTransaction(transaction: RewardTransaction): RewardTransaction | Promise<RewardTransaction>;
  getTransaction(txId: string): RewardTransaction | undefined | Promise<RewardTransaction | undefined>;
  updateTransaction(txId: string, updates: Partial<RewardTransaction>): RewardTransaction | undefined | Promise<RewardTransaction | undefined>;
  getAllTransactions(): RewardTransaction[] | Promise<RewardTransaction[]>;
  getTransactionsByTicket(ticketId: string): RewardTransaction[] | Promise<RewardTransaction[]>;
  getTransactionsByRescuer(rescuerId: string): RewardTransaction[] | Promise<RewardTransaction[]>;
  getTotalDisbursed(): number | Promise<number>;
  getTransactionCount(): number | Promise<number>;

  // Statistics
  getStats(): ReturnType<MemoryStore['getStats']> | Promise<ReturnType<MemoryStore['getStats']>>;

  // Utility
  clear(): void | Promise<void>;
  seedDemoData(): void | Promise<void>;
}

/**
 * Determine storage type from environment
 */
export type StoreType = 'memory' | 'database';

export function getStoreType(): StoreType {
  return isDatabaseConfigured() ? 'database' : 'memory';
}

/**
 * Get the appropriate store instance based on configuration
 */
export function getStore(): MemoryStore | DatabaseStore {
  const storeType = getStoreType();
  
  if (storeType === 'database') {
    console.log('[Store] Using DatabaseStore (PostgreSQL)');
    return databaseStore;
  }
  
  console.log('[Store] Using MemoryStore (in-memory)');
  return memoryStoreInstance;
}

/**
 * Check if using database store
 */
export function isUsingDatabase(): boolean {
  return getStoreType() === 'database';
}

/**
 * Helper to ensure async operations work with both store types
 * Wraps potentially synchronous values in Promise.resolve()
 */
export function ensureAsync<T>(value: T | Promise<T>): Promise<T> {
  return Promise.resolve(value);
}

// Re-export stores
export { MemoryStore, store as memoryStore } from './memory-store.js';
export { DatabaseStore, databaseStore } from './database-store.js';

// Re-export session services (Phase 1 Upgrade)
export {
  PostgresSessionService,
  InMemorySessionService,
  getSessionService,
  createSessionService,
  getUnifiedSessionService,
  type Session,
  type SessionState,
  type SessionServiceOptions,
  type UnifiedSessionService,
} from './session-store.js';

// Singleton store instance - automatically selects based on DATABASE_URL
let _storeInstance: MemoryStore | DatabaseStore | null = null;

/**
 * Get the singleton store instance
 * Uses DatabaseStore if DATABASE_URL is configured, otherwise MemoryStore
 */
export function getStoreInstance(): MemoryStore | DatabaseStore {
  if (!_storeInstance) {
    _storeInstance = getStore();
  }
  return _storeInstance;
}

// Default export - automatically selects the right store
// This provides backward compatibility while enabling database support
export const store = {
  // Ticket operations - wrapped for async support
  addTicket: async (ticket: RescueTicket) => ensureAsync(getStoreInstance().addTicket(ticket)),
  createAndAddTicket: async (params: Parameters<IStore['createAndAddTicket']>[0]) => 
    ensureAsync(getStoreInstance().createAndAddTicket(params)),
  getTicket: async (ticketId: string) => ensureAsync(getStoreInstance().getTicket(ticketId)),
  getAllTickets: async () => ensureAsync(getStoreInstance().getAllTickets()),
  getTicketsByStatus: async (status: TicketStatus) => ensureAsync(getStoreInstance().getTicketsByStatus(status)),
  updateTicket: async (ticketId: string, updates: Partial<RescueTicket>) => 
    ensureAsync(getStoreInstance().updateTicket(ticketId, updates)),
  updateTicketStatus: async (ticketId: string, status: TicketStatus) => 
    ensureAsync(getStoreInstance().updateTicketStatus(ticketId, status)),
  findTicketByPhone: async (phone: string) => ensureAsync(getStoreInstance().findTicketByPhone(phone)),
  findTicketsInRadius: async (lat: number, lng: number, radiusKm: number) => 
    ensureAsync(getStoreInstance().findTicketsInRadius(lat, lng, radiusKm)),
  hasActiveTicketNearby: async (lat: number, lng: number, radiusKm?: number) => 
    ensureAsync(getStoreInstance().hasActiveTicketNearby(lat, lng, radiusKm)),
  
  // Rescuer operations
  addRescuer: async (rescuer: Rescuer) => ensureAsync(getStoreInstance().addRescuer(rescuer)),
  createAndAddRescuer: async (params: Parameters<IStore['createAndAddRescuer']>[0]) => 
    ensureAsync(getStoreInstance().createAndAddRescuer(params)),
  getRescuer: async (rescuerId: string) => ensureAsync(getStoreInstance().getRescuer(rescuerId)),
  getAllRescuers: async () => ensureAsync(getStoreInstance().getAllRescuers()),
  updateRescuer: async (rescuerId: string, updates: Partial<Rescuer>) => 
    ensureAsync(getStoreInstance().updateRescuer(rescuerId, updates)),
  updateRescuerStatus: async (rescuerId: string, status: RescuerStatus) => 
    ensureAsync(getStoreInstance().updateRescuerStatus(rescuerId, status)),
  updateRescuerLocation: async (rescuerId: string, lat: number, lng: number) => 
    ensureAsync(getStoreInstance().updateRescuerLocation(rescuerId, lat, lng)),
  findAvailableRescuersInRadius: async (lat: number, lng: number, radiusKm?: number) => 
    ensureAsync(getStoreInstance().findAvailableRescuersInRadius(lat, lng, radiusKm)),
  findBestRescuerForTicket: async (ticket: RescueTicket, radiusKm?: number) => 
    ensureAsync(getStoreInstance().findBestRescuerForTicket(ticket, radiusKm)),
  
  // Transaction operations
  addTransaction: async (tx: RewardTransaction) => ensureAsync(getStoreInstance().addTransaction(tx)),
  getTransaction: async (txId: string) => ensureAsync(getStoreInstance().getTransaction(txId)),
  updateTransaction: async (txId: string, updates: Partial<RewardTransaction>) => 
    ensureAsync(getStoreInstance().updateTransaction(txId, updates)),
  getAllTransactions: async () => ensureAsync(getStoreInstance().getAllTransactions()),
  getTransactionsByTicket: async (ticketId: string) => 
    ensureAsync(getStoreInstance().getTransactionsByTicket(ticketId)),
  getTransactionsByRescuer: async (rescuerId: string) => 
    ensureAsync(getStoreInstance().getTransactionsByRescuer(rescuerId)),
  getTotalDisbursed: async () => ensureAsync(getStoreInstance().getTotalDisbursed()),
  getTransactionCount: async () => ensureAsync(getStoreInstance().getTransactionCount()),
  
  // Statistics
  getStats: async () => ensureAsync(getStoreInstance().getStats()),
  
  // Utility
  clear: async () => ensureAsync(getStoreInstance().clear()),
  seedDemoData: async () => ensureAsync(getStoreInstance().seedDemoData()),
};
