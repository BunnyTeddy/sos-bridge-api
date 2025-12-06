# SOS-Bridge Frontend

Frontend applications for the SOS-Bridge AI-powered flood rescue coordination system.

## Project Structure

```
sos-bridge-frontend/
├── apps/
│   ├── mini-app/          # Telegram Mini App (TWA)
│   └── dashboard/         # Web Management Dashboard
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── ui/                # Shared UI components
│   └── api-client/        # API client for backend
├── package.json           # Workspace config
└── turbo.json             # Turborepo config
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example apps/mini-app/.env.local
cp .env.example apps/dashboard/.env.local
```

### Development

```bash
# Run all apps
npm run dev

# Run only Mini App (port 3001)
npm run dev:mini-app

# Run only Dashboard (port 3000)
npm run dev:dashboard
```

### Build

```bash
# Build all apps
npm run build

# Build specific app
npm run build:mini-app
npm run build:dashboard
```

## Applications

### 1. Telegram Mini App (`apps/mini-app`)

Mobile-first application for victims and rescuers, accessible via Telegram.

**Features:**
- 🆘 One-tap SOS button with GPS auto-detect
- 📍 Real-time rescue tracking
- 🗺️ Mission radar for rescuers
- 👤 Rescuer profile and leaderboard
- 📱 Native Telegram integration (haptics, main button, back button)

**Pages:**
- `/` - SOS home with emergency button
- `/sos/form` - Detailed SOS request form
- `/sos/[ticketId]` - Rescue tracking timeline
- `/history` - Past requests
- `/rescuer` - Mission radar
- `/rescuer/mission/[id]` - Active mission details
- `/rescuer/profile` - Profile and earnings
- `/rescuer/leaderboard` - Rankings

### 2. Management Dashboard (`apps/dashboard`)

Web-based dashboard for administrators and coordinators.

**Features:**
- 📊 Real-time statistics and KPIs
- 🗺️ Live map with all tickets and rescuers
- 📋 Ticket management with filters and sorting
- 👥 Rescuer fleet management
- 💰 Treasury monitoring and transactions
- 📈 Analytics and reports

**Pages:**
- `/` - Overview dashboard
- `/map` - Live map view
- `/tickets` - Ticket list and management
- `/tickets/[id]` - Ticket detail
- `/rescuers` - Rescuer management
- `/treasury` - Finance monitoring
- `/analytics` - Reports and charts
- `/settings` - System configuration

## Shared Packages

### @sos-bridge/types

Shared TypeScript interfaces and constants.

```typescript
import { RescueTicket, Rescuer, TicketStatus } from '@sos-bridge/types';
```

### @sos-bridge/ui

Shared UI components and utilities.

```typescript
import { Button, Badge, StatusBadge, formatRelativeTime } from '@sos-bridge/ui';
```

### @sos-bridge/api-client

API client for backend communication.

```typescript
import { apiClient, queryKeys } from '@sos-bridge/api-client';

// Fetch tickets
const response = await apiClient.getTickets({ status: 'OPEN' });

// React Query integration
const { data } = useQuery({
  queryKey: queryKeys.tickets.all,
  queryFn: () => apiClient.getTickets(),
});
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS, shadcn/ui components
- **State:** Zustand, TanStack Query
- **Maps:** Leaflet / React-Leaflet
- **Charts:** Recharts
- **Build:** Turborepo
- **Telegram SDK:** @tma.js/sdk-react

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Configure build settings:
   - Mini App: `apps/mini-app`
   - Dashboard: `apps/dashboard`
3. Add environment variables
4. Deploy

### Telegram Mini App Setup

1. Create bot via [@BotFather](https://t.me/BotFather)
2. Use `/newapp` command to register Mini App
3. Set Web App URL to deployed Mini App URL
4. Configure menu button or inline keyboard

## API Integration

The frontend expects a backend API at `NEXT_PUBLIC_API_URL` with the following endpoints:

```
GET    /api/tickets
POST   /api/tickets
GET    /api/tickets/:id
PATCH  /api/tickets/:id

GET    /api/rescuers
GET    /api/rescuers/:id
GET    /api/rescuers/telegram/:telegramId
PATCH  /api/rescuers/:id

GET    /api/transactions
POST   /api/transactions/payout

GET    /api/treasury
GET    /api/stats

POST   /api/missions/:ticketId/accept
POST   /api/missions/:ticketId/complete
GET    /api/missions/nearby
```

## License

MIT






