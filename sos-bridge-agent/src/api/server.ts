/**
 * SOS-Bridge REST API Server
 * Provides REST endpoints for the frontend applications
 */

import http from 'http';
import url from 'url';
import { getStore } from '../store/index.js';
import type { RescueTicket, Rescuer, RewardTransaction } from '../models/index.js';
import { createRescueTicket } from '../models/rescue-ticket.js';
import type { TreasuryInfo } from '../models/transaction.js';

const store = getStore();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// JSON response helper
function jsonResponse(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders,
  });
  res.end(JSON.stringify(data));
}

// Parse JSON body
async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// Parse query params
function parseQuery(urlString: string): Record<string, string> {
  const parsed = url.parse(urlString, true);
  return parsed.query as Record<string, string>;
}

// Route handler type
type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>
) => Promise<void>;

// Routes
const routes: Record<string, RouteHandler> = {
  // ========== TICKETS ==========
  'GET /api/tickets': async (req, res, params) => {
    const query = parseQuery(req.url || '');
    const status = query.status;
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');

    let tickets = await store.getAllTickets();
    
    // Filter by status
    if (status && status !== 'ALL') {
      tickets = tickets.filter((t) => t.status === status);
    }

    // Sort by created_at descending
    tickets.sort((a, b) => b.created_at - a.created_at);

    // Paginate
    const total = tickets.length;
    const start = (page - 1) * limit;
    const paginatedTickets = tickets.slice(start, start + limit);

    jsonResponse(res, {
      data: paginatedTickets,
      total,
      page,
      limit,
      hasMore: start + limit < total,
    });
  },

  'POST /api/tickets': async (req, res, params) => {
    const body = await parseBody(req);
    
    const ticket = createRescueTicket({
      location: {
        lat: body.lat,
        lng: body.lng,
        address_text: body.address_text || `${body.lat}, ${body.lng}`,
      },
      victim_info: {
        phone: body.phone,
        people_count: body.people_count || 1,
        note: body.note || '',
        has_elderly: body.has_elderly || false,
        has_children: body.has_children || false,
        has_disabled: body.has_disabled || false,
      },
      raw_message: body.raw_message || 'Created via API',
      source: 'direct',
      priority: body.priority || 3,
    });

    await store.addTicket(ticket);
    jsonResponse(res, ticket, 201);
  },

  'GET /api/tickets/:id': async (req, res, params) => {
    const ticket = await store.getTicket(params.id);
    if (!ticket) {
      jsonResponse(res, { error: 'Ticket not found' }, 404);
      return;
    }

    // Include assigned rescuer if available
    if (ticket.assigned_rescuer_id) {
      const rescuer = await store.getRescuer(ticket.assigned_rescuer_id);
      if (rescuer) {
        (ticket as any).assigned_rescuer = rescuer;
      }
    }

    jsonResponse(res, ticket);
  },

  'PATCH /api/tickets/:id': async (req, res, params) => {
    const ticket = await store.getTicket(params.id);
    if (!ticket) {
      jsonResponse(res, { error: 'Ticket not found' }, 404);
      return;
    }

    const body = await parseBody(req);
    const updates = {
      ...body,
      updated_at: Date.now(),
    };

    const updatedTicket = await store.updateTicket(params.id, updates);
    jsonResponse(res, updatedTicket);
  },

  'POST /api/tickets/:id/assign': async (req, res, params) => {
    const ticket = await store.getTicket(params.id);
    if (!ticket) {
      jsonResponse(res, { error: 'Ticket not found' }, 404);
      return;
    }

    const body = await parseBody(req);
    const rescuer = await store.getRescuer(body.rescuer_id);
    if (!rescuer) {
      jsonResponse(res, { error: 'Rescuer not found' }, 404);
      return;
    }

    const updatedTicket = await store.updateTicket(params.id, {
      status: 'ASSIGNED',
      assigned_rescuer_id: body.rescuer_id,
      updated_at: Date.now(),
    });

    jsonResponse(res, { ...updatedTicket, assigned_rescuer: rescuer });
  },

  // ========== RESCUERS ==========
  'GET /api/rescuers': async (req, res, params) => {
    const query = parseQuery(req.url || '');
    const status = query.status;
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');

    let rescuers = await store.getAllRescuers();

    // Filter by status
    if (status && status !== 'ALL') {
      rescuers = rescuers.filter((r) => r.status === status);
    }

    // Sort by completed_missions descending
    rescuers.sort((a, b) => b.completed_missions - a.completed_missions);

    // Paginate
    const total = rescuers.length;
    const start = (page - 1) * limit;
    const paginatedRescuers = rescuers.slice(start, start + limit);

    jsonResponse(res, {
      data: paginatedRescuers,
      total,
      page,
      limit,
      hasMore: start + limit < total,
    });
  },

  'GET /api/rescuers/:id': async (req, res, params) => {
    const rescuer = await store.getRescuer(params.id);
    if (!rescuer) {
      jsonResponse(res, { error: 'Rescuer not found' }, 404);
      return;
    }
    jsonResponse(res, rescuer);
  },

  'POST /api/rescuers': async (req, res, params) => {
    const body = await parseBody(req);
    
    // Validate required fields
    if (!body.name || !body.phone || !body.vehicle_type) {
      jsonResponse(res, { error: 'Name, phone, and vehicle_type are required' }, 400);
      return;
    }

    // Create new rescuer
    const rescuer = await store.createAndAddRescuer({
      name: body.name,
      phone: body.phone,
      location: {
        lat: body.lat || 16.0544, // Default to Da Nang center
        lng: body.lng || 108.2022,
      },
      vehicle_type: body.vehicle_type,
      vehicle_capacity: body.vehicle_capacity || 4,
      telegram_user_id: body.telegram_user_id,
      wallet_address: body.wallet_address,
    });

    console.log(`[API] Created new rescuer: ${rescuer.rescuer_id} - ${rescuer.name}`);
    jsonResponse(res, rescuer, 201);
  },

  'GET /api/rescuers/telegram/:telegramId': async (req, res, params) => {
    const telegramId = parseInt(params.telegramId);
    const rescuers = await store.getAllRescuers();
    const rescuer = rescuers.find((r) => r.telegram_user_id === telegramId);
    
    if (!rescuer) {
      jsonResponse(res, { error: 'Rescuer not found' }, 404);
      return;
    }
    jsonResponse(res, rescuer);
  },

  'PATCH /api/rescuers/:id': async (req, res, params) => {
    const rescuer = await store.getRescuer(params.id);
    if (!rescuer) {
      jsonResponse(res, { error: 'Rescuer not found' }, 404);
      return;
    }

    const body = await parseBody(req);
    const updatedRescuer = await store.updateRescuer(params.id, {
      ...body,
      updated_at: Date.now(),
    });

    jsonResponse(res, updatedRescuer);
  },

  'PATCH /api/rescuers/:id/status': async (req, res, params) => {
    const rescuer = await store.getRescuer(params.id);
    if (!rescuer) {
      jsonResponse(res, { error: 'Rescuer not found' }, 404);
      return;
    }

    const body = await parseBody(req);
    const updatedRescuer = await store.updateRescuer(params.id, {
      status: body.status,
      last_active_at: Date.now(),
      updated_at: Date.now(),
    });

    jsonResponse(res, updatedRescuer);
  },

  'PATCH /api/rescuers/:id/location': async (req, res, params) => {
    const rescuer = await store.getRescuer(params.id);
    if (!rescuer) {
      jsonResponse(res, { error: 'Rescuer not found' }, 404);
      return;
    }

    const body = await parseBody(req);
    const updatedRescuer = await store.updateRescuer(params.id, {
      location: {
        lat: body.lat,
        lng: body.lng,
        last_updated: Date.now(),
      },
      last_active_at: Date.now(),
      updated_at: Date.now(),
    });

    jsonResponse(res, updatedRescuer);
  },

  'GET /api/rescuers/nearby': async (req, res, params) => {
    const query = parseQuery(req.url || '');
    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);
    const radius = parseFloat(query.radius || '10'); // km

    if (isNaN(lat) || isNaN(lng)) {
      jsonResponse(res, { error: 'Invalid coordinates' }, 400);
      return;
    }

    const rescuers = await store.getAllRescuers();
    const nearbyRescuers = rescuers
      .filter((r) => r.status === 'ONLINE' || r.status === 'IDLE')
      .map((r) => {
        const distance = calculateDistance(lat, lng, r.location.lat, r.location.lng);
        return { ...r, distance };
      })
      .filter((r) => r.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    jsonResponse(res, nearbyRescuers);
  },

  // ========== TRANSACTIONS ==========
  'GET /api/transactions': async (req, res, params) => {
    const query = parseQuery(req.url || '');
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');

    let transactions = await store.getAllTransactions();

    // Filter
    if (query.ticket_id) {
      transactions = transactions.filter((t) => t.ticket_id === query.ticket_id);
    }
    if (query.rescuer_id) {
      transactions = transactions.filter((t) => t.rescuer_id === query.rescuer_id);
    }
    if (query.status) {
      transactions = transactions.filter((t) => t.status === query.status);
    }

    // Sort by created_at descending
    transactions.sort((a, b) => b.created_at - a.created_at);

    // Paginate
    const total = transactions.length;
    const start = (page - 1) * limit;
    const paginatedTransactions = transactions.slice(start, start + limit);

    jsonResponse(res, {
      data: paginatedTransactions,
      total,
      page,
      limit,
      hasMore: start + limit < total,
    });
  },

  'POST /api/transactions/payout': async (req, res, params) => {
    // TODO: Implement manual payout
    jsonResponse(res, { error: 'Not implemented' }, 501);
  },

  // ========== TREASURY ==========
  'GET /api/treasury': async (req, res, params) => {
    try {
      // Get transaction stats from store
      const transactions = await store.getAllTransactions();
      const confirmedTx = transactions.filter((t) => t.status === 'CONFIRMED');
      const totalDisbursed = confirmedTx.reduce((sum, t) => sum + t.amount_usdc, 0);

      const treasury: TreasuryInfo = {
        wallet_address: process.env.TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000',
        balance_usdc: 10000 - totalDisbursed, // Mock balance minus disbursed
        total_disbursed: totalDisbursed,
        total_transactions: confirmedTx.length,
        network: 'base_sepolia',
        last_updated: Date.now(),
      };
      jsonResponse(res, treasury);
    } catch (error) {
      jsonResponse(res, {
        wallet_address: process.env.TREASURY_ADDRESS || 'Not configured',
        balance_usdc: 0,
        total_disbursed: 0,
        total_transactions: 0,
        network: 'base_sepolia',
        last_updated: Date.now(),
      });
    }
  },

  // ========== STATS ==========
  'GET /api/stats': async (req, res, params) => {
    const tickets = await store.getAllTickets();
    const rescuers = await store.getAllRescuers();
    const transactions = await store.getAllTransactions();

    const stats = {
      tickets: {
        total: tickets.length,
        open: tickets.filter((t) => t.status === 'OPEN').length,
        assigned: tickets.filter((t) => t.status === 'ASSIGNED').length,
        in_progress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
        verified: tickets.filter((t) => t.status === 'VERIFIED').length,
        completed: tickets.filter((t) => t.status === 'COMPLETED').length,
      },
      rescuers: {
        total: rescuers.length,
        online: rescuers.filter((r) => r.status === 'ONLINE').length,
        on_mission: rescuers.filter((r) => r.status === 'ON_MISSION').length,
        offline: rescuers.filter((r) => r.status === 'OFFLINE').length,
      },
      transactions: {
        total: transactions.length,
        pending: transactions.filter((t) => t.status === 'PENDING').length,
        submitted: transactions.filter((t) => t.status === 'SUBMITTED').length,
        confirmed: transactions.filter((t) => t.status === 'CONFIRMED').length,
        failed: transactions.filter((t) => t.status === 'FAILED').length,
        total_disbursed_usdc: transactions
          .filter((t) => t.status === 'CONFIRMED')
          .reduce((sum, t) => sum + t.amount_usdc, 0),
      },
    };

    jsonResponse(res, stats);
  },

  // ========== MISSIONS (For Mini App) ==========
  'POST /api/missions/:ticketId/accept': async (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => {
    const ticket = await store.getTicket(params.ticketId);
    if (!ticket) {
      jsonResponse(res, { error: 'Ticket not found' }, 404);
      return;
    }

    if (ticket.status !== 'OPEN') {
      jsonResponse(res, { error: 'Ticket is not available' }, 400);
      return;
    }

    const body = await parseBody(req);
    const rescuer = await store.getRescuer(body.rescuer_id);
    if (!rescuer) {
      jsonResponse(res, { error: 'Rescuer not found' }, 404);
      return;
    }

    // Update ticket
    const updatedTicket = await store.updateTicket(params.ticketId, {
      status: 'ASSIGNED',
      assigned_rescuer_id: body.rescuer_id,
      updated_at: Date.now(),
    });

    // Update rescuer status
    const updatedRescuer = await store.updateRescuer(body.rescuer_id, {
      status: 'ON_MISSION',
      last_active_at: Date.now(),
    });

    jsonResponse(res, { ...updatedTicket, assigned_rescuer: updatedRescuer });
  },

  'POST /api/missions/:ticketId/decline': async (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => {
    // Just acknowledge - no action needed
    jsonResponse(res, { success: true });
  },

  'POST /api/missions/:ticketId/complete': async (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => {
    const ticket = await store.getTicket(params.ticketId);
    if (!ticket) {
      jsonResponse(res, { error: 'Ticket not found' }, 404);
      return;
    }

    const body = await parseBody(req);

    // Update ticket with verification
    const updatedTicket = await store.updateTicket(params.ticketId, {
      status: 'VERIFIED',
      verification_image_url: body.image_url,
      verified_at: Date.now(),
      updated_at: Date.now(),
    });

    // Update rescuer
    if (ticket.assigned_rescuer_id) {
      const rescuer = await store.getRescuer(ticket.assigned_rescuer_id);
      if (rescuer) {
        await store.updateRescuer(ticket.assigned_rescuer_id, {
          status: 'ONLINE',
          completed_missions: rescuer.completed_missions + 1,
          last_active_at: Date.now(),
        });
      }
    }

    jsonResponse(res, updatedTicket);
  },

  'GET /api/missions/active/:rescuerId': async (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => {
    const tickets = await store.getAllTickets();
    const activeMission = tickets.find(
      (t) =>
        t.assigned_rescuer_id === params.rescuerId &&
        (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')
    );
    jsonResponse(res, activeMission || null);
  },

  'GET /api/missions/nearby': async (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => {
    const query = parseQuery(req.url || '');
    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);
    const radius = parseFloat(query.radius || '10'); // km

    if (isNaN(lat) || isNaN(lng)) {
      jsonResponse(res, { error: 'Invalid coordinates' }, 400);
      return;
    }

    const tickets = await store.getAllTickets();
    const nearbyTickets = tickets
      .filter((t) => t.status === 'OPEN')
      .map((t) => {
        const distance = calculateDistance(lat, lng, t.location.lat, t.location.lng);
        return { ...t, distance };
      })
      .filter((t) => t.distance <= radius)
      .sort((a, b) => {
        // Sort by priority (descending) then distance (ascending)
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.distance - b.distance;
      });

    jsonResponse(res, nearbyTickets);
  },
};

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Route matching
function matchRoute(method: string, pathname: string): { handler: RouteHandler; params: Record<string, string> } | null {
  for (const [route, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = route.split(' ');
    if (routeMethod !== method) continue;

    const routeParts = routePath.split('/');
    const pathParts = pathname.split('/');

    if (routeParts.length !== pathParts.length) continue;

    const params: Record<string, string> = {};
    let match = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { handler, params };
    }
  }
  return null;
}

// Create server
export function createApiServer(port: number = 3002) {
  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, corsHeaders);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '/';
    const method = req.method || 'GET';

    console.log(`[API] ${method} ${pathname}`);

    // Match route
    const match = matchRoute(method, pathname);
    if (match) {
      try {
        await match.handler(req, res, match.params);
      } catch (error) {
        console.error('[API] Error:', error);
        jsonResponse(res, { error: 'Internal server error' }, 500);
      }
    } else {
      jsonResponse(res, { error: 'Not found' }, 404);
    }
  });

  server.listen(port, () => {
    console.log(`[API] Server running at http://localhost:${port}`);
  });

  return server;
}

// Export for use in main entry
export { createApiServer as startApiServer };

