/**
 * Geocoding Cache Utility
 * Provides caching utilities for geocoding results
 * Re-exports cache functions from geocoding.tool.ts for external use
 */

import { 
  geocodeCache, 
  clearExpiredCache, 
  getCacheStats 
} from '../tools/geocoding.tool.js';

export interface CacheEntry {
  coordinates: { lat: number; lng: number };
  source: string;
  timestamp: number;
}

/**
 * Get all cached entries
 */
export function getAllCachedEntries(): Map<string, CacheEntry> {
  return geocodeCache as Map<string, CacheEntry>;
}

/**
 * Get number of cached entries
 */
export function getCacheSize(): number {
  return geocodeCache.size;
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  geocodeCache.clear();
  console.log('[GeoCache] Cleared all cache entries');
}

/**
 * Check if address is in cache
 */
export function isCached(address: string): boolean {
  const normalized = address.toLowerCase().trim();
  return geocodeCache.has(normalized);
}

/**
 * Remove specific address from cache
 */
export function removeFromCache(address: string): boolean {
  const normalized = address.toLowerCase().trim();
  const deleted = geocodeCache.delete(normalized);
  if (deleted) {
    console.log(`[GeoCache] Removed from cache: "${address}"`);
  }
  return deleted;
}

/**
 * Get cache statistics
 */
export function getDetailedCacheStats(): {
  size: number;
  entries: Array<{
    address: string;
    coordinates: { lat: number; lng: number };
    source: string;
    age_minutes: number;
  }>;
} {
  const now = Date.now();
  const entries: Array<{
    address: string;
    coordinates: { lat: number; lng: number };
    source: string;
    age_minutes: number;
  }> = [];

  for (const [address, entry] of geocodeCache.entries()) {
    entries.push({
      address,
      coordinates: (entry as CacheEntry).coordinates,
      source: (entry as CacheEntry).source,
      age_minutes: Math.round((now - (entry as CacheEntry).timestamp) / 60000),
    });
  }

  return {
    size: geocodeCache.size,
    entries,
  };
}

// Re-export for convenience
export { clearExpiredCache, getCacheStats };

