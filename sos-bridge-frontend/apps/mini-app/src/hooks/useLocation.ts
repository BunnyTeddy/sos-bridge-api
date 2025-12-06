'use client';

import { useState, useCallback } from 'react';

interface LocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

// Check if running in Telegram WebApp
function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

// Compare Telegram WebApp versions
function isVersionAtLeast(version: string, minVersion: string): boolean {
  const v1 = version.split('.').map(Number);
  const v2 = minVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 > num2) return true;
    if (num1 < num2) return false;
  }
  return true;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  // Browser geolocation fallback - defined first so it can be called from other methods
  const requestBrowserLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: 'Trình duyệt không hỗ trợ định vị GPS. Vui lòng nhập vị trí thủ công.',
        loading: false,
      }));
      return;
    }

    console.log('[Location] Requesting browser geolocation...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[Location] Browser location received:', position.coords);
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (error) => {
        console.error('[Location] Browser geolocation error:', error);
        let errorMessage = 'Không thể lấy vị trí';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Bạn cần cho phép truy cập vị trí trong cài đặt Telegram hoặc trình duyệt';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Không có thông tin vị trí. Hãy thử bật GPS.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Quá thời gian chờ. Hãy thử lại.';
            break;
        }
        setLocation((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  // Request location using Telegram's native API or browser fallback
  const requestLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    const tgWebApp = getTelegramWebApp();
    const tgVersion = tgWebApp?.version || '6.0';
    
    console.log('[Location] Telegram WebApp version:', tgVersion);

    // ===== METHOD 1: Telegram Native requestLocation (version 6.9+) =====
    // Check version support before calling
    if (tgWebApp && isVersionAtLeast(tgVersion, '6.9')) {
      try {
        if (typeof tgWebApp.requestLocation === 'function') {
          console.log('[Location] Using Telegram native requestLocation');
          
          tgWebApp.requestLocation((locationData: { latitude: number; longitude: number } | null) => {
            if (locationData && locationData.latitude && locationData.longitude) {
              console.log('[Location] Telegram location received:', locationData);
              setLocation({
                lat: locationData.latitude,
                lng: locationData.longitude,
                accuracy: null,
                error: null,
                loading: false,
              });
            } else {
              console.log('[Location] Telegram location denied or unavailable');
              requestBrowserLocation();
            }
          });
          return;
        }
      } catch (err) {
        console.error('[Location] Telegram requestLocation error:', err);
        // Fall through to browser geolocation
      }
    }

    // ===== METHOD 2: Telegram LocationManager (version 7.0+) =====
    // Only try if version supports it
    if (tgWebApp && isVersionAtLeast(tgVersion, '7.0')) {
      try {
        const locationManager = (tgWebApp as any).LocationManager;
        if (locationManager && typeof locationManager.init === 'function') {
          console.log('[Location] Using Telegram LocationManager');
          
          const handleLocation = (locationData: any) => {
            if (locationData && locationData.latitude) {
              setLocation({
                lat: locationData.latitude,
                lng: locationData.longitude,
                accuracy: locationData.horizontal_accuracy || null,
                error: null,
                loading: false,
              });
            } else {
              requestBrowserLocation();
            }
          };
          
          if (locationManager.isInited) {
            locationManager.getLocation(handleLocation);
          } else {
            locationManager.init(() => {
              locationManager.getLocation(handleLocation);
            });
          }
          return;
        }
      } catch (err) {
        console.error('[Location] Telegram LocationManager error:', err);
        // Fall through to browser geolocation
      }
    }

    // ===== METHOD 3: Browser Geolocation API (fallback) =====
    console.log('[Location] Telegram version too old or not in Telegram, falling back to browser geolocation');
    requestBrowserLocation();
  }, [requestBrowserLocation]);

  // Watch location changes (uses browser API)
  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) return null;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (error) => {
        console.error('[Location] Watch location error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    return watchId;
  }, []);

  // Manual location input (for when GPS fails)
  const setManualLocation = useCallback((lat: number, lng: number) => {
    setLocation({
      lat,
      lng,
      accuracy: null,
      error: null,
      loading: false,
    });
  }, []);

  // Clear location
  const clearLocation = useCallback(() => {
    setLocation({
      lat: null,
      lng: null,
      accuracy: null,
      error: null,
      loading: false,
    });
  }, []);

  return {
    ...location,
    requestLocation,
    watchLocation,
    setManualLocation,
    clearLocation,
    hasLocation: location.lat !== null && location.lng !== null,
  };
}

