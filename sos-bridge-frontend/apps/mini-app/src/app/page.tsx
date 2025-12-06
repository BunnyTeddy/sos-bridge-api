'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Users, Navigation, AlertTriangle, RefreshCw, MapPinOff, Edit3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SOSButton } from '@/components/SOSButton';
import { MiniMap, MiniMapSkeleton } from '@/components/MiniMap';
import { useLocation } from '@/hooks/useLocation';
import { useTelegram, useHaptic } from '@/hooks/useTelegram';
import { LanguageSwitcher } from '@sos-bridge/ui';

export default function HomePage() {
  const t = useTranslations('home');
  const router = useRouter();
  const { user, isTelegram, startParam, webApp } = useTelegram();
  const { lat, lng, loading, error, requestLocation, setManualLocation, hasLocation } = useLocation();
  const haptic = useHaptic();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Check if user came with rescuer start param
  useEffect(() => {
    if (startParam === 'rescuer') {
      router.push('/rescuer');
    }
  }, [startParam, router]);

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const handleRetryLocation = () => {
    haptic.impact('light');
    setRetryCount(prev => prev + 1);
    requestLocation();
  };

  const handleSOSActivate = () => {
    haptic.notification('success');
    // Navigate to SOS form with location data
    if (hasLocation) {
      router.push(`/sos/form?lat=${lat}&lng=${lng}`);
    } else {
      // Still allow going to form without location - they can input address manually
      router.push('/sos/form');
    }
  };

  const handleSkipLocation = () => {
    haptic.impact('medium');
    // Go to form without location - user will input address
    router.push('/sos/form?manual=true');
  };

  const handleRescuerMode = () => {
    haptic.impact('medium');
    router.push('/rescuer');
  };

  // Use default location for Central Vietnam if GPS fails
  const handleUseDefaultLocation = () => {
    haptic.impact('light');
    // Default: Huế, Central Vietnam
    setManualLocation(16.4637, 107.5909);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-50 to-white safe-top safe-bottom">
      {/* Header */}
      <header className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="minimal" size="sm" />
            {user && (
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {user.first_name?.[0] || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.first_name}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-8">
        {/* Location Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 w-full max-w-sm"
        >
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                <span className="font-medium text-gray-700">{t('yourLocation')}</span>
              </div>
              {loading && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {t('locating')}
                </span>
              )}
            </div>

            {error ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-start gap-2">
                  <MapPinOff className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 font-medium">{t('locationError')}</p>
                    <p className="text-xs text-amber-600 mt-1">{error}</p>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleRetryLocation}
                    disabled={loading}
                    className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    {t('retryLocation')} {retryCount > 0 && `(${retryCount})`}
                  </button>
                  
                  <button
                    onClick={handleUseDefaultLocation}
                    className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
                  >
                    <MapPin className="h-3 w-3" />
                    {t('useDefaultLocation')}
                  </button>
                  
                <button
                    onClick={handleSkipLocation}
                    className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                    <Edit3 className="h-3 w-3" />
                    {t('enterAddress')}
                </button>
                </div>

                {/* Tips for Telegram */}
                {isTelegram && (
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <p className="text-xs text-amber-700">
                      💡 <strong>Tip:</strong> {t('telegramTip')}
                    </p>
                  </div>
                )}
              </div>
            ) : hasLocation ? (
              <>
              <MiniMap lat={lat!} lng={lng!} className="h-[150px]" />
                <p className="mt-2 text-center text-xs text-gray-400">
                  📍 {lat?.toFixed(6)}, {lng?.toFixed(6)}
                </p>
              </>
            ) : (
              <MiniMapSkeleton className="h-[150px]" />
            )}
          </div>
        </motion.div>

        {/* SOS Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <SOSButton onActivate={handleSOSActivate} disabled={loading} />
        </motion.div>

        {/* Skip location hint when error */}
        {error && !hasLocation && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 text-xs text-gray-500 text-center max-w-xs"
          >
            {t('canStillUseSOS')}
          </motion.p>
        )}

        {/* Quick Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm space-y-2"
        >
          <div className="flex items-center justify-center gap-6 rounded-xl bg-white/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-gray-900">24</p>
                <p className="text-xs text-gray-500">{t('rescueTeams')}</p>
              </div>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <Navigation className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-gray-900">~5km</p>
                <p className="text-xs text-gray-500">{t('nearest')}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer Actions */}
      <footer className="px-4 pb-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          {/* History link */}
          <button
            onClick={() => router.push('/history')}
            className="text-sm font-medium text-gray-500 underline"
          >
            {t('viewHistory')}
          </button>

          {/* Rescuer mode toggle */}
          <button
            onClick={handleRescuerMode}
            className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
          >
            <AlertTriangle className="h-4 w-4" />
            {t('iAmRescuer')}
          </button>
        </motion.div>
      </footer>
    </div>
  );
}
