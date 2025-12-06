/**
 * Geocoding Tool
 * Chuyển đổi địa chỉ văn bản thành tọa độ GPS
 * Sử dụng Nominatim API (OpenStreetMap) với rate limiting và caching
 */

import { FunctionTool } from '@iqai/adk';

// ============ CONFIGURATION ============

// Nominatim requires max 1 request per second
const RATE_LIMIT_MS = 1100; // 1.1 seconds to be safe
let lastApiCallTime = 0;

// In-memory cache for geocoding results
interface GeocodeCacheEntry {
  coordinates: { lat: number; lng: number };
  source: string;
  timestamp: number;
}

const geocodeCache = new Map<string, GeocodeCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============ LOCAL DATABASE ============

/**
 * Bảng ánh xạ địa danh Việt Nam phổ biến (dùng cho fallback nhanh)
 */
const VIETNAM_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // Quảng Trị
  'hải thượng': { lat: 16.7654, lng: 107.1234 },
  'xóm bàu': { lat: 16.7650, lng: 107.1230 },
  'hải lăng': { lat: 16.7167, lng: 107.1000 },
  'đông hà': { lat: 16.8164, lng: 107.1006 },
  'quảng trị': { lat: 16.7500, lng: 107.1833 },
  'triệu phong': { lat: 16.7833, lng: 107.1500 },
  'gio linh': { lat: 16.9167, lng: 107.0000 },
  'vĩnh linh': { lat: 17.0833, lng: 107.0833 },
  
  // Thừa Thiên Huế
  'huế': { lat: 16.4637, lng: 107.5909 },
  'phú vang': { lat: 16.4500, lng: 107.7000 },
  'phong điền': { lat: 16.5333, lng: 107.3167 },
  'hương thủy': { lat: 16.3667, lng: 107.6167 },
  'phú lộc': { lat: 16.2833, lng: 107.9333 },
  
  // Quảng Bình
  'đồng hới': { lat: 17.4833, lng: 106.6000 },
  'lệ thủy': { lat: 17.1333, lng: 106.7333 },
  'quảng ninh': { lat: 17.2333, lng: 106.5167 },
  'bố trạch': { lat: 17.4500, lng: 106.3667 },
  
  // Quảng Nam
  'hội an': { lat: 15.8801, lng: 108.3380 },
  'tam kỳ': { lat: 15.5667, lng: 108.4833 },
  'đại lộc': { lat: 15.8333, lng: 108.0667 },
  'điện bàn': { lat: 15.8833, lng: 108.2333 },
  'duy xuyên': { lat: 15.7833, lng: 108.1667 },
  
  // Đà Nẵng
  'đà nẵng': { lat: 16.0544, lng: 108.2022 },
  'sơn trà': { lat: 16.1167, lng: 108.2667 },
  'hải châu': { lat: 16.0667, lng: 108.2167 },
  'thanh khê': { lat: 16.0667, lng: 108.1833 },
  'liên chiểu': { lat: 16.0833, lng: 108.1333 },
  
  // Nghệ An
  'vinh': { lat: 18.6796, lng: 105.6813 },
  'cửa lò': { lat: 18.8000, lng: 105.7167 },
  'nam đàn': { lat: 18.6500, lng: 105.4833 },
  
  // Hà Tĩnh
  'hà tĩnh': { lat: 18.3333, lng: 105.9000 },
  'kỳ anh': { lat: 18.0667, lng: 106.2833 },
  'hương khê': { lat: 18.1833, lng: 105.6833 },
  
  // Quảng Ngãi
  'quảng ngãi': { lat: 15.1167, lng: 108.8000 },
  
  // Bình Định
  'quy nhơn': { lat: 13.7833, lng: 109.2167 },
  
  // Default fallback
  'việt nam': { lat: 16.0, lng: 108.0 },
  'miền trung': { lat: 16.0, lng: 108.0 },
};

// ============ VIETNAMESE ADDRESS NORMALIZATION ============

/**
 * Normalize Vietnamese address for better matching
 */
function normalizeVietnameseAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    // Remove common prefixes
    .replace(/^(xóm|thôn|xã|huyện|tỉnh|tp\.?|thành phố|quận|phường)\s*/gi, '')
    // Normalize Vietnamese characters
    .normalize('NFC')
    // Remove extra whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Extract location keywords from Vietnamese address
 */
function extractLocationKeywords(address: string): string[] {
  const normalized = normalizeVietnameseAddress(address);
  
  // Split by common separators
  const parts = normalized.split(/[,\-–\.\/\\]+/).map(s => s.trim()).filter(Boolean);
  
  // Also try individual words for very specific locations
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  
  return [...parts, ...words];
}

// ============ CACHING ============

/**
 * Get cached result if available and not expired
 */
function getCachedResult(address: string): GeocodeCacheEntry | null {
  const normalized = normalizeVietnameseAddress(address);
  const cached = geocodeCache.get(normalized);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`[Geocoding] Cache hit for: "${address}"`);
    return cached;
  }
  
  return null;
}

/**
 * Cache geocoding result
 */
function cacheResult(
  address: string,
  coordinates: { lat: number; lng: number },
  source: string,
): void {
  const normalized = normalizeVietnameseAddress(address);
  geocodeCache.set(normalized, {
    coordinates,
    source,
    timestamp: Date.now(),
  });
  console.log(`[Geocoding] Cached result for: "${address}"`);
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): number {
  let cleared = 0;
  const now = Date.now();
  
  for (const [key, entry] of geocodeCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      geocodeCache.delete(key);
      cleared++;
    }
  }
  
  console.log(`[Geocoding] Cleared ${cleared} expired cache entries`);
  return cleared;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; ttl: number } {
  return {
    size: geocodeCache.size,
    ttl: CACHE_TTL_MS,
  };
}

