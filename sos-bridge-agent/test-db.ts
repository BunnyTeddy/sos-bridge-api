/**
 * Test database connection
 * Run: npx tsx test-db.ts
 */

import 'dotenv/config';

const url = process.env.DATABASE_URL;

console.log('\n🔍 Checking DATABASE_URL...\n');

if (!url) {
  console.log('❌ DATABASE_URL is not set in .env file!');
  console.log('\nAdd this to your .env file:');
  console.log('DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres\n');
  process.exit(1);
}

// Mask password for display
const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
console.log('📝 DATABASE_URL:', maskedUrl);

// Parse URL
try {
  const urlObj = new URL(url);
  console.log('\n📋 Parsed connection info:');
  console.log('   Protocol:', urlObj.protocol);
  console.log('   Host:', urlObj.hostname);
  console.log('   Port:', urlObj.port || '5432');
  console.log('   User:', urlObj.username);
  console.log('   Database:', urlObj.pathname.slice(1));
  
  // Check for common issues
  console.log('\n🔎 Checking for issues...');
  
  if (!urlObj.password) {
    console.log('⚠️  WARNING: No password in connection string!');
  }
  
  if (urlObj.hostname.includes('supabase')) {
    console.log('✅ Detected Supabase connection');
    
    if (urlObj.port === '6543') {
      console.log('✅ Using connection pooler (recommended)');
      // Pooler format: postgres.[project-ref]
      if (!urlObj.username.includes('.')) {
        console.log('❌ ERROR: For pooler, username should be "postgres.[PROJECT-REF]"');
        console.log('   Current:', urlObj.username);
        console.log('   Expected: postgres.aqmvlptgbgppeeforqoz');
      } else {
        const projectRef = urlObj.username.split('.')[1];
        console.log('   Project ref:', projectRef);
        if (projectRef !== 'aqmvlptgbgppeeforqoz') {
          console.log('⚠️  WARNING: Project ref might be wrong!');
          console.log('   Expected: aqmvlptgbgppeeforqoz');
        }
      }
    } else if (urlObj.port === '5432' || !urlObj.port) {
      console.log('✅ Using direct connection');
      // Direct format: db.[project-ref].supabase.co
      const hostParts = urlObj.hostname.split('.');
      if (hostParts[0] === 'db') {
        const projectRef = hostParts[1];
        console.log('   Project ref:', projectRef);
        if (projectRef !== 'aqmvlptgbgppeeforqoz') {
          console.log('⚠️  WARNING: Project ref might be wrong!');
          console.log('   Expected: aqmvlptgbgppeeforqoz');
        }
      }
    }
  }
  
} catch (e) {
  console.log('❌ Invalid URL format!');
}

// Try to connect
console.log('\n🔌 Testing connection...\n');

import { Pool } from 'pg';

const isSupabase = url.includes('supabase');
const pool = new Pool({
  connectionString: url,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

pool.connect()
  .then(async (client) => {
    console.log('✅ Connected successfully!\n');
    
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('📊 Database info:');
    console.log('   Database:', result.rows[0].current_database);
    console.log('   User:', result.rows[0].current_user);
    console.log('   Version:', result.rows[0].version.split(',')[0]);
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in public schema:');
    if (tables.rows.length === 0) {
      console.log('   (no tables found - run schema.sql first)');
    } else {
      tables.rows.forEach((row: any) => console.log('   -', row.table_name));
    }
    
    client.release();
    await pool.end();
    console.log('\n✅ Test completed!\n');
  })
  .catch(async (err) => {
    console.log('❌ Connection failed!');
    console.log('\nError:', err.message);
    
    if (err.message.includes('Tenant or user not found')) {
      console.log('\n💡 FIX: The project reference in your DATABASE_URL is wrong.');
      console.log('\nCorrect format for project aqmvlptgbgppeeforqoz:');
      console.log('\n  Option 1 (Pooler - recommended):');
      console.log('  DATABASE_URL=postgresql://postgres.aqmvlptgbgppeeforqoz:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres');
      console.log('\n  Option 2 (Direct):');
      console.log('  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.aqmvlptgbgppeeforqoz.supabase.co:5432/postgres');
    }
    
    if (err.message.includes('password authentication failed')) {
      console.log('\n💡 FIX: The password is wrong. Reset it at:');
      console.log('  https://supabase.com/dashboard/project/aqmvlptgbgppeeforqoz/settings/database');
    }
    
    await pool.end();
    process.exit(1);
  });







