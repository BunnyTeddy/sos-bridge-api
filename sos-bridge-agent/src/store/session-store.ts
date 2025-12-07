/**
 * PostgreSQL Session Store for IQAI ADK
 * Provides persistent session storage for agent workflows
 */

import { getPool, isDatabaseConfigured, query, queryOne } from '../database/index.js';

// ============ TYPES ============

export interface SessionState {
  [key: string]: unknown;
}

export interface Session {
  id: string;
  userId: string;
  appName: string;
  state: SessionState;
  createdAt: number;
  updatedAt: number;
}

export interface SessionServiceOptions {
  tableName?: string;
  defaultAppName?: string;
}

// ============ DATABASE ROW TYPE ============

interface SessionRow {
  session_id: string;
  user_id: string;
  app_name: string;
  state_json: SessionState;
  created_at: string | number;
  updated_at: string | number;
}

// ============ SESSION SERVICE CLASS ============

/**
 * PostgreSQL-backed Session Service for IQAI ADK
 * Implements persistent session storage with automatic state serialization
 */
export class PostgresSessionService {
  private tableName: string;
  private defaultAppName: string;
  private initialized: boolean = false;

  constructor(options: SessionServiceOptions = {}) {
    this.tableName = options.tableName || 'agent_sessions';
    this.defaultAppName = options.defaultAppName || 'sos-bridge';
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(userId: string, appName: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${appName}_${userId}_${timestamp}_${random}`;
  }

  /**
   * Convert database row to Session object
   */
  private rowToSession(row: SessionRow): Session {
    return {
      id: row.session_id,
      userId: row.user_id,
      appName: row.app_name,
      state: row.state_json || {},
      createdAt: typeof row.created_at === 'string' ? parseInt(row.created_at) : row.created_at,
      updatedAt: typeof row.updated_at === 'string' ? parseInt(row.updated_at) : row.updated_at,
    };
  }

  /**
   * Check if database is available
   */
  isAvailable(): boolean {
    return isDatabaseConfigured();
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    appName?: string,
    initialState?: SessionState
  ): Promise<Session> {
    if (!this.isAvailable()) {
      throw new Error('Database is not configured');
    }

    const sessionId = this.generateSessionId(userId, appName || this.defaultAppName);
    const now = Date.now();
    const state = initialState || {};

    const sql = `
      INSERT INTO ${this.tableName} (session_id, user_id, app_name, state_json, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const rows = await query<SessionRow>(sql, [
      sessionId,
      userId,
      appName || this.defaultAppName,
      JSON.stringify(state),
      now,
      now,
    ]);

    if (rows.length === 0) {
      throw new Error('Failed to create session');
    }

    console.log(`[SessionService] Created session: ${sessionId} for user: ${userId}`);
    return this.rowToSession(rows[0]);
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const sql = `SELECT * FROM ${this.tableName} WHERE session_id = $1`;
    const row = await queryOne<SessionRow>(sql, [sessionId]);

    if (!row) {
      return null;
    }

    return this.rowToSession(row);
  }

  /**
   * Get session by user ID and app name (find existing or return null)
   */
  async getSessionByUser(userId: string, appName?: string): Promise<Session | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE user_id = $1 AND app_name = $2
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const row = await queryOne<SessionRow>(sql, [userId, appName || this.defaultAppName]);

    if (!row) {
      return null;
    }

    return this.rowToSession(row);
  }

  /**
   * Get or create a session for a user
   */
  async getOrCreateSession(
    userId: string,
    appName?: string,
    initialState?: SessionState
  ): Promise<Session> {
    // Try to find existing session
    const existing = await this.getSessionByUser(userId, appName);
    if (existing) {
      console.log(`[SessionService] Found existing session: ${existing.id}`);
      return existing;
    }

    // Create new session
    return this.createSession(userId, appName, initialState);
  }

  /**
   * Update session state
   */
  async updateSession(sessionId: string, state: SessionState): Promise<Session | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const now = Date.now();
    const sql = `
      UPDATE ${this.tableName}
      SET state_json = $1, updated_at = $2
      WHERE session_id = $3
      RETURNING *
    `;

    const rows = await query<SessionRow>(sql, [JSON.stringify(state), now, sessionId]);

    if (rows.length === 0) {
      console.warn(`[SessionService] Session not found for update: ${sessionId}`);
      return null;
    }

    console.log(`[SessionService] Updated session: ${sessionId}`);
    return this.rowToSession(rows[0]);
  }

