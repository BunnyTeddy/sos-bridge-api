/**
 * Database Migration Script
 * Run: npm run db:migrate
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    console.log('\nPlease set DATABASE_URL in your .env file:');
    console.log('DATABASE_URL=postgresql://user:password@localhost:5432/sosbridge\n');
    process.exit(1);
  }

  console.log('🚀 Starting database migration...\n');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('📄 Executing schema.sql...\n');

    // Execute schema
    await client.query(schema);

    console.log('✅ Schema created successfully!\n');

    // Show table info
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('📋 Created tables:');
    tables.rows.forEach((row) => {
      const marker = row.table_name === 'agent_sessions' ? ' (Phase 1 Upgrade)' : '';
      console.log(`   - ${row.table_name}${marker}`);
    });
    
    // Verify agent_sessions table for Phase 1
    const hasSessionsTable = tables.rows.some((r: { table_name: string }) => r.table_name === 'agent_sessions');
    if (hasSessionsTable) {
      console.log('\n✅ agent_sessions table ready for IQAI ADK persistent sessions');
    } else {
      console.warn('\n⚠️  agent_sessions table not found - session persistence will use fallback');
    }

    // Show index info
    const indexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY indexname
    `);

    console.log(`\n🔍 Created ${indexes.rows.length} indexes`);

    client.release();
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();