// ============ RATE LIMITING ============

/**
 * Wait for rate limit if needed
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  
  if (timeSinceLastCall < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastCall;
    console.log(`[Geocoding] Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastApiCallTime = Date.now();
}

// ============ LOCAL LOOKUP ============

/**
 * Tìm tọa độ từ địa chỉ văn bản (local lookup)
 */
function findCoordinatesLocal(address: string): { lat: number; lng: number } | null {
  const keywords = extractLocationKeywords(address);
  
  for (const keyword of keywords) {
    for (const [key, coords] of Object.entries(VIETNAM_LOCATIONS)) {
      if (keyword.includes(key) || key.includes(keyword)) {
        return coords;
      }
    }
  }
  
  return null;
}

// ============ NOMINATIM API ============

/**
 * Gọi Nominatim API để geocode (free, không cần API key)
 * Tuân thủ Nominatim Usage Policy: max 1 request/second
 */
async function geocodeWithNominatim(address: string): Promise<{ 
  lat: number; 
  lng: number;
  display_name?: string;
} | null> {
  try {
    // Apply rate limiting
    await waitForRateLimit();
    
    // Prepare query with Vietnam context
    const query = encodeURIComponent(`${address}, Vietnam`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=vn&accept-language=vi`;
    
    console.log(`[Geocoding] Calling Nominatim API for: "${address}"`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SOS-Bridge-Agent/1.0 (Flood Rescue Coordination System)',
      },
    });
    
    if (!response.ok) {
      console.log(`[Geocoding] Nominatim API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as Array<{ 
      lat: string; 
      lon: string; 
      display_name: string;
    }>;
    
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      };
      console.log(`[Geocoding] Nominatim found: ${result.lat}, ${result.lng}`);
      return result;
    }
    
    console.log(`[Geocoding] Nominatim: No results found`);
    return null;
  } catch (error) {
    console.log(`[Geocoding] Nominatim API error:`, error);
    return null;
  }
}

// ============ MAIN GEOCODE FUNCTION ============

/**
 * Hàm geocode địa chỉ
 * @param address - Địa chỉ cần geocode
 * @param useApi - Sử dụng Nominatim API (default: true)
 */
async function geocodeAddress(address: string, useApi: boolean = true) {
  console.log(`[Geocoding] Looking up: "${address}"`);
  
  // 1. Check cache first
  const cached = getCachedResult(address);
  if (cached) {
    return {
      success: true,
      coordinates: cached.coordinates,
      source: `${cached.source} (cached)`,
      address_normalized: address,
    };
  }
  
  // 2. Try local lookup for known locations (fastest)
  const localResult = findCoordinatesLocal(address);
  
  if (localResult) {
    console.log(`[Geocoding] Found local: ${localResult.lat}, ${localResult.lng}`);
    cacheResult(address, localResult, 'local_database');
    return {
      success: true,
      coordinates: localResult,
      source: 'local_database',
      address_normalized: address,
    };
  }
  
  // 3. Try Nominatim API if enabled
  if (useApi) {
    const apiResult = await geocodeWithNominatim(address);
    
    if (apiResult) {
      const coords = { lat: apiResult.lat, lng: apiResult.lng };
      cacheResult(address, coords, 'nominatim_api');
      return {
        success: true,
        coordinates: coords,
        source: 'nominatim_api',
        address_normalized: apiResult.display_name || address,
      };
    }
  }
  
  // 4. Fallback: sử dụng tọa độ mặc định của miền Trung
  console.log(`[Geocoding] Using fallback coordinates for central Vietnam`);
  const fallbackCoords = { lat: 16.5, lng: 107.5 };
  
  return {
    success: false,
    coordinates: fallbackCoords,
    source: 'fallback',
    address_normalized: address,
    warning: 'Không tìm thấy tọa độ chính xác, sử dụng tọa độ ước lượng khu vực miền Trung',
  };
}

/**
 * Geocoding Tool - Chuyển địa chỉ thành tọa độ GPS
 */
export const geocodingTool = new FunctionTool(geocodeAddress, {
  name: 'geocode_address',
  description: `Chuyển đổi địa chỉ văn bản thành tọa độ GPS (latitude, longitude).
  
  Hỗ trợ:
  - Địa chỉ tiếng Việt (xóm, thôn, xã, huyện, tỉnh)
  - Địa danh phổ biến miền Trung Việt Nam
  - Tự động gọi Nominatim API (OpenStreetMap) nếu không tìm thấy local
  - Caching kết quả để tăng tốc độ
  - Rate limiting để tuân thủ Nominatim policy`,
});

// ============ DISTANCE CALCULATOR ============

/**
 * Tính khoảng cách giữa 2 điểm (km) - Haversine formula
 */
function calculateDistanceBetweenPoints(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return {
    distance_km: Math.round(distance * 100) / 100,
    distance_m: Math.round(distance * 1000),
  };
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const distanceCalculatorTool = new FunctionTool(calculateDistanceBetweenPoints, {
  name: 'calculate_distance',
  description: 'Tính khoảng cách giữa 2 điểm GPS (đơn vị km và m)',
});

// ============ EXPORTS ============

export { geocodeAddress, calculateDistanceBetweenPoints, geocodeCache };
