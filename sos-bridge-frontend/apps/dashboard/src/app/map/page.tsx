'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { X, MapPin, Users, Phone, Navigation } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { LiveMap } from '@/components/map/live-map';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { RescueTicket, Rescuer } from '@sos-bridge/types';
import { STATUS_LABELS, PRIORITY_LABELS, VEHICLE_TYPE_NAMES } from '@sos-bridge/types';
import { StatusBadge, PriorityBadge, formatRelativeTime, formatPhone } from '@sos-bridge/ui';
import { Spinner } from '@sos-bridge/ui';

export default function MapPage() {
  const t = useTranslations('map');
  const [selectedTicket, setSelectedTicket] = useState<RescueTicket | null>(null);
  const [selectedRescuer, setSelectedRescuer] = useState<Rescuer | null>(null);

  // Fetch tickets
  const { data: ticketsData, isLoading: ticketsLoading, refetch } = useQuery({
    queryKey: queryKeys.tickets.all,
    queryFn: () => apiClient.getTickets({ limit: 100 }),
    refetchInterval: 15000,
  });

  // Fetch rescuers
  const { data: rescuersData, isLoading: rescuersLoading } = useQuery({
    queryKey: queryKeys.rescuers.all,
    queryFn: () => apiClient.getRescuers({ limit: 100 }),
    refetchInterval: 15000,
  });

  const tickets = ticketsData?.data?.data || [];
  const rescuers = rescuersData?.data?.data || [];
  const isLoading = ticketsLoading || rescuersLoading;

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <DashboardLayout
      title={t('title')}
      subtitle={t('subtitle', { tickets: tickets.length, online: rescuers.filter((r) => r.status === 'ONLINE').length })}
      onRefresh={handleRefresh}
    >
      <div className="relative h-[calc(100vh-140px)]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <LiveMap
              tickets={tickets}
              rescuers={rescuers}
              onTicketClick={setSelectedTicket}
              onRescuerClick={setSelectedRescuer}
            />

            {/* Ticket Detail Panel */}
            {selectedTicket && (
              <div className="absolute right-4 top-20 z-[1001] w-80 rounded-xl bg-card shadow-xl">
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="font-semibold">{t('ticketDetail')}</h3>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="rounded-lg p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <StatusBadge status={selectedTicket.status} />
                    <PriorityBadge priority={selectedTicket.priority} />
                  </div>

                  <div className="mb-3 flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-foreground">
                      {selectedTicket.location.address_text}
                    </p>
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {t('peopleNeedRescue', { count: selectedTicket.victim_info.people_count })}
                    </p>
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {formatPhone(selectedTicket.victim_info.phone)}
                    </p>
                  </div>

                  {selectedTicket.victim_info.note && (
                    <div className="mb-3 rounded-lg bg-muted p-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedTicket.victim_info.note}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {t('createdAt')}: {formatRelativeTime(selectedTicket.created_at)}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${selectedTicket.location.lat},${selectedTicket.location.lng}`,
                          '_blank'
                        );
                      }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-500 py-2 text-sm font-medium text-white"
                    >
                      <Navigation className="h-4 w-4" />
                      {t('directions')}
                    </button>
                    <a
                      href={`/tickets/${selectedTicket.ticket_id}`}
                      className="flex flex-1 items-center justify-center rounded-lg bg-muted py-2 text-sm font-medium"
                    >
                      {t('details')}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Rescuer Detail Panel */}
            {selectedRescuer && (
              <div className="absolute right-4 top-20 z-[1001] w-80 rounded-xl bg-card shadow-xl">
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="font-semibold">{t('rescueTeam')}</h3>
                  <button
                    onClick={() => setSelectedRescuer(null)}
                    className="rounded-lg p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedRescuer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {VEHICLE_TYPE_NAMES[selectedRescuer.vehicle_type]}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-lg font-bold">
                        {selectedRescuer.rating.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('rating')}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-lg font-bold">
                        {selectedRescuer.completed_missions}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('missions')}</p>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{formatPhone(selectedRescuer.phone)}</p>
                  </div>

                  <StatusBadge status={selectedRescuer.status} />

                  <div className="mt-4 flex gap-2">
                    <a
                      href={`tel:${selectedRescuer.phone}`}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-2 text-sm font-medium text-white"
                    >
                      <Phone className="h-4 w-4" />
                      {t('call')}
                    </a>
                    <a
                      href={`/rescuers/${selectedRescuer.rescuer_id}`}
                      className="flex flex-1 items-center justify-center rounded-lg bg-muted py-2 text-sm font-medium"
                    >
                      {t('details')}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}






