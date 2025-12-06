'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DepositModal } from '@/components/modals';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { RewardTransaction, TransactionStatus } from '@sos-bridge/types';
import { formatCurrency, formatRelativeTime, truncateAddress } from '@sos-bridge/ui';
import { Spinner, Badge } from '@sos-bridge/ui';
import { exportTransactionsToCSV } from '@/lib/export';
import { useState } from 'react';

export default function TreasuryPage() {
  const t = useTranslations('treasury');
  const tCommon = useTranslations('common');

  const statusConfig: Record<
    TransactionStatus,
    { label: string; color: string; icon: typeof CheckCircle }
  > = {
    PENDING: { label: t('statusPending'), color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    SUBMITTED: { label: t('statusSubmitted'), color: 'bg-blue-100 text-blue-700', icon: Loader2 },
    CONFIRMED: { label: t('statusConfirmed'), color: 'bg-green-100 text-green-700', icon: CheckCircle },
    FAILED: { label: t('statusFailed'), color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const [showDepositDialog, setShowDepositDialog] = useState(false);

  // Fetch treasury info
  const { data: treasuryData, isLoading: treasuryLoading, refetch } = useQuery({
    queryKey: queryKeys.treasury,
    queryFn: () => apiClient.getTreasury(),
    refetchInterval: 30000,
  });

  // Fetch transactions
  const { data: transactionsData, isLoading: txLoading } = useQuery({
    queryKey: queryKeys.transactions.all,
    queryFn: () => apiClient.getTransactions({ limit: 50 }),
    refetchInterval: 30000,
  });

  const treasury = treasuryData?.data;
  const transactions = transactionsData?.data?.data || [];
  const isLoading = treasuryLoading || txLoading;

  // Calculate stats
  const pendingTx = transactions.filter((t) => t.status === 'PENDING' || t.status === 'SUBMITTED');
  const confirmedTx = transactions.filter((t) => t.status === 'CONFIRMED');
  const totalPending = pendingTx.reduce((sum, t) => sum + t.amount_usdc, 0);

  const handleExport = () => {
    exportTransactionsToCSV(transactions, `transactions-${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <DashboardLayout
      title={t('title')}
      subtitle={t('subtitle')}
      onRefresh={() => refetch()}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={t('balance')}
              value={`${treasury?.balance_usdc?.toLocaleString() || 0} USDC`}
              subtitle={`${t('on')} ${treasury?.network || 'Base Sepolia'}`}
              icon={Wallet}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
            />
            <StatsCard
              title={t('totalDisbursed')}
              value={`${treasury?.total_disbursed?.toLocaleString() || 0} USDC`}
              subtitle={`${treasury?.total_transactions || 0} ${t('transactions')}`}
              icon={ArrowUpRight}
              iconColor="text-green-600"
              iconBg="bg-green-100"
            />
            <StatsCard
              title={t('pendingProcessing')}
              value={`${totalPending.toLocaleString()} USDC`}
              subtitle={`${pendingTx.length} ${t('transactions')}`}
              icon={Clock}
              iconColor="text-yellow-600"
              iconBg="bg-yellow-100"
            />
            <StatsCard
              title={t('successful')}
              value={`${confirmedTx.length}`}
              subtitle={t('transaction')}
              icon={CheckCircle}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
            />
          </div>

          {/* Treasury Wallet Info */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{t('treasuryWallet')}</h3>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {treasury?.wallet_address || t('notConfigured')}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://sepolia.basescan.org/address/${treasury?.wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('viewOnExplorer')}
                </a>
                <button
                  onClick={() => setShowDepositDialog(true)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                >
                  {t('deposit')}
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold text-foreground">{t('transactionHistory')}</h3>
              <button
                onClick={handleExport}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                {tCommon('export')} Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t('txCode')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t('request')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t('recipient')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t('amount')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t('status')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t('time')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t('txHash')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => {
                    const config = statusConfig[tx.status];
                    const StatusIcon = config.icon;
                    return (
                      <tr key={tx.tx_id} className="data-table-row">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm">
                            #{tx.tx_id.slice(-8)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/tickets/${tx.ticket_id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            #{tx.ticket_id.slice(-6)}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-muted-foreground">
                            {truncateAddress(tx.rescuer_wallet)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-green-600">
                            +{tx.amount_usdc} USDC
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatRelativeTime(tx.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {tx.tx_hash ? (
                            <a
                              href={`https://sepolia.basescan.org/tx/${tx.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                            >
                              {truncateAddress(tx.tx_hash, 6, 4)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        {t('noTransactions')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal with QR Code and Copy */}
      <DepositModal
        isOpen={showDepositDialog}
        onClose={() => setShowDepositDialog(false)}
        walletAddress={treasury?.wallet_address}
        network={treasury?.network || 'Base Sepolia'}
      />
    </DashboardLayout>
  );
}
