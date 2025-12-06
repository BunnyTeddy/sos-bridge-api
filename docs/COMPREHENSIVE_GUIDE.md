# SOS-Bridge: Comprehensive System Documentation

> **Hệ thống Điều phối Cứu hộ Lũ lụt bằng AI**  
> Decentralized AI-powered Flood Rescue Coordination System

---

## 📋 Table of Contents

1. [Tổng quan Dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc Hệ thống](#2-kiến-trúc-hệ-thống)
3. [Technology Stack](#3-technology-stack)
4. [Cấu trúc Thư mục](#4-cấu-trúc-thư-mục)
5. [Backend: SOS-Bridge Agent](#5-backend-sos-bridge-agent)
6. [Frontend: Mini App & Dashboard](#6-frontend-mini-app--dashboard)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [AI Workflow](#9-ai-workflow)
10. [Deployment Guide](#10-deployment-guide)
11. [Development Setup](#11-development-setup)
12. [Environment Variables](#12-environment-variables)
13. [Testing](#13-testing)

---

## 1. Tổng quan Dự án

### 1.1 Vấn đề

Trong các tình huống lũ lụt tại Việt Nam:
- Nạn nhân không biết cách gửi tin cầu cứu hiệu quả
- Thông tin cứu hộ bị phân tán, trùng lặp
- Thiếu hệ thống điều phối rescuer có tổ chức
- Không có cơ chế verify và reward cho người cứu hộ

### 1.2 Giải pháp

**SOS-Bridge** là hệ thống AI Agent điều phối cứu hộ:

```
┌─────────────────────────────────────────────────────────────────┐
│                        SOS-BRIDGE                               │
├─────────────────────────────────────────────────────────────────┤
│  🆘 Victim sends SOS    →  🤖 AI parses & deduplicates         │
│  📍 Location extracted  →  🚤 Rescuer assigned & notified      │
│  📷 Rescue verified     →  💰 USDC reward released             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Key Features

| Feature | Description |
|---------|-------------|
| **NLP Parsing** | Phân tích tin nhắn tiếng Việt, trích xuất thông tin |
| **Deduplication** | Gộp tin trùng lặp, tránh điều phối chồng chéo |
| **Smart Dispatch** | Tìm rescuer phù hợp dựa trên vị trí, vehicle, rating |
| **Vision Verify** | Xác minh rescue bằng AI phân tích ảnh |
| **DeFAI Rewards** | Tự động release USDC reward qua Base blockchain |

---

## 2. Kiến trúc Hệ thống

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                        │
├───────────────┬───────────────┬───────────────┬─────────────────────────┤
│  Telegram Bot │  Mini App     │  Dashboard    │  Direct API             │
│  (@lu_lut_bot)│  (Victim/     │  (Admin)      │  (Integration)          │
│               │   Rescuer)    │               │                         │
└───────┬───────┴───────┬───────┴───────┬───────┴───────────┬─────────────┘
        │               │               │                   │
        ▼               ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         REST API SERVER                                  │
│                    (Railway / localhost:3002)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  /api/tickets    /api/rescuers    /api/missions    /api/treasury        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────────┐    ┌───────────────────┐
│  AI Agents    │    │  Data Store       │    │  External APIs    │
│  (IQAI ADK)   │    │  (PostgreSQL/     │    │  - Nominatim      │
│               │    │   Memory)         │    │  - Gemini AI      │
│  - Listener   │    │                   │    │  - Base Sepolia   │
│  - Perceiver  │    │  Tables:          │    │                   │
│  - Dispatcher │    │  - tickets        │    │                   │
│  - Verifier   │    │  - rescuers       │    │                   │
│  - Rewarder   │    │  - transactions   │    │                   │
└───────────────┘    └───────────────────┘    └───────────────────┘
```

### 2.2 Data Flow

```
1. INTAKE FLOW (Victim → Ticket)
   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Raw SOS  │ --> │ Listener │ --> │ Perceiver│ --> │ Ticket   │
   │ Message  │     │ (NLP)    │     │ (Geocode)│     │ Created  │
   └──────────┘     └──────────┘     └──────────┘     └──────────┘

2. DISPATCH FLOW (Ticket → Rescuer)
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Open     │ --> │Dispatcher│ --> │ Rescuer  │
   │ Ticket   │     │ (Scout)  │     │ Notified │
   └──────────┘     └──────────┘     └──────────┘

3. COMPLETION FLOW (Rescue → Reward)
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Photo    │ --> │ Verifier │ --> │ Rewarder │
   │ Uploaded │     │ (Vision) │     │ (USDC)   │
   └──────────┘     └──────────┘     └──────────┘
```

---

## 3. Technology Stack

### 3.1 Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime | 18+ |
| **TypeScript** | Language | 5.x |
| **IQAI ADK-TS** | AI Agent Framework | 0.5.7 |
| **Gemini 2.0 Flash** | NLP & Vision AI | Latest |
| **PostgreSQL** | Database | 15+ |
| **ethers.js** | Blockchain interaction | 6.x |
| **node-telegram-bot-api** | Telegram integration | 0.66 |

### 3.2 Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React Framework |
| **TypeScript** | Language |
| **Tailwind CSS** | Styling |
| **React Query** | Data fetching |
| **Framer Motion** | Animations |
| **Leaflet** | Maps |
| **Recharts** | Charts (Dashboard) |
| **@tma.js/sdk-react** | Telegram Mini App SDK |

### 3.3 Infrastructure

| Service | Purpose |
|---------|---------|
| **Railway** | Backend hosting |
| **Vercel** | Frontend hosting |
| **Neon** | PostgreSQL database |
| **Base Sepolia** | Blockchain (testnet) |

---

## 4. Cấu trúc Thư mục

```
Flood AI AGENT/
├── sos-bridge-agent/          # Backend
│   ├── src/
│   │   ├── agents/            # AI Agents (IQAI ADK)
│   │   │   ├── workflow.ts    # Agent orchestration
│   │   │   ├── listener.agent.ts
│   │   │   ├── perceiver.agent.ts
│   │   │   ├── dispatcher.agent.ts
│   │   │   ├── verifier.agent.ts
│   │   │   └── rewarder.agent.ts
│   │   ├── api/
│   │   │   └── server.ts      # REST API endpoints
│   │   ├── database/
│   │   │   ├── index.ts       # PostgreSQL connection
│   │   │   └── schema.sql     # Database schema
│   │   ├── integrations/
│   │   │   ├── telegram-bot.ts
│   │   │   └── registration-flow.ts
│   │   ├── models/
│   │   │   ├── rescue-ticket.ts
│   │   │   ├── rescuer.ts
│   │   │   └── transaction.ts
│   │   ├── store/
│   │   │   ├── index.ts       # Store factory
│   │   │   ├── memory-store.ts
│   │   │   └── database-store.ts
│   │   ├── tools/             # Function Tools
│   │   │   ├── nlp-parser.tool.ts
│   │   │   ├── geocoding.tool.ts
│   │   │   ├── dedup.tool.ts
│   │   │   ├── rescuer-scout.tool.ts
│   │   │   ├── vision-verify.tool.ts
│   │   │   └── blockchain.tool.ts
│   │   ├── index.ts           # Main entry (with AI)
│   │   ├── api-main.ts        # API-only entry
│   │   └── telegram-main.ts   # Bot entry
│   ├── docs/
│   ├── package.json
│   └── tsconfig.json
│
└── sos-bridge-frontend/       # Frontend (Monorepo)
    ├── apps/
    │   ├── mini-app/          # Telegram Mini App
    │   │   ├── src/
    │   │   │   ├── app/       # Next.js App Router
    │   │   │   │   ├── page.tsx           # SOS Home
    │   │   │   │   ├── sos/form/page.tsx  # SOS Form
    │   │   │   │   ├── sos/[ticketId]/    # Tracking
    │   │   │   │   ├── rescuer/           # Rescuer views
    │   │   │   │   └── history/           # History
    │   │   │   ├── components/
    │   │   │   └── hooks/
    │   │   └── package.json
    │   │
    │   └── dashboard/         # Admin Dashboard
    │       ├── src/
    │       │   ├── app/
    │       │   │   ├── page.tsx           # Overview
    │       │   │   ├── tickets/           # Ticket mgmt
    │       │   │   ├── rescuers/          # Fleet mgmt
    │       │   │   ├── map/               # Live map
    │       │   │   ├── treasury/          # Blockchain
    │       │   │   └── analytics/         # Reports
    │       │   └── components/
    │       └── package.json
    │
    ├── packages/
    │   ├── types/             # Shared TypeScript types
    │   ├── ui/                # Shared UI components
    │   └── api-client/        # API client library
    │
    ├── turbo.json
    └── package.json
```

---

## 5. Backend: SOS-Bridge Agent

### 5.1 Entry Points

| File | Command | Purpose |
|------|---------|---------|
| `api-main.ts` | `npm start` | Production API server |
| `telegram-main.ts` | `npm run bot` | Telegram bot |
| `index.ts` | `npm run dev` | Development with AI agents |

### 5.2 AI Agents

#### Listener Agent
- **Input:** Raw message (Vietnamese)
- **Output:** ParsedData (name, phone, address, people_count, urgency)
- **Tool:** `parseSOSMessageTool`

```typescript
// Example input
"Cứu tôi với! Nhà ở xóm Bàu, xã Hải Thượng. 
 Có 3 người, 1 bà già 80 tuổi. SĐT 0901234567"

// Example output
{
  name: "",
  phone: "0901234567", 
  address: "xóm Bàu, xã Hải Thượng",
  people_count: 3,
  urgency_keywords: ["cứu", "bà già"],
  has_elderly: true
}
```

#### Perceiver Agent
- **Input:** ParsedData
- **Output:** Location (lat, lng, address_text)
- **Tool:** `geocodeAddressTool`

#### Dispatcher Agent
- **Input:** RescueTicket
- **Output:** Assigned Rescuer
- **Tools:** `findAvailableRescuersTool`, `assignRescuerTool`

#### Verifier Agent
- **Input:** Image URL
- **Output:** Verification result
- **Tool:** `verifyRescueImageTool`

#### Rewarder Agent
- **Input:** Verified ticket
- **Output:** USDC transaction
- **Tool:** `releaseFundsTool`

### 5.3 Data Models

#### RescueTicket
```typescript
interface RescueTicket {
  ticket_id: string;          // "SOS_VN_ABC123_XYZ789"
  status: TicketStatus;       // OPEN | ASSIGNED | IN_PROGRESS | VERIFIED | COMPLETED
  priority: 1 | 2 | 3 | 4 | 5; // 1=lowest, 5=critical
  location: {
    lat: number;
    lng: number;
    address_text: string;
  };
  victim_info: {
    phone: string;
    people_count: number;
    note: string;
    has_elderly: boolean;
    has_children: boolean;
    has_disabled: boolean;
  };
  assigned_rescuer_id?: string;
  verification_image_url?: string;
  raw_message: string;
  source: 'telegram_form' | 'telegram_forward' | 'direct';
  created_at: number;
  updated_at: number;
}
```

#### Rescuer
```typescript
interface Rescuer {
  rescuer_id: string;         // "RSC_ABC123"
  name: string;
  phone: string;
  status: 'ONLINE' | 'OFFLINE' | 'ON_MISSION' | 'IDLE';
  location: {
    lat: number;
    lng: number;
    last_updated: number;
  };
  vehicle_type: 'boat' | 'cano' | 'kayak' | 'jet_ski' | 'other';
  vehicle_capacity: number;
  wallet_address?: string;
  telegram_user_id?: number;
  rating: number;
  completed_missions: number;
}
```

---

## 6. Frontend: Mini App & Dashboard

### 6.1 Mini App Pages

| Route | Purpose | User |
|-------|---------|------|
| `/` | SOS Home - Emergency button | Victim |
| `/sos/form` | Detailed SOS form | Victim |
| `/sos/[ticketId]` | Real-time rescue tracking | Victim |
| `/history` | Past rescue requests | Victim |
| `/rescuer` | Mission radar | Rescuer |
| `/rescuer/mission/[id]` | Active mission details | Rescuer |
| `/rescuer/profile` | Profile & stats | Rescuer |
| `/rescuer/leaderboard` | Top rescuers | Rescuer |

### 6.2 Dashboard Pages

| Route | Purpose |
|-------|---------|
| `/` | Overview with live stats |
| `/tickets` | Ticket management table |
| `/tickets/[id]` | Ticket detail view |
| `/rescuers` | Rescuer fleet management |
| `/map` | Live map with markers |
| `/treasury` | Blockchain monitor |
| `/analytics` | Reports & charts |
| `/settings` | System settings |

### 6.3 Key Components

```
Mini App:
├── SOSButton       - Large emergency button with pulse animation
├── MiniMap         - Leaflet map for location
├── MissionCard     - Rescue mission summary
└── StatusBadge     - Ticket status indicator

Dashboard:
├── StatsCard       - KPI display
├── TicketTable     - Sortable ticket list
├── LiveMap         - Real-time markers
├── ActivityFeed    - Recent events
└── TreasuryChart   - Financial charts
```

---

## 7. Database Schema

### 7.1 Tables

```sql
-- Rescue Tickets
CREATE TABLE rescue_tickets (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN',
  priority INTEGER DEFAULT 3,
  
  -- Location
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address_text TEXT,
  
  -- Victim Info
  victim_phone VARCHAR(20),
  people_count INTEGER DEFAULT 1,
  victim_note TEXT,
  has_elderly BOOLEAN DEFAULT FALSE,
  has_children BOOLEAN DEFAULT FALSE,
  has_disabled BOOLEAN DEFAULT FALSE,
  
  -- Assignment
  assigned_rescuer_id VARCHAR(50),
  
  -- Verification
  verification_image_url TEXT,
  verified_at BIGINT,
  
  -- Meta
  raw_message TEXT,
  source VARCHAR(20),
  created_at BIGINT,
  updated_at BIGINT
);

-- Rescuers
CREATE TABLE rescuers (
  id SERIAL PRIMARY KEY,
  rescuer_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'OFFLINE',
  
  -- Location
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_updated_at BIGINT,
  
  -- Vehicle
  vehicle_type VARCHAR(20),
  vehicle_capacity INTEGER DEFAULT 4,
  
  -- Blockchain
  wallet_address VARCHAR(100),
  
  -- Telegram
  telegram_user_id BIGINT,
  
  -- Stats
  rating DECIMAL(2, 1) DEFAULT 5.0,
  completed_missions INTEGER DEFAULT 0,
  
  created_at BIGINT,
  last_active_at BIGINT
);

-- Reward Transactions
CREATE TABLE reward_transactions (
  id SERIAL PRIMARY KEY,
  tx_id VARCHAR(100) UNIQUE NOT NULL,
  ticket_id VARCHAR(50) REFERENCES rescue_tickets(ticket_id),
  rescuer_id VARCHAR(50) REFERENCES rescuers(rescuer_id),
  
  amount_usdc DECIMAL(10, 2),
  tx_hash VARCHAR(100),
  status VARCHAR(20) DEFAULT 'PENDING',
  
  created_at BIGINT,
  confirmed_at BIGINT
);

-- Indexes
CREATE INDEX idx_tickets_status ON rescue_tickets(status);
CREATE INDEX idx_tickets_location ON rescue_tickets(location_lat, location_lng);
CREATE INDEX idx_rescuers_status ON rescuers(status);
CREATE INDEX idx_rescuers_telegram ON rescuers(telegram_user_id);
```

---

## 8. API Reference

### 8.1 Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://web-production-d0631.up.railway.app` |
| Local | `http://localhost:3002` |

### 8.2 Endpoints

#### Tickets

```http
GET /api/tickets
GET /api/tickets?status=OPEN&page=1&limit=50
POST /api/tickets
GET /api/tickets/:id
PATCH /api/tickets/:id
POST /api/tickets/:id/assign
```

**POST /api/tickets** - Create ticket
```json
{
  "lat": 16.4637,
  "lng": 107.5909,
  "phone": "0901234567",
  "people_count": 3,
  "note": "Mắc kẹt tầng 2",
  "has_elderly": true,
  "priority": 4
}
```

#### Rescuers

```http
GET /api/rescuers
GET /api/rescuers/:id
GET /api/rescuers/telegram/:telegramId
PATCH /api/rescuers/:id
PATCH /api/rescuers/:id/status
PATCH /api/rescuers/:id/location
GET /api/rescuers/nearby?lat=16.46&lng=107.59&radius=10
```

#### Missions

```http
POST /api/missions/:ticketId/accept
POST /api/missions/:ticketId/decline
POST /api/missions/:ticketId/complete
GET /api/missions/active/:rescuerId
GET /api/missions/nearby?lat=16.46&lng=107.59&radius=10
```

**POST /api/missions/:ticketId/complete**
```json
{
  "image_url": "https://storage.example.com/verify/photo.jpg"
}
```

#### Treasury & Stats

```http
GET /api/stats
GET /api/treasury
GET /api/transactions
```

---

## 9. AI Workflow

### 9.1 Workflow Types

```typescript
// Full workflow: Message → Ticket → Dispatch → Verify → Reward
const fullWorkflow = createFullWorkflow();

// Intake only: Message → Ticket
const intakeWorkflow = createIntakeWorkflow();

// Single agent usage
const listener = createListenerAgent();
const result = await listener.run({ message: "Cứu tôi với..." });
```

### 9.2 Tool Implementation

```typescript
// Example: NLP Parser Tool
export const parseSOSMessageTool = new FunctionTool({
  name: 'parse_sos_message',
  description: 'Parse Vietnamese SOS message to extract rescue information',
  parameters: z.object({
    message: z.string().describe('The raw SOS message in Vietnamese'),
  }),
  execute: async ({ message }) => {
    // Regex-based extraction
    const phoneMatch = message.match(/\b0\d{9,10}\b/);
    const countMatch = message.match(/(\d+)\s*(người|bà|ông|cháu)/i);
    
    return {
      phone: phoneMatch?.[0] || '',
      people_count: countMatch ? parseInt(countMatch[1]) : 1,
      // ... more extraction
    };
  },
});
```

---

## 10. Deployment Guide

### 10.1 Backend (Railway)

1. **Push to GitHub**
```bash
cd sos-bridge-agent
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sos-bridge-api.git
git push -u origin main
```

2. **Deploy on Railway**
- Go to https://railway.app
- New Project → Deploy from GitHub repo
- Select `sos-bridge-api`
- Add environment variables (see Section 12)

3. **Generate domain**
- Settings → Networking → Generate Domain

### 10.2 Frontend (Vercel)

1. **Deploy**
```bash
cd sos-bridge-frontend
vercel --prod
```

2. **Set environment variable**
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://YOUR-RAILWAY-URL.up.railway.app/api
```

3. **Disable Deployment Protection**
- Vercel Dashboard → Project → Settings
- Deployment Protection → Disabled

### 10.3 Telegram Bot Setup

1. **Create bot** - Chat with @BotFather
```
/newbot
Name: Lũ lụt
Username: your_bot_name
```

2. **Configure Menu Button**
```
/mybots → Your bot → Bot Settings → Menu Button
URL: https://your-vercel-url.vercel.app
```

---

## 11. Development Setup

### 11.1 Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL (optional, can use memory store)

### 11.2 Backend Setup

```bash
cd sos-bridge-agent

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Run database migrations (if using PostgreSQL)
npm run db:migrate
npm run db:seed

# Start development
npm run api        # API server only
npm run bot        # Telegram bot
npm run dev        # Full with AI agents
```

### 11.3 Frontend Setup

```bash
cd sos-bridge-frontend

# Install dependencies
npm install

# Start development
npm run dev:mini-app   # Mini App on :3001
npm run dev:dashboard  # Dashboard on :3000
npm run dev            # Both
```

---

## 12. Environment Variables

### 12.1 Backend (.env)

```bash
# Database (optional - will use memory store if not set)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# AI - Required for NLP/Vision
GOOGLE_API_KEY=AIzaSy...

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook  # Optional

# Blockchain (optional)
TREASURY_PRIVATE_KEY=0x...
TREASURY_ADDRESS=0x...
BASE_SEPOLIA_RPC=https://sepolia.base.org

# API
PORT=3002
API_PORT=3002
```

### 12.2 Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3002/api
# Production: https://web-production-xxx.up.railway.app/api
```

---

## 13. Testing

### 13.1 API Testing

```bash
# Test stats
curl http://localhost:3002/api/stats

# Create ticket
curl -X POST http://localhost:3002/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"lat":16.46,"lng":107.59,"phone":"0901234567","people_count":2}'

# Accept mission
curl -X POST http://localhost:3002/api/missions/TICKET_ID/accept \
  -H "Content-Type: application/json" \
  -d '{"rescuer_id":"RSC_DEMO_001"}'
```

### 13.2 Unit Tests

```bash
cd sos-bridge-agent
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

---

## 📚 Additional Resources

- [IQAI ADK Documentation](https://docs.iq.wiki/adk)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Base Blockchain](https://docs.base.org)
- [Vercel Deployment](https://vercel.com/docs)
- [Railway Deployment](https://docs.railway.app)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - see LICENSE file for details.

---

> **Last Updated:** December 2024  
> **Version:** 1.0.0  
> **Maintainer:** SOS-Bridge Team