  /**
   * Merge state into existing session state
   */
  async mergeState(sessionId: string, partialState: SessionState): Promise<Session | null> {
    const existing = await this.getSession(sessionId);
    if (!existing) {
      return null;
    }

    const mergedState = {
      ...existing.state,
      ...partialState,
    };

    return this.updateSession(sessionId, mergedState);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const sql = `DELETE FROM ${this.tableName} WHERE session_id = $1`;
    await query(sql, [sessionId]);

    console.log(`[SessionService] Deleted session: ${sessionId}`);
    return true;
  }

  /**
   * Delete old sessions (cleanup)
   * @param maxAgeMs Maximum age in milliseconds (default: 7 days)
   */
  async cleanupOldSessions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    const cutoff = Date.now() - maxAgeMs;
    const sql = `DELETE FROM ${this.tableName} WHERE updated_at < $1`;
    
    const pool = getPool();
    const result = await pool.query(sql, [cutoff]);
    const deleted = result.rowCount || 0;

    console.log(`[SessionService] Cleaned up ${deleted} old sessions`);
    return deleted;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY updated_at DESC
    `;

    const rows = await query<SessionRow>(sql, [userId]);
    return rows.map((row) => this.rowToSession(row));
  }

  /**
   * Get session count
   */
  async getSessionCount(): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const row = await queryOne<{ count: string }>(sql);
    return row ? parseInt(row.count) : 0;
  }
}

// ============ SINGLETON INSTANCE ============

let sessionServiceInstance: PostgresSessionService | null = null;

/**
 * Get or create the singleton PostgresSessionService instance
 */
export function getSessionService(): PostgresSessionService {
  if (!sessionServiceInstance) {
    sessionServiceInstance = new PostgresSessionService();
  }
  return sessionServiceInstance;
}

/**
 * Create a new PostgresSessionService with custom options
 */
export function createSessionService(options?: SessionServiceOptions): PostgresSessionService {
  return new PostgresSessionService(options);
}

// ============ IN-MEMORY FALLBACK ============

/**
 * In-memory session storage for when database is not available
 */
export class InMemorySessionService {
  private sessions: Map<string, Session> = new Map();
  private defaultAppName: string;

  constructor(options: SessionServiceOptions = {}) {
    this.defaultAppName = options.defaultAppName || 'sos-bridge';
  }

  private generateSessionId(userId: string, appName: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${appName}_${userId}_${timestamp}_${random}`;
  }

  isAvailable(): boolean {
    return true;
  }

  async createSession(
    userId: string,
    appName?: string,
    initialState?: SessionState
  ): Promise<Session> {
    const sessionId = this.generateSessionId(userId, appName || this.defaultAppName);
    const now = Date.now();

    const session: Session = {
      id: sessionId,
      userId,
      appName: appName || this.defaultAppName,
      state: initialState || {},
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);
    console.log(`[InMemorySessionService] Created session: ${sessionId}`);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getSessionByUser(userId: string, appName?: string): Promise<Session | null> {
    const app = appName || this.defaultAppName;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.appName === app) {
        return session;
      }
    }
    return null;
  }

  async getOrCreateSession(
    userId: string,
    appName?: string,
    initialState?: SessionState
  ): Promise<Session> {
    const existing = await this.getSessionByUser(userId, appName);
    if (existing) return existing;
    return this.createSession(userId, appName, initialState);
  }

  async updateSession(sessionId: string, state: SessionState): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.state = state;
    session.updatedAt = Date.now();
    return session;
  }

  async mergeState(sessionId: string, partialState: SessionState): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.state = { ...session.state, ...partialState };
    session.updatedAt = Date.now();
    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async cleanupOldSessions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.updatedAt < cutoff) {
        this.sessions.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    const sessions: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getSessionCount(): Promise<number> {
    return this.sessions.size;
  }
}

// ============ UNIFIED SESSION SERVICE ============

export type UnifiedSessionService = PostgresSessionService | InMemorySessionService;

/**
 * Get the appropriate session service based on database availability
 */
export function getUnifiedSessionService(): UnifiedSessionService {
  if (isDatabaseConfigured()) {
    console.log('[SessionService] Using PostgresSessionService');
    return getSessionService();
  }
  console.log('[SessionService] Using InMemorySessionService (database not configured)');
  return new InMemorySessionService();
}








