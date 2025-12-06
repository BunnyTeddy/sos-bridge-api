'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Filter,
  Search,
  User,
  Phone,
  Star,
  MapPin,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AddRescuerModal } from '@/components/modals';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { Rescuer, RescuerStatus } from '@sos-bridge/types';
import { VEHICLE_TYPE_NAMES, VEHICLE_TYPE_EMOJIS } from '@sos-bridge/types';
import { StatusBadge, formatPhone, formatRelativeTime, truncateAddress } from '@sos-bridge/ui';
import { Spinner } from '@sos-bridge/ui';

export default function RescuersPage() {
  const t = useTranslations('rescuers');
  const tStatus = useTranslations('status');
  const tCommon = useTranslations('common');

  const statusFilters: { value: RescuerStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: tCommon('all') },
    { value: 'ONLINE', label: tStatus('ONLINE') },
    { value: 'ON_MISSION', label: tStatus('ON_MISSION') },
    { value: 'OFFLINE', label: tStatus('OFFLINE') },
  ];

  const [statusFilter, setStatusFilter] = useState<RescuerStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch rescuers
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.rescuers.list({ status: statusFilter }),
    queryFn: () =>
      apiClient.getRescuers({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100,
      }),
    refetchInterval: 30000,
  });

  const rescuers = data?.data?.data || [];

  // Filter by search
  const filteredRescuers = rescuers.filter((rescuer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rescuer.name.toLowerCase().includes(query) ||
      rescuer.phone.includes(query) ||
      rescuer.rescuer_id.toLowerCase().includes(query)
    );
  });

  // Stats
  const onlineCount = rescuers.filter((r) => r.status === 'ONLINE').length;
  const onMissionCount = rescuers.filter((r) => r.status === 'ON_MISSION').length;
  const totalMissions = rescuers.reduce((sum, r) => sum + r.completed_missions, 0);

  return (
    <DashboardLayout
      title={t('title')}
      subtitle={`${filteredRescuers.length} ${t('teams')}`}
      onRefresh={() => refetch()}
    >
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="flex gap-4">
          <div className="rounded-lg border bg-green-50 px-4 py-2">
            <span className="text-2xl font-bold text-green-600">{onlineCount}</span>
            <span className="ml-2 text-sm text-green-700">{t('online')}</span>
          </div>
          <div className="rounded-lg border bg-blue-50 px-4 py-2">
            <span className="text-2xl font-bold text-blue-600">{onMissionCount}</span>
            <span className="ml-2 text-sm text-blue-700">{t('onMission')}</span>
          </div>
          <div className="rounded-lg border bg-purple-50 px-4 py-2">
            <span className="text-2xl font-bold text-purple-600">{totalMissions}</span>
            <span className="ml-2 text-sm text-purple-700">{t('totalMissions')}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RescuerStatus | 'ALL')}
                className="border-none bg-transparent text-sm focus:outline-none"
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-lg border bg-card py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {t('addTeam')}
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRescuers.map((rescuer) => (
              <RescuerCard key={rescuer.rescuer_id} rescuer={rescuer} />
            ))}

            {filteredRescuers.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                {t('noTeamsFound')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Rescuer Modal */}
      <AddRescuerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => refetch()}
      />
    </DashboardLayout>
  );
}

function RescuerCard({ rescuer }: { rescuer: Rescuer }) {
  const t = useTranslations('rescuers');
  const tCommon = useTranslations('common');
  const [showMenu, setShowMenu] = useState(false);
  const isOnline = rescuer.status === 'ONLINE' || rescuer.status === 'ON_MISSION';

  return (
    <div className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{rescuer.name}</h3>
            <p className="text-sm text-muted-foreground">
              {VEHICLE_TYPE_EMOJIS[rescuer.vehicle_type]}{' '}
              {VEHICLE_TYPE_NAMES[rescuer.vehicle_type]}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-1 hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border bg-card py-1 shadow-lg">
                <Link
                  href={`/rescuers/${rescuer.rescuer_id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <Eye className="h-4 w-4" />
                  {t('viewDetails')}
                </Link>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted">
                  <Ban className="h-4 w-4" />
                  {t('suspend')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{formatPhone(rescuer.phone)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">{rescuer.rating.toFixed(1)}</span>
          <span className="text-muted-foreground">
            • {rescuer.completed_missions} {tCommon('missions')}
          </span>
        </div>
        {rescuer.wallet_address && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('wallet')}:</span>
            <span className="font-mono text-xs">
              {truncateAddress(rescuer.wallet_address)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <StatusBadge status={rescuer.status} />
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(rescuer.last_active_at)}
        </span>
      </div>
    </div>
  );
}
