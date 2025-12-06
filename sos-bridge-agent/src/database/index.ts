/**
 * Database Connection Manager
 * Provides PostgreSQL connection pool and utilities
 */

import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    // Detect if using Supabase (requires SSL)
    const isSupabase = databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com');
    
    pool = new Pool({
      connectionString: databaseUrl,
      // Supabase always requires SSL
      ssl: isSupabase ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Timeout after 10 seconds when connecting
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('[Database] Unexpected error on idle client:', err);
    });

    pool.on('connect', () => {
      console.log('[Database] New client connected to pool');
    });

    console.log('[Database] Connection pool initialized');
  }

  return pool;
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('[Database] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Database] Connection test failed:', error);
    return false;
  }
}

/**
 * Close the database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[Database] Connection pool closed');
  }
}

/**
 * Execute a query with automatic client management
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a query and return single row
 */
export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Export pool type for typing
export type { Pool, PoolClient };

// Note: getPool is already exported above via `export function getPool()`




