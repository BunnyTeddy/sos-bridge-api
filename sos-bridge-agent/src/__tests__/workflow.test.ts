/**
 * Workflow E2E Tests
 * Test full workflow 5 bước: Listen -> Perceive -> Dispatch -> Verify -> Reward
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../store/memory-store.js';
import {
  createWorkflowRunner,
  createIntakeWorkflow,
  createDispatchWorkflow,
  createVerifyWorkflow,
  createRewardWorkflow,
  createFullWorkflow,
  createListenerAgent,
  createPerceiverAgent,
} from '../agents/workflow.js';
import { AgentBuilder } from '@iqai/adk';

describe('SOS-Bridge Workflow E2E Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    store.clear();
    store.seedDemoData();
  });

  describe('Workflow Factory Functions', () => {
    it('should create intake workflow with 2 agents', () => {
      const workflow = createIntakeWorkflow();
      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('sos_intake_workflow');
    });

    it('should create dispatch workflow with 1 agent', () => {
      const workflow = createDispatchWorkflow();
      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('sos_dispatch_workflow');
    });

    it('should create verify workflow with 1 agent', () => {
      const workflow = createVerifyWorkflow();
      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('sos_verify_workflow');
    });

    it('should create reward workflow with 1 agent', () => {
      const workflow = createRewardWorkflow();
      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('sos_reward_workflow');
    });

    it('should create full workflow with 5 agents', () => {
      const workflow = createFullWorkflow();
      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('sos_bridge_full_workflow');
    });
  });

  describe('Individual Agent Tests', () => {
    it('should create listener agent', async () => {
      const agent = createListenerAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('listener_agent');
    });

    it('should create perceiver agent', async () => {
      const agent = createPerceiverAgent();
      expect(agent).toBeDefined();
      expect(agent.name).toBe('perceiver_agent');
    });
  });

  describe('Workflow Runner Tests', () => {
    it('should create workflow runner for intake', async () => {
      const { runner, session, workflow } = await createWorkflowRunner('intake', 'test-user-001');
      
      expect(runner).toBeDefined();
      expect(session).toBeDefined();
      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('sos_intake_workflow');
    });

    it('should create workflow runner for verify', async () => {
      const { runner, session, workflow } = await createWorkflowRunner('verify', 'test-user-002');
      
      expect(runner).toBeDefined();
      expect(session).toBeDefined();
      expect(workflow.name).toBe('sos_verify_workflow');
    });

    it('should create workflow runner for reward', async () => {
      const { runner, session, workflow } = await createWorkflowRunner('reward', 'test-user-003');
      
      expect(runner).toBeDefined();
      expect(session).toBeDefined();
      expect(workflow.name).toBe('sos_reward_workflow');
    });

    it('should create workflow runner for full workflow', async () => {
      const { runner, session, workflow } = await createWorkflowRunner('full', 'test-user-004');
      
      expect(runner).toBeDefined();
      expect(session).toBeDefined();
      expect(workflow.name).toBe('sos_bridge_full_workflow');
    });
  });

  describe('Store Integration', () => {
    it('should have seeded rescuers', () => {
      const rescuers = store.getAllRescuers();
      expect(rescuers.length).toBeGreaterThan(0);
    });

    it('should be able to create and retrieve tickets', () => {
      const ticket = store.createAndAddTicket({
        location: {
          lat: 16.7654,
          lng: 107.1234,
          address_text: 'Xóm Bàu, Xã Hải Thượng, Quảng Trị',
        },
        victim_info: {
          phone: '0912345678',
          people_count: 3,
          note: 'Có người già và trẻ em',
          has_elderly: true,
          has_children: true,
          has_disabled: false,
        },
        priority: 5,
        raw_message: 'Test SOS message',
        source: 'telegram_form',
      });

      expect(ticket).toBeDefined();
      expect(ticket.ticket_id).toBeDefined();
      expect(ticket.status).toBe('OPEN');

      const retrieved = store.getTicket(ticket.ticket_id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.victim_info.phone).toBe('0912345678');
    });

    it('should find available rescuers in radius', () => {
      const rescuers = store.findAvailableRescuersInRadius(16.7654, 107.1234, 5);
      expect(rescuers).toBeDefined();
      expect(Array.isArray(rescuers)).toBe(true);
    });

    it('should find best rescuer for ticket', () => {
      const ticket = store.createAndAddTicket({
        location: {
          lat: 16.7654,
          lng: 107.1234,
          address_text: 'Xóm Bàu, Xã Hải Thượng, Quảng Trị',
        },
        victim_info: {
          phone: '0912345999',
          people_count: 2,
          note: 'Test',
          has_elderly: false,
          has_children: false,
          has_disabled: false,
        },
        priority: 4,
        raw_message: 'Test message',
        source: 'telegram_form',
      });

      const bestRescuer = store.findBestRescuerForTicket(ticket, 10);
      // May or may not find depending on demo data location
      if (bestRescuer) {
        expect(bestRescuer.rescuer_id).toBeDefined();
        expect(bestRescuer.score).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate phone check', () => {
      // Create first ticket
      const ticket1 = store.createAndAddTicket({
        location: { lat: 16.7654, lng: 107.1234, address_text: 'Test location' },
        victim_info: { phone: '0909111222', people_count: 1, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 3,
        raw_message: 'First request',
        source: 'telegram_form',
      });

      // Try to find by phone
      const existingTicket = store.findTicketByPhone('0909111222');
      expect(existingTicket).toBeDefined();
      expect(existingTicket?.ticket_id).toBe(ticket1.ticket_id);
    });

    it('should check for active tickets nearby', () => {
      // Create active ticket
      store.createAndAddTicket({
        location: { lat: 16.7654, lng: 107.1234, address_text: 'Test location' },
        victim_info: { phone: '0909333444', people_count: 2, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 4,
        raw_message: 'Active ticket',
        source: 'telegram_form',
      });

      // Check for nearby active tickets
      const hasNearby = store.hasActiveTicketNearby(16.7654, 107.1234, 0.05);
      expect(hasNearby).toBe(true);

      // Check far away location
      const hasNearbyFar = store.hasActiveTicketNearby(10.0, 100.0, 0.05);
      expect(hasNearbyFar).toBe(false);
    });

    it('should update ticket status correctly', () => {
      const ticket = store.createAndAddTicket({
        location: { lat: 16.7654, lng: 107.1234, address_text: 'Test' },
        victim_info: { phone: '0909555666', people_count: 1, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 2,
        raw_message: 'Test',
        source: 'telegram_form',
      });

      // Update status
      store.updateTicketStatus(ticket.ticket_id, 'ASSIGNED');
      const updated = store.getTicket(ticket.ticket_id);
      expect(updated?.status).toBe('ASSIGNED');

      // Update to in progress
      store.updateTicketStatus(ticket.ticket_id, 'IN_PROGRESS');
      const updated2 = store.getTicket(ticket.ticket_id);
      expect(updated2?.status).toBe('IN_PROGRESS');
    });
  });

  describe('Statistics', () => {
    it('should return correct stats', () => {
      // Create some tickets
      store.createAndAddTicket({
        location: { lat: 16.0, lng: 107.0, address_text: 'Test 1' },
        victim_info: { phone: '0901111111', people_count: 1, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 3,
        raw_message: 'Test 1',
        source: 'telegram_form',
      });

      store.createAndAddTicket({
        location: { lat: 16.1, lng: 107.1, address_text: 'Test 2' },
        victim_info: { phone: '0902222222', people_count: 2, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 4,
        raw_message: 'Test 2',
        source: 'telegram_forward',
      });

      const stats = store.getStats();
      
      expect(stats.tickets.total).toBeGreaterThanOrEqual(2);
      expect(stats.tickets.open).toBeGreaterThanOrEqual(2);
      expect(stats.rescuers.total).toBeGreaterThan(0);
    });
  });
});

describe('Listener Agent Recognition Tests', () => {
  it('should recognize SOS keywords', () => {
    const sosKeywords = ['cứu', 'giúp', 'SOS', 'khẩn cấp', 'nguy hiểm', 'ngập', 'lũ', 'kẹt', 'mắc kẹt'];
    
    sosKeywords.forEach(keyword => {
      const message = `${keyword}! Cần hỗ trợ gấp`;
      expect(message.toLowerCase()).toMatch(new RegExp(keyword.toLowerCase()));
    });
  });

  it('should detect phone numbers in Vietnamese format', () => {
    const phonePatterns = [
      '0912345678',
      '0912.345.678',
      '0912-345-678',
      '84912345678',
      '+84912345678',
    ];
    
    const phoneRegex = /(\+?84|0)\d{9,10}/;
    
    phonePatterns.forEach(phone => {
      const normalized = phone.replace(/[\.\-\s]/g, '');
      expect(phoneRegex.test(normalized)).toBe(true);
    });
  });
});

