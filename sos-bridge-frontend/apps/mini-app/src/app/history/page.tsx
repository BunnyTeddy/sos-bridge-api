'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, MapPin, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { RescueTicket } from '@sos-bridge/types';
import { formatRelativeTime } from '@sos-bridge/ui';
import { StatusBadge } from '@sos-bridge/ui';
import { Spinner } from '@sos-bridge/ui';

export default function HistoryPage() {
  const t = useTranslations('history');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useTelegram();
  const backButton = useBackButton();

  // Setup back button
  useEffect(() => {
    backButton.show(() => router.back());
    return () => backButton.hide();
  }, [backButton, router]);

  // Fetch user's tickets
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-tickets', user?.id],
    queryFn: () => apiClient.getTickets({ limit: 50 }),
    enabled: true, // In real app, filter by user's phone or telegram ID
  });

  const tickets = data?.data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white px-4 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500">{t('subtitle')}</p>
      </header>

      <main className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-4 text-center">
            <p className="text-red-600">{t('cannotLoadData')}</p>
          </div>
        ) : tickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="mb-2 font-semibold text-gray-700">{t('noRequests')}</h2>
            <p className="text-sm text-gray-500">
              {t('noRequestsDesc')}
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 rounded-lg bg-red-500 px-6 py-2 font-medium text-white"
            >
              {t('newRequest')}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket, index) => (
              <TicketCard
                key={ticket.ticket_id}
                ticket={ticket}
                index={index}
                onClick={() => router.push(`/sos/${ticket.ticket_id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TicketCard({
  ticket,
  index,
  onClick,
}: {
  ticket: RescueTicket;
  index: number;
  onClick: () => void;
}) {
  const t = useTranslations('history');
  const tCommon = useTranslations('common');
  const isActive = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(ticket.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`cursor-pointer rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        isActive ? 'ring-2 ring-red-200' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            {isActive && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {t('active')}
              </span>
            )}
          </div>

          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="line-clamp-1">{ticket.location.address_text}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {ticket.victim_info.people_count} {tCommon('people')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(ticket.created_at)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-300" />
      </div>
    </motion.div>
  );
}
