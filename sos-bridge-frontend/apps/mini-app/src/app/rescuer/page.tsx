'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Bell,
  User,
  Trophy,
  Navigation,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MissionCard } from '@/components/MissionCard';
import { useTelegram, useHaptic, useBackButton } from '@/hooks/useTelegram';
import { useLocation } from '@/hooks/useLocation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { RescueTicket, Rescuer } from '@sos-bridge/types';
import { Spinner } from '@sos-bridge/ui';

// Dynamically import Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

function RescuerRadarContent() {
  const t = useTranslations('rescuer.radar');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useTelegram();
  const haptic = useHaptic();
  const backButton = useBackButton();
  const queryClient = useQueryClient();
  const { lat, lng, hasLocation, requestLocation, loading: locationLoading } = useLocation();

  const [isOnline, setIsOnline] = useState(false);
  const [selectedMission, setSelectedMission] = useState<RescueTicket | null>(null);

  // Back button
  useEffect(() => {
    backButton.show(() => router.push('/'));
    return () => backButton.hide();
  }, [backButton, router]);

  // Auto-request location
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Fetch rescuer profile
  const { data: rescuerData } = useQuery({
    queryKey: queryKeys.rescuers.byTelegram(user?.id || 0),
    queryFn: () => apiClient.getRescuerByTelegramId(user?.id || 0),
    enabled: !!user?.id,
  });

  const rescuer = rescuerData?.data;

  // Fetch nearby missions
  const {
    data: missionsData,
    isLoading: missionsLoading,
    refetch: refetchMissions,
  } = useQuery({
    queryKey: queryKeys.missions.nearby(lat || 0, lng || 0),
    queryFn: () => apiClient.getNearbyMissions(lat!, lng!, 10),
    enabled: hasLocation && isOnline,
    refetchInterval: isOnline ? 30000 : false, // Refetch every 30s when online
  });

  const missions = missionsData?.data || [];

  // Accept mission mutation
  const acceptMutation = useMutation({
    mutationFn: (ticketId: string) =>
      apiClient.acceptMission(ticketId, rescuer?.rescuer_id || ''),
    onSuccess: (response) => {
      if (response.success && response.data) {
        haptic.notification('success');
        router.push(`/rescuer/mission/${response.data.ticket_id}`);
      }
    },
    onError: () => {
      haptic.notification('error');
    },
  });

  // Toggle online status
  const toggleOnline = () => {
    if (!rescuer) {
      router.push('/rescuer/profile');
      return;
    }
    haptic.impact('medium');
    setIsOnline(!isOnline);
  };

  const handleAcceptMission = (ticket: RescueTicket) => {
    setSelectedMission(ticket);
    acceptMutation.mutate(ticket.ticket_id);
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
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
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">
              {isOnline
                ? t('missionsNearby', { count: missions.length })
                : t('offline')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/rescuer/profile')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            >
              <User className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => router.push('/rescuer/leaderboard')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100"
            >
              <Trophy className="h-5 w-5 text-yellow-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Online Toggle */}
      <div className="bg-white px-4 py-3 border-b">
        <button
          onClick={toggleOnline}
          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 transition-colors ${
            isOnline
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
            <span className="font-medium">
              {isOnline ? t('online') : t('offline')}
            </span>
          </div>
          <div
            className={`h-6 w-11 rounded-full p-1 transition-colors ${
              isOnline ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                isOnline ? 'translate-x-5' : ''
              }`}
            />
          </div>
        </button>
      </div>

      {/* Map View */}
      {hasLocation && isOnline && (
        <div className="h-[250px] w-full">
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
          />
          <MapContainer
            center={[lat!, lng!]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Your location */}
            <Circle
              center={[lat!, lng!]}
              radius={100}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
            />
            {/* Missions */}
            {missions.map((mission) => (
              <Marker
                key={mission.ticket_id}
                position={[mission.location.lat, mission.location.lng]}
                eventHandlers={{
                  click: () => setSelectedMission(mission),
                }}
              />
            ))}
          </MapContainer>
        </div>
      )}

      {/* Mission List */}
      <main className="flex-1 px-4 py-4">
        {!rescuer ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-yellow-50 p-6 text-center"
          >
            <User className="mx-auto mb-3 h-12 w-12 text-yellow-500" />
            <h2 className="mb-2 font-semibold text-gray-800">
              {t('notRegistered')}
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              {t('registerPrompt')}
            </p>
            <button
              onClick={() => router.push('/rescuer/profile')}
              className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white"
            >
              {t('registerNow')}
            </button>
          </motion.div>
        ) : !isOnline ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <WifiOff className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">
              {t('turnOnline')}
            </p>
          </motion.div>
        ) : missionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : missions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h2 className="mb-2 font-semibold text-gray-700">
              {t('noMissionsNearby')}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {t('willNotify')}
            </p>
            <button
              onClick={() => {
                refetchMissions();
                haptic.impact('light');
              }}
              className="flex items-center justify-center gap-2 mx-auto rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
              {tCommon('refresh')}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">
                {t('missionsNearbyCount', { count: missions.length })}
              </h2>
              <button
                onClick={() => refetchMissions()}
                className="text-sm text-blue-500"
              >
                {tCommon('refresh')}
              </button>
            </div>
            {missions.map((mission, index) => (
              <motion.div
                key={mission.ticket_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <MissionCard
                  ticket={mission}
                  distance={
                    hasLocation
                      ? calculateDistance(
                          lat!,
                          lng!,
                          mission.location.lat,
                          mission.location.lng
                        )
                      : undefined
                  }
                  onAccept={() => handleAcceptMission(mission)}
                  onDecline={() => setSelectedMission(null)}
                  isAccepting={
                    acceptMutation.isPending &&
                    selectedMission?.ticket_id === mission.ticket_id
                  }
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function RescuerRadarPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <RescuerRadarContent />
    </Suspense>
  );
}
