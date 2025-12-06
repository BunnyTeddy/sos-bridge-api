'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Users, 
  CheckCircle, 
  Wallet,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ActivityFeed, createActivitiesFromData } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import { Spinner } from '@sos-bridge/ui';

export default function DashboardPage() {
  const t = useTranslations('overview');

  // Fetch stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => apiClient.getStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch treasury
  const { data: treasuryData } = useQuery({
    queryKey: queryKeys.treasury,
    queryFn: () => apiClient.getTreasury(),
  });

  // Fetch recent tickets for activity
  const { data: ticketsData } = useQuery({
    queryKey: queryKeys.tickets.list({ limit: 10 }),
    queryFn: () => apiClient.getTickets({ limit: 10 }),
  });

  // Fetch transactions for activity
  const { data: transactionsData } = useQuery({
    queryKey: queryKeys.transactions.list({ limit: 5 }),
    queryFn: () => apiClient.getTransactions({ limit: 5 }),
  });

  const stats = statsData?.data;
  const treasury = treasuryData?.data;
  const tickets = ticketsData?.data?.data || [];
  const transactions = transactionsData?.data?.data || [];

  // Create activities
  const activities = createActivitiesFromData(tickets, [], transactions);

  const handleRefresh = async () => {
    await refetchStats();
  };

  return (
    <DashboardLayout 
      title={t('title')} 
      subtitle={t('subtitle')}
      onRefresh={handleRefresh}
    >
      {statsLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={t('openRequests')}
              value={stats?.tickets.open || 0}
              subtitle={`${stats?.tickets.total || 0} ${t('registered')}`}
              icon={AlertTriangle}
              iconColor="text-red-600"
              iconBg="bg-red-100"
              trend={{ value: 12, isPositive: false }}
            />
            <StatsCard
              title={t('rescuersOnline')}
              value={stats?.rescuers.online || 0}
              subtitle={`${stats?.rescuers.total || 0} ${t('registered')}`}
              icon={Users}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
            />
            <StatsCard
              title={t('completed')}
              value={stats?.tickets.completed || 0}
              subtitle={t('successfulMissions')}
              icon={CheckCircle}
              iconColor="text-green-600"
              iconBg="bg-green-100"
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard
              title={t('treasury')}
              value={`${treasury?.balance_usdc?.toLocaleString() || 0} USDC`}
              subtitle={`${t('disbursed')}: ${treasury?.total_disbursed?.toLocaleString() || 0}`}
              icon={Wallet}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Activity Feed - 2 columns */}
            <div className="lg:col-span-2">
              <ActivityFeed activities={activities} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <QuickActions />

              {/* Status Summary */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="mb-4 font-semibold text-foreground">
                  {t('requestStatus')}
                </h3>
                <div className="space-y-3">
                  <StatusBar
                    label={t('open')}
                    value={stats?.tickets.open || 0}
                    total={stats?.tickets.total || 1}
                    color="bg-red-500"
                  />
                  <StatusBar
                    label={t('assigned')}
                    value={stats?.tickets.assigned || 0}
                    total={stats?.tickets.total || 1}
                    color="bg-orange-500"
                  />
                  <StatusBar
                    label={t('inProgress')}
                    value={stats?.tickets.in_progress || 0}
                    total={stats?.tickets.total || 1}
                    color="bg-yellow-500"
                  />
                  <StatusBar
                    label={t('completed')}
                    value={stats?.tickets.completed || 0}
                    total={stats?.tickets.total || 1}
                    color="bg-green-500"
                  />
                </div>
              </div>

              {/* Rescuer Status */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="mb-4 font-semibold text-foreground">
                  {t('rescuerStatus')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.rescuers.online || 0}
                    </p>
                    <p className="text-sm text-green-700">{t('online')}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {stats?.rescuers.on_mission || 0}
                    </p>
                    <p className="text-sm text-blue-700">{t('onMission')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
