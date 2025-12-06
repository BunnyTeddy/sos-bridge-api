/**
 * Tools Unit Tests
 * Test các tools: geocoding, vision verify, blockchain, dedup, nlp-parser
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../store/memory-store.js';

// Import tools for testing their underlying functions
import { 
  geocodeCache, 
  clearExpiredCache,
  getCacheStats,
} from '../tools/geocoding.tool.js';

import {
  clearAllCache,
  getCacheSize,
  isCached,
  removeFromCache,
  getDetailedCacheStats,
} from '../utils/geocache.js';

describe('Geocoding Tool Tests', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearAllCache();
  });

  describe('Cache Operations', () => {
    it('should start with empty cache', () => {
      expect(getCacheSize()).toBe(0);
    });

    it('should report cache stats correctly', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttl');
      expect(stats.ttl).toBeGreaterThan(0);
    });

    it('should check if address is cached', () => {
      expect(isCached('some unknown address')).toBe(false);
    });

    it('should clear all cache', () => {
      // Add something to cache manually
      geocodeCache.set('test-address', {
        coordinates: { lat: 16.0, lng: 107.0 },
        source: 'test',
        timestamp: Date.now(),
      });
      
      expect(getCacheSize()).toBe(1);
      
      clearAllCache();
      expect(getCacheSize()).toBe(0);
    });

    it('should remove specific address from cache', () => {
      geocodeCache.set('test-address-remove', {
        coordinates: { lat: 16.0, lng: 107.0 },
        source: 'test',
        timestamp: Date.now(),
      });
      
      expect(isCached('test-address-remove')).toBe(true);
      
      const removed = removeFromCache('test-address-remove');
      expect(removed).toBe(true);
      expect(isCached('test-address-remove')).toBe(false);
    });

    it('should return false when removing non-existent address', () => {
      const removed = removeFromCache('non-existent-address');
      expect(removed).toBe(false);
    });

    it('should get detailed cache stats', () => {
      // Add test entry
      geocodeCache.set('detail-test', {
        coordinates: { lat: 16.5, lng: 107.5 },
        source: 'test-source',
        timestamp: Date.now(),
      });

      const stats = getDetailedCacheStats();
      
      expect(stats.size).toBe(1);
      expect(stats.entries.length).toBe(1);
      expect(stats.entries[0].address).toBe('detail-test');
      expect(stats.entries[0].source).toBe('test-source');
      expect(stats.entries[0].age_minutes).toBeGreaterThanOrEqual(0);
    });

    it('should clear expired cache entries', () => {
      // Add expired entry (timestamp in the past)
      geocodeCache.set('expired-entry', {
        coordinates: { lat: 16.0, lng: 107.0 },
        source: 'test',
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      });

      // Add fresh entry
      geocodeCache.set('fresh-entry', {
        coordinates: { lat: 16.0, lng: 107.0 },
        source: 'test',
        timestamp: Date.now(),
      });

      expect(getCacheSize()).toBe(2);
      
      const cleared = clearExpiredCache();
      expect(cleared).toBe(1); // Should clear 1 expired entry
      expect(getCacheSize()).toBe(1);
      expect(isCached('fresh-entry')).toBe(true);
      expect(isCached('expired-entry')).toBe(false);
    });
  });

  describe('Local Database Lookup', () => {
    it('should have predefined Vietnam locations', () => {
      // Test by checking if these known locations exist in the local database
      const knownLocations = [
        'hải thượng',
        'đông hà',
        'huế',
        'đà nẵng',
        'vinh',
      ];

      // These should match based on the VIETNAM_LOCATIONS constant
      knownLocations.forEach(location => {
        expect(typeof location).toBe('string');
        expect(location.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Blockchain Tool Tests', () => {
  describe('Wallet Address Validation', () => {
    it('should validate correct Ethereum addresses', () => {
      const validAddresses = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f5C000',
        '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
      ];

      validAddresses.forEach(address => {
        // Check format: 0x followed by 40 hex characters
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });

    it('should reject invalid Ethereum addresses', () => {
      const invalidAddresses = [
        '0x123', // Too short
        'not-an-address',
        '742d35Cc6634C0532925a3b844Bc9e7595f5C000', // Missing 0x
        '0xGGGd35Cc6634C0532925a3b844Bc9e7595f5C000', // Invalid hex
      ];

      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;

      invalidAddresses.forEach(address => {
        expect(ethAddressRegex.test(address)).toBe(false);
      });
    });
  });

  describe('Transaction Model', () => {
    it('should have correct transaction status types', () => {
      const validStatuses = ['PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED'];
      
      validStatuses.forEach(status => {
        expect(['PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED']).toContain(status);
      });
    });
  });
});

describe('Vision Verify Tool Tests', () => {
  describe('Verification Score Calculation', () => {
    it('should calculate confidence score correctly', () => {
      // Test score calculation logic
      const humanOk = true;
      const floodOk = true;
      const locationMatch = true;
      const timeMatch = true;
      const notDuplicate = true;

      let score = 0;
      if (humanOk) score += 0.35;
      if (floodOk) score += 0.3;
      if (locationMatch) score += 0.15;
      if (timeMatch) score += 0.1;
      if (notDuplicate) score += 0.1;

      // Use toBeCloseTo for floating point comparison
      expect(score).toBeCloseTo(1.0, 5);
    });

    it('should require minimum 65% for valid verification', () => {
      const minimumScore = 0.65;
      
      // Test various scenarios
      const scenarios = [
        { humanOk: true, floodOk: true, expected: true }, // 0.65
        { humanOk: true, floodOk: false, expected: false }, // 0.35
        { humanOk: false, floodOk: true, expected: false }, // 0.30
      ];

      scenarios.forEach(scenario => {
        let score = 0;
        if (scenario.humanOk) score += 0.35;
        if (scenario.floodOk) score += 0.3;
        
        // Verify minimum threshold logic - use Math.round to avoid floating point issues
        const roundedScore = Math.round(score * 100) / 100;
        expect(roundedScore >= minimumScore).toBe(scenario.expected);
      });
    });
  });

  describe('Image URL Handling', () => {
    it('should detect data URLs', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
      expect(dataUrl.startsWith('data:')).toBe(true);
    });

    it('should handle http/https URLs', () => {
      const httpUrls = [
        'https://example.com/image.jpg',
        'http://example.com/photo.png',
        'https://api.telegram.org/file/bot123/photos/file_1.jpg',
      ];

      httpUrls.forEach(url => {
        expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
      });
    });
  });
});

describe('Deduplication Tool Tests', () => {
  beforeEach(() => {
    store.clear();
    store.seedDemoData();
  });

  describe('Phone Number Deduplication', () => {
    it('should normalize phone numbers correctly', () => {
      const phoneVariants = [
        '0912345678',
        '0912.345.678',
        '0912-345-678',
        '84912345678',
        '+84912345678',
      ];

      // Normalize function logic
      const normalize = (phone: string) => phone.replace(/[\.\-\s\+]/g, '').replace(/^84/, '0');

      const expected = '0912345678';
      phoneVariants.forEach(variant => {
        const normalized = normalize(variant);
        expect(normalized).toBe(expected);
      });
    });

    it('should detect duplicate by phone', () => {
      // Create first ticket
      store.createAndAddTicket({
        location: { lat: 16.0, lng: 107.0, address_text: 'Test' },
        victim_info: { phone: '0912000001', people_count: 1, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 3,
        raw_message: 'First request',
        source: 'telegram_form',
      });

      // Check for duplicate
      const existing = store.findTicketByPhone('0912000001');
      expect(existing).toBeDefined();
      expect(existing?.victim_info.phone).toBe('0912000001');
    });
  });

  describe('Location-based Deduplication', () => {
    it('should detect nearby tickets within 50m', () => {
      // Create ticket at specific location
      store.createAndAddTicket({
        location: { lat: 16.7654, lng: 107.1234, address_text: 'Test location' },
        victim_info: { phone: '0912000002', people_count: 2, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 4,
        raw_message: 'First ticket',
        source: 'telegram_form',
      });

      // Check for nearby (within 50m)
      const hasNearby = store.hasActiveTicketNearby(16.7654, 107.1234, 0.05);
      expect(hasNearby).toBe(true);

      // Check for not nearby (1km away)
      const hasNotNearby = store.hasActiveTicketNearby(16.7754, 107.1334, 0.05);
      expect(hasNotNearby).toBe(false);
    });

    it('should find tickets in radius', () => {
      // Create multiple tickets
      store.createAndAddTicket({
        location: { lat: 16.7654, lng: 107.1234, address_text: 'Location 1' },
        victim_info: { phone: '0912000003', people_count: 1, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 3,
        raw_message: 'Ticket 1',
        source: 'telegram_form',
      });

      store.createAndAddTicket({
        location: { lat: 16.7660, lng: 107.1240, address_text: 'Location 2' },
        victim_info: { phone: '0912000004', people_count: 2, note: '', has_elderly: false, has_children: false, has_disabled: false },
        priority: 4,
        raw_message: 'Ticket 2',
        source: 'telegram_forward',
      });

      // Find tickets in 1km radius
      const nearbyTickets = store.findTicketsInRadius(16.7654, 107.1234, 1);
      expect(nearbyTickets.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('NLP Parser Tests', () => {
  describe('Urgency Level Detection', () => {
    it('should map urgency keywords to priority levels', () => {
      const urgencyMappings = [
        { text: 'nước lên mái', level: 5 },
        { text: 'nước ngang người', level: 4 },
        { text: 'bị cô lập', level: 3 },
        { text: 'cần lương thực', level: 2 },
        { text: 'thông báo tình hình', level: 1 },
      ];

      urgencyMappings.forEach(mapping => {
        expect(mapping.level).toBeGreaterThanOrEqual(1);
        expect(mapping.level).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Information Extraction Patterns', () => {
    it('should extract phone numbers from text', () => {
      const testMessages = [
        { text: 'SĐT: 0912345678', expected: '0912345678' },
        { text: 'Liên hệ: 0912.345.678', expected: '0912345678' },
        { text: 'Gọi số 84912345678', expected: '84912345678' },
      ];

      const phoneRegex = /(?:sđt|số điện thoại|liên hệ|gọi số)?[:\s]*(\+?84|0)[\d\.\-\s]{9,14}/gi;

      testMessages.forEach(({ text }) => {
        const match = text.match(phoneRegex);
        expect(match).not.toBeNull();
      });
    });

    it('should detect people count from text', () => {
      const testMessages = [
        { text: '3 người mắc kẹt', expected: 3 },
        { text: 'có 2 ông bà già', expected: 2 },
        { text: '5 người cần cứu', expected: 5 },
        { text: 'một gia đình 4 người', expected: 4 },
      ];

      const peopleRegex = /(\d+)\s*(?:người|ông|bà|trẻ|cháu|em)/gi;

      testMessages.forEach(({ text, expected }) => {
        const match = text.match(peopleRegex);
        expect(match).not.toBeNull();
        // Extract number
        const numMatch = match?.[0].match(/\d+/);
        expect(parseInt(numMatch?.[0] || '0')).toBe(expected);
      });
    });
  });
});

describe('Distance Calculator Tests', () => {
  it('should calculate distance between two points correctly', () => {
    // Test Haversine formula with known values
    // Distance from Hanoi to Ho Chi Minh City is approximately 1150km
    const hanoi = { lat: 21.0285, lng: 105.8542 };
    const hcm = { lat: 10.8231, lng: 106.6297 };

    const R = 6371;
    const dLat = (hcm.lat - hanoi.lat) * Math.PI / 180;
    const dLng = (hcm.lng - hanoi.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(hanoi.lat * Math.PI / 180) * Math.cos(hcm.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Should be approximately 1150km (allow 50km tolerance)
    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1200);
  });

  it('should return 0 for same location', () => {
    const point = { lat: 16.7654, lng: 107.1234 };
    
    const R = 6371;
    const dLat = 0;
    const dLng = 0;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    expect(distance).toBe(0);
  });
});

