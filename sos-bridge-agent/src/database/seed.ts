/**
 * Database Seed Script
 * Run: npm run db:seed
 */

import 'dotenv/config';
import { Pool } from 'pg';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🌱 Starting database seeding...\n');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    // Clear existing data (for development only)
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM transactions');
    await client.query('DELETE FROM phone_ticket_map');
    await client.query('DELETE FROM rescue_tickets');
    await client.query('DELETE FROM rescuers');

    // Seed rescuers
    console.log('👥 Seeding rescuers...');
    const now = Date.now();

    const rescuers = [
      {
        rescuer_id: 'RSC_DEMO_001',
        name: 'Đội Cứu Hộ Hải Thượng',
        phone: '0901234567',
        status: 'IDLE',
        location_lat: 16.7650,
        location_lng: 107.1230,
        location_updated_at: now,
        vehicle_type: 'cano',
        vehicle_capacity: 8,
        wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5C000',
        registration_status: 'active',
        rating: 4.8,
        completed_missions: 15,
        created_at: now,
        updated_at: now,
        last_active_at: now,
      },
      {
        rescuer_id: 'RSC_DEMO_002',
        name: 'Anh Minh - Thuyền Cứu Hộ',
        phone: '0912345678',
        status: 'ONLINE',
        location_lat: 16.7700,
        location_lng: 107.1280,
        location_updated_at: now,
        vehicle_type: 'boat',
        vehicle_capacity: 5,
        wallet_address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        registration_status: 'active',
        rating: 4.9,
        completed_missions: 23,
        created_at: now,
        updated_at: now,
        last_active_at: now,
      },
      {
        rescuer_id: 'RSC_DEMO_003',
        name: 'Nhóm Thanh Niên Xung Kích',
        phone: '0923456789',
        status: 'IDLE',
        location_lat: 16.7600,
        location_lng: 107.1180,
        location_updated_at: now,
        vehicle_type: 'kayak',
        vehicle_capacity: 2,
        wallet_address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
        registration_status: 'active',
        rating: 4.5,
        completed_missions: 8,
        created_at: now,
        updated_at: now,
        last_active_at: now,
      },
    ];

    for (const rescuer of rescuers) {
      await client.query(`
        INSERT INTO rescuers (
          rescuer_id, name, phone, status, 
          location_lat, location_lng, location_updated_at,
          vehicle_type, vehicle_capacity, wallet_address,
          registration_status, rating, completed_missions,
          created_at, updated_at, last_active_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        rescuer.rescuer_id, rescuer.name, rescuer.phone, rescuer.status,
        rescuer.location_lat, rescuer.location_lng, rescuer.location_updated_at,
        rescuer.vehicle_type, rescuer.vehicle_capacity, rescuer.wallet_address,
        rescuer.registration_status, rescuer.rating, rescuer.completed_missions,
        rescuer.created_at, rescuer.updated_at, rescuer.last_active_at,
      ]);
    }

    console.log(`   ✅ Seeded ${rescuers.length} rescuers`);

    // Seed a sample ticket
    console.log('🎫 Seeding sample tickets...');
    const sampleTicket = {
      ticket_id: 'SOS_VN_DEMO_001',
      status: 'COMPLETED',
      priority: 5,
      location_lat: 16.7654,
      location_lng: 107.1234,
      address_text: 'Xóm Bàu, Xã Hải Thượng, Quảng Trị',
      victim_phone: '0909888777',
      victim_people_count: 3,
      victim_note: 'Người già, Trẻ em, Nước ngập mái',
      victim_has_elderly: true,
      victim_has_children: true,
      victim_has_disabled: false,
      assigned_rescuer_id: 'RSC_DEMO_001',
      raw_message: 'Cấp cứu! Nhà ông Bảy ở xóm Bàu nước lên gần mái...',
      source: 'telegram_forward',
      created_at: now - 3600000, // 1 hour ago
      updated_at: now,
      verified_at: now - 1800000, // 30 min ago
      completed_at: now,
    };

    await client.query(`
      INSERT INTO rescue_tickets (
        ticket_id, status, priority,
        location_lat, location_lng, address_text,
        victim_phone, victim_people_count, victim_note,
        victim_has_elderly, victim_has_children, victim_has_disabled,
        assigned_rescuer_id, raw_message, source,
        created_at, updated_at, verified_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [
      sampleTicket.ticket_id, sampleTicket.status, sampleTicket.priority,
      sampleTicket.location_lat, sampleTicket.location_lng, sampleTicket.address_text,
      sampleTicket.victim_phone, sampleTicket.victim_people_count, sampleTicket.victim_note,
      sampleTicket.victim_has_elderly, sampleTicket.victim_has_children, sampleTicket.victim_has_disabled,
      sampleTicket.assigned_rescuer_id, sampleTicket.raw_message, sampleTicket.source,
      sampleTicket.created_at, sampleTicket.updated_at, sampleTicket.verified_at, sampleTicket.completed_at,
    ]);

    // Add to phone_ticket_map
    await client.query(`
      INSERT INTO phone_ticket_map (phone, ticket_id, created_at)
      VALUES ($1, $2, $3)
    `, [sampleTicket.victim_phone, sampleTicket.ticket_id, sampleTicket.created_at]);

    console.log(`   ✅ Seeded 1 sample ticket`);

    // Seed a sample transaction
    console.log('💰 Seeding sample transactions...');
    const sampleTransaction = {
      tx_id: 'TX_DEMO_001',
      ticket_id: 'SOS_VN_DEMO_001',
      rescuer_id: 'RSC_DEMO_001',
      rescuer_wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f5C000',
      amount_usdc: 25,
      status: 'CONFIRMED',
      tx_hash: '0x' + '1234567890abcdef'.repeat(4),
      block_number: 12345678,
      network: 'base_sepolia',
      created_at: now - 1200000, // 20 min ago
      confirmed_at: now - 600000, // 10 min ago
    };

    await client.query(`
      INSERT INTO transactions (
        tx_id, ticket_id, rescuer_id, rescuer_wallet,
        amount_usdc, status, tx_hash, block_number, network,
        created_at, confirmed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      sampleTransaction.tx_id, sampleTransaction.ticket_id,
      sampleTransaction.rescuer_id, sampleTransaction.rescuer_wallet,
      sampleTransaction.amount_usdc, sampleTransaction.status,
      sampleTransaction.tx_hash, sampleTransaction.block_number,
      sampleTransaction.network, sampleTransaction.created_at,
      sampleTransaction.confirmed_at,
    ]);

    console.log(`   ✅ Seeded 1 sample transaction`);

    client.release();
    console.log('\n✅ Database seeding completed!');

    // Show summary
    const summary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM rescuers) as rescuers,
        (SELECT COUNT(*) FROM rescue_tickets) as tickets,
        (SELECT COUNT(*) FROM transactions) as transactions
    `);
    console.log('\n📊 Summary:');
    console.log(`   Rescuers: ${summary.rows[0].rescuers}`);
    console.log(`   Tickets: ${summary.rows[0].tickets}`);
    console.log(`   Transactions: ${summary.rows[0].transactions}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();











