'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  MapPin,
  Phone,
  Users,
  MessageSquare,
  Baby,
  PersonStanding,
  Accessibility,
  RefreshCw,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { MiniMap, MiniMapSkeleton } from '@/components/MiniMap';
import { useLocation } from '@/hooks/useLocation';
import { useTelegram, useHaptic, useMainButton, useBackButton } from '@/hooks/useTelegram';
import { Button } from '@sos-bridge/ui';
import { apiClient } from '@sos-bridge/api-client';

// Default location for Central Vietnam (Huế) when GPS is unavailable
const DEFAULT_LOCATION = {
  lat: 16.4637,
  lng: 107.5909,
  name: 'Miền Trung Việt Nam',
};

function SOSFormContent() {
  const t = useTranslations('sos');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, webApp, isTelegram } = useTelegram();
  const haptic = useHaptic();
  const mainButton = useMainButton();
  const backButton = useBackButton();
  const { lat, lng, requestLocation, setManualLocation, hasLocation, loading: locationLoading, error: locationError } = useLocation();

  const [formData, setFormData] = useState({
    phone: '',
    peopleCount: 1,
    note: '',
    hasElderly: false,
    hasChildren: false,
    hasDisabled: false,
    addressText: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useManualAddress, setUseManualAddress] = useState(false);

  // Get initial location from URL params
  const initialLat = searchParams.get('lat');
  const initialLng = searchParams.get('lng');
  const isManualMode = searchParams.get('manual') === 'true';

  // Set up back button
  useEffect(() => {
    backButton.show(() => {
      router.back();
    });
    return () => backButton.hide();
  }, [backButton, router]);

  // Request location if not provided and not in manual mode
  useEffect(() => {
    if (!initialLat || !initialLng) {
      if (!isManualMode) {
      requestLocation();
      } else {
        setUseManualAddress(true);
      }
    }
  }, [initialLat, initialLng, isManualMode]);

  // If location error, switch to manual mode
  useEffect(() => {
    if (locationError && !hasLocation) {
      setUseManualAddress(true);
    }
  }, [locationError, hasLocation]);

  const currentLat = initialLat ? parseFloat(initialLat) : lat;
  const currentLng = initialLng ? parseFloat(initialLng) : lng;
  const hasValidLocation = currentLat !== null && currentLng !== null;

  // Can submit if has GPS OR has manual address
  const canSubmit = (hasValidLocation || (useManualAddress && formData.addressText.trim().length >= 5)) && formData.phone.length >= 9;

  // Calculate priority based on special needs
  const calculatePriority = () => {
    let priority = 3; // Default medium
    if (formData.hasChildren) priority = Math.max(priority, 4);
    if (formData.hasElderly) priority = Math.max(priority, 4);
    if (formData.hasDisabled) priority = 5;
    if (formData.peopleCount >= 5) priority = Math.max(priority, 4);
    return priority;
  };

  const handleUseDefaultLocation = () => {
    setManualLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
    haptic.impact('light');
  };

  const handleSubmit = async () => {
    console.log('[Form] Submit started');
    
    // Validate phone
    if (!formData.phone || formData.phone.length < 9) {
      const errorMsg = t('phoneError');
      setError(errorMsg);
      console.log('[Form] Validation failed:', errorMsg);
      return;
    }

    // Validate location OR address
    if (!hasValidLocation && !formData.addressText.trim()) {
      const errorMsg = t('locationOrAddressError');
      setError(errorMsg);
      console.log('[Form] Validation failed:', errorMsg);
      return;
    }

    if (!hasValidLocation && formData.addressText.trim().length < 5) {
      const errorMsg = t('addressTooShort');
      setError(errorMsg);
      console.log('[Form] Validation failed:', errorMsg);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    haptic.impact('medium');

    try {
      // Use GPS location if available, otherwise use default + address text
      const submitLat = currentLat ?? DEFAULT_LOCATION.lat;
      const submitLng = currentLng ?? DEFAULT_LOCATION.lng;
      const submitAddress = formData.addressText.trim() || 
        (hasValidLocation ? `Tọa độ: ${currentLat?.toFixed(6)}, ${currentLng?.toFixed(6)}` : DEFAULT_LOCATION.name);

      const ticketData = {
        phone: formData.phone,
        lat: submitLat,
        lng: submitLng,
        address_text: submitAddress,
        people_count: formData.peopleCount,
        priority: calculatePriority(),
        note: formData.note + (useManualAddress && !hasValidLocation ? ' [Địa chỉ nhập thủ công - chưa xác định GPS]' : ''),
        has_elderly: formData.hasElderly,
        has_children: formData.hasChildren,
        telegram_user_id: user?.id,
      };

      console.log('[Form] Submitting ticket data:', ticketData);

      const response = await apiClient.createTicket(ticketData);

      console.log('[Form] API response:', response);

      if (response.success && response.data) {
        console.log('[Form] Ticket created successfully:', response.data.ticket_id);
        haptic.notification('success');
        
        // Navigate to ticket detail page
        const ticketUrl = `/sos/${response.data.ticket_id}`;
        console.log('[Form] Navigating to:', ticketUrl);
        
        // Telegram WebView không hỗ trợ Next.js client-side navigation tốt
        // Sử dụng full page navigation thay vì SPA navigation
        if (isTelegram) {
          console.log('[Form] Using window.location for Telegram WebView');
          window.location.href = ticketUrl;
        } else {
          router.push(ticketUrl);
        }
      } else {
        const errorMsg = response.error || 'Không thể tạo yêu cầu cứu hộ';
        console.error('[Form] API returned error:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('[Form] Submit error:', err);
      
      let errorMessage: string;
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('[Form] Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });
      } else {
        errorMessage = 'Lỗi không xác định. Vui lòng thử lại.';
        console.error('[Form] Unknown error type:', typeof err, err);
      }
      
      setError(errorMessage);
      haptic.notification('error');
      
      // Show Telegram alert for better visibility in WebView
      if (webApp?.showAlert) {
        try {
          webApp.showAlert(`Lỗi gửi yêu cầu: ${errorMessage}`);
        } catch (alertErr) {
          console.warn('[Form] Could not show Telegram alert:', alertErr);
        }
      }
    } finally {
      setIsSubmitting(false);
      console.log('[Form] Submit completed');
    }
  };

  // Main button setup
  useEffect(() => {
    mainButton.show(t('submitButton'), handleSubmit);
    if (isSubmitting) {
      mainButton.setLoading(true);
    } else {
      mainButton.setLoading(false);
    }
    return () => mainButton.hide();
  }, [formData, isSubmitting, hasValidLocation, useManualAddress, t]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white safe-top">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-red-50/90 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-xl font-bold text-gray-900">{t('formTitle')}</h1>
        <p className="text-sm text-gray-500">{t('formSubtitle')}</p>
      </header>

      <main className="px-4 pb-32 pt-4">
        {/* Location Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <MapPin className="h-4 w-4 text-red-600" />
              </div>
              <span className="font-semibold text-gray-800">{t('locationRequired')}</span>
              {locationLoading && (
                <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {tc('loading')}
                </span>
              )}
            </div>

            {hasValidLocation ? (
              <div className="space-y-3">
                {/* Address input FIRST - most important */}
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3">
                  <label className="block text-xs font-semibold text-red-700 mb-2">
                    📍 {t('enterDetailedAddress')}
                  </label>
                <input
                  type="text"
                    placeholder={t('addressPlaceholder')}
                  value={formData.addressText}
                  onChange={(e) => setFormData({ ...formData, addressText: e.target.value })}
                    className="w-full rounded-lg border-2 border-red-300 bg-white px-3 py-3 text-sm font-medium focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                </div>

                {/* Map container - smaller, below input */}
                <div className="relative h-[80px] w-full overflow-hidden rounded-lg border border-gray-200">
                  <MiniMap lat={currentLat!} lng={currentLng!} className="h-full w-full" />
                </div>
                
                {/* GPS confirmation - compact */}
                <p className="text-center text-xs text-green-600">
                  ✓ {t('gpsConfirmed')}: {currentLat?.toFixed(4)}, {currentLng?.toFixed(4)}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Manual Address Input */}
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      {locationError || t('manualAddressWarning')}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={requestLocation}
                      disabled={locationLoading}
                      className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                >
                      <RefreshCw className={`h-3 w-3 ${locationLoading ? 'animate-spin' : ''}`} />
                      {t('retryGPS')}
                    </button>
                    
                    <button
                      onClick={handleUseDefaultLocation}
                      className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
                    >
                      <Navigation className="h-3 w-3" />
                      {tc('back')}
                </button>
                  </div>
                </div>
                
                {/* Address Input - Required when no GPS */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('addressRequired')}
                  </label>
                  <textarea
                    placeholder={t('addressExample')}
                    value={formData.addressText}
                    onChange={(e) => setFormData({ ...formData, addressText: e.target.value })}
                    rows={3}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      formData.addressText.length >= 5 
                        ? 'border-green-300 focus:border-green-300 focus:ring-green-100' 
                        : 'border-gray-200 focus:border-red-300 focus:ring-red-100'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.addressText.length >= 5 
                      ? `✓ ${t('addressValid')}` 
                      : `${t('addressMinChars')} (${formData.addressText.length}/5)`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Phone Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-800">{t('phone')}</span>
            </div>
            <input
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-lg focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
              required
            />
          </div>
        </motion.div>

        {/* People Count Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <span className="font-semibold text-gray-800">{t('peopleCount')}</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setFormData({ ...formData, peopleCount: Math.max(1, formData.peopleCount - 1) })}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600 transition-colors hover:bg-gray-200"
              >
                -
              </button>
              <span className="w-16 text-center text-3xl font-bold text-gray-800">
                {formData.peopleCount}
              </span>
              <button
                onClick={() => setFormData({ ...formData, peopleCount: formData.peopleCount + 1 })}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600 transition-colors hover:bg-red-200"
              >
                +
              </button>
            </div>
          </div>
        </motion.div>

        {/* Special Needs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-gray-600">
              {t('specialNeeds')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFormData({ ...formData, hasElderly: !formData.hasElderly })}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  formData.hasElderly
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <PersonStanding className="h-4 w-4" />
                {t('elderly')}
              </button>
              <button
                onClick={() => setFormData({ ...formData, hasChildren: !formData.hasChildren })}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  formData.hasChildren
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Baby className="h-4 w-4" />
                {t('children')}
              </button>
              <button
                onClick={() => setFormData({ ...formData, hasDisabled: !formData.hasDisabled })}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  formData.hasDisabled
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Accessibility className="h-4 w-4" />
                {t('disabled')}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Note Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-4"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                <MessageSquare className="h-4 w-4 text-yellow-600" />
              </div>
              <span className="font-semibold text-gray-800">{t('notes')}</span>
            </div>
            <textarea
              placeholder={t('notesPlaceholder')}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
        </motion.div>

        {/* Priority Preview */}
        {(formData.hasChildren || formData.hasElderly || formData.hasDisabled) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 rounded-2xl bg-red-50 p-4"
          >
            <p className="text-center text-sm font-medium text-red-700">
              ⚡ {t('priorityHigh')}
            </p>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-xl bg-red-100 p-3"
          >
            <p className="text-center text-sm font-bold text-red-800 mb-1">{tc('error')}:</p>
            <p className="text-center text-sm text-red-700">{error}</p>
            <details className="mt-2 text-left">
              <summary className="text-xs text-red-600 cursor-pointer">Debug</summary>
              <pre className="mt-1 text-xs bg-red-200 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify({
                  isTelegram,
                  hasLocation: hasValidLocation,
                  phone: formData.phone?.length,
                  timestamp: new Date().toISOString()
                }, null, 2)}
              </pre>
            </details>
          </motion.div>
        )}

        {/* Submit Button (Fallback for non-Telegram) */}
        <div className="mt-6 space-y-3">
          <Button
            variant="sos"
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? t('submitting') : t('submitButton')}
          </Button>
          
          {!canSubmit && (
            <p className="text-center text-xs text-gray-500">
              {formData.phone.length < 9 
                ? t('enterPhone') 
                : !hasValidLocation && formData.addressText.length < 5
                  ? t('enterDetailedAddressShort')
                  : ''
              }
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
}

export default function SOSFormPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SOSFormContent />
    </Suspense>
  );
}

