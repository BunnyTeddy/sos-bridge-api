-- ============================================
-- SOS-Bridge Database Schema
-- PostgreSQL Database for Production
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- RESCUERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rescuers (
    rescuer_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    -- Location
    location_lat DECIMAL(10, 8) NOT NULL DEFAULT 0,
    location_lng DECIMAL(11, 8) NOT NULL DEFAULT 0,
    location_updated_at BIGINT,
    -- Vehicle
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'other',
    vehicle_capacity INTEGER NOT NULL DEFAULT 2,
    -- Wallet & Registration
    wallet_address VARCHAR(42),
    telegram_user_id BIGINT,
    telegram_chat_id BIGINT,
    registration_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Stats
    rating DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
    completed_missions INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    last_active_at BIGINT,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('ONLINE', 'OFFLINE', 'IDLE', 'BUSY', 'ON_MISSION')),
    CONSTRAINT valid_vehicle_type CHECK (vehicle_type IN ('cano', 'boat', 'kayak', 'raft', 'other')),
    CONSTRAINT valid_registration_status CHECK (registration_status IN ('pending', 'verified', 'active', 'suspended')),
    CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5)
);

-- Indexes for rescuers
CREATE INDEX IF NOT EXISTS idx_rescuers_status ON rescuers(status);
CREATE INDEX IF NOT EXISTS idx_rescuers_telegram_user_id ON rescuers(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_rescuers_phone ON rescuers(phone);
CREATE INDEX IF NOT EXISTS idx_rescuers_location ON rescuers(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_rescuers_registration_status ON rescuers(registration_status);

-- ============================================
-- RESCUE TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rescue_tickets (
    ticket_id VARCHAR(50) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    priority INTEGER NOT NULL DEFAULT 3,
    -- Location
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    address_text TEXT,
    -- Victim info
    victim_phone VARCHAR(20),
    victim_people_count INTEGER NOT NULL DEFAULT 1,
    victim_note TEXT,
    victim_has_elderly BOOLEAN DEFAULT FALSE,
    victim_has_children BOOLEAN DEFAULT FALSE,
    victim_has_disabled BOOLEAN DEFAULT FALSE,
    -- Assignment
    assigned_rescuer_id VARCHAR(50) REFERENCES rescuers(rescuer_id),
    -- Source
    raw_message TEXT,
    source VARCHAR(30) NOT NULL DEFAULT 'direct',
    telegram_user_id BIGINT,
    -- Verification
    verification_image_url TEXT,
    verification_is_valid BOOLEAN,
    verification_human_detected BOOLEAN,
    verification_flood_detected BOOLEAN,
    verification_confidence DECIMAL(5, 2),
    verification_metadata_valid BOOLEAN,
    verification_notes TEXT,
    -- Timestamps
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    verified_at BIGINT,
    completed_at BIGINT,
    
    -- Constraints
    CONSTRAINT valid_ticket_status CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'VERIFIED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 5),
    CONSTRAINT valid_source CHECK (source IN ('telegram_form', 'telegram_forward', 'direct'))
);

-- Indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_status ON rescue_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON rescue_tickets(priority DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_victim_phone ON rescue_tickets(victim_phone);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_rescuer ON rescue_tickets(assigned_rescuer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_location ON rescue_tickets(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON rescue_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_telegram_user ON rescue_tickets(telegram_user_id);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    tx_id VARCHAR(50) PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL REFERENCES rescue_tickets(ticket_id),
    rescuer_id VARCHAR(50) NOT NULL REFERENCES rescuers(rescuer_id),
    rescuer_wallet VARCHAR(42) NOT NULL,
    amount_usdc DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    tx_hash VARCHAR(66),
    block_number BIGINT,
    network VARCHAR(30) NOT NULL DEFAULT 'base_sepolia',
    error_message TEXT,
    gas_used VARCHAR(50),
    gas_price VARCHAR(50),
    -- Timestamps
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    confirmed_at BIGINT,
    
    -- Constraints
    CONSTRAINT valid_tx_status CHECK (status IN ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED')),
    CONSTRAINT valid_network CHECK (network IN ('base_sepolia', 'base_mainnet', 'ethereum_sepolia', 'ethereum_mainnet'))
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_ticket ON transactions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_rescuer ON transactions(rescuer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- PHONE TO TICKET MAPPING (for deduplication)
-- ============================================
CREATE TABLE IF NOT EXISTS phone_ticket_map (
    phone VARCHAR(20) PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL REFERENCES rescue_tickets(ticket_id),
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================
-- AGENT SESSIONS TABLE (for IQAI ADK persistence)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    app_name VARCHAR(100) NOT NULL DEFAULT 'sos-bridge',
    state_json JSONB NOT NULL DEFAULT '{}',
    -- Timestamps
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Indexes for agent_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_app_name ON agent_sessions(app_name);
CREATE INDEX IF NOT EXISTS idx_sessions_user_app ON agent_sessions(user_id, app_name);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON agent_sessions(updated_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lng1 DECIMAL,
    lat2 DECIMAL,
    lng2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R CONSTANT DECIMAL := 6371; -- Earth's radius in km
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlng := RADIANS(lng2 - lng1);
    a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng/2) * SIN(dlng/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find rescuers within radius
CREATE OR REPLACE FUNCTION find_rescuers_in_radius(
    target_lat DECIMAL,
    target_lng DECIMAL,
    radius_km DECIMAL DEFAULT 5
) RETURNS TABLE (
    rescuer_id VARCHAR(50),
    name VARCHAR(255),
    distance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.rescuer_id,
        r.name,
        calculate_distance(target_lat, target_lng, r.location_lat, r.location_lng) AS distance
    FROM rescuers r
    WHERE r.status IN ('ONLINE', 'IDLE')
      AND r.registration_status = 'active'
      AND calculate_distance(target_lat, target_lng, r.location_lat, r.location_lng) <= radius_km
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DEMO DATA (Optional - for development)
-- ============================================
-- Run: npm run db:seed to populate with test data




