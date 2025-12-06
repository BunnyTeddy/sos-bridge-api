/**
 * Test Setup File
 * Runs before all tests
 */

import 'dotenv/config';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { store } from '../store/memory-store.js';

// Setup before all tests
beforeAll(() => {
  console.log('\n🧪 Starting test suite...\n');
  
  // Initialize demo data for tests
  store.seedDemoData();
});

// Cleanup after each test
afterEach(() => {
  // Clear store between tests if needed
  // Uncomment if you want fresh state for each test
  // store.clear();
});

// Cleanup after all tests
afterAll(() => {
  console.log('\n✅ Test suite completed.\n');
});

// Mock environment variables if not set
if (!process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = 'test-api-key';
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
}

