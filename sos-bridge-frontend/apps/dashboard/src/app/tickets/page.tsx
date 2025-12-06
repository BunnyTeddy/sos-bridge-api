'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { TicketTable } from '@/components/tickets/ticket-table';
import { CreateTicketModal } from '@/components/modals/create-ticket-modal';
import { AssignRescuerModal } from '@/components/modals/assign-rescuer-modal';
import { ConfirmDialog } from '@/components/modals/confirm-dialog';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { RescueTicket, TicketStatus } from '@sos-bridge/types';
import { Spinner } from '@sos-bridge/ui';
import { exportTicketsToCSV } from '@/lib/export';

export default function TicketsPage() {
  const t = useTranslations('tickets');
  const tStatus = useTranslations('status');
  const tCommon = useTranslations('common');

  const statusFilters: { value: TicketStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: tCommon('all') },
    { value: 'OPEN', label: tStatus('OPEN') },
    { value: 'ASSIGNED', label: tStatus('ASSIGNED') },
    { value: 'IN_PROGRESS', label: tStatus('IN_PROGRESS') },
    { value: 'VERIFIED', label: tStatus('VERIFIED') },
    { value: 'COMPLETED', label: tStatus('COMPLETED') },
    { value: 'CANCELLED', label: tStatus('CANCELLED') },
  ];

  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<RescueTicket | null>(null);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Fetch tickets
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.tickets.list({ status: statusFilter }),
    queryFn: () =>
      apiClient.getTickets({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100,
      }),
    refetchInterval: 30000,
  });

  // Cancel ticket mutation
  const cancelMutation = useMutation({
    mutationFn: (ticketId: string) =>
      apiClient.updateTicket(ticketId, { status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      setShowCancelDialog(false);
      setSelectedTicket(null);
    },
  });

  const tickets = data?.data?.data || [];

  // Filter by search query
  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_id.toLowerCase().includes(query) ||
      ticket.location.address_text.toLowerCase().includes(query) ||
      ticket.victim_info.phone.includes(query)
    );
  });

  // Stats
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const assignedCount = tickets.filter((t) => t.status === 'ASSIGNED').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;

  const handleRefresh = async () => {
    await refetch();
  };

  const handleAssign = (ticket: RescueTicket) => {
    setSelectedTicket(ticket);
    setShowAssignModal(true);
  };

  const handleCancel = (ticket: RescueTicket) => {
    setSelectedTicket(ticket);
    setShowCancelDialog(true);
  };

  const handleExport = () => {
    exportTicketsToCSV(filteredTickets, `tickets-${new Date().toISOString().split('T')[0]}`);
  };

  const handleBulkAssign = (ticketIds: string[]) => {
    // For bulk assign, we'll just open modal with first ticket
    // In a real app, you might want a different UX
    const ticket = tickets.find((t) => t.ticket_id === ticketIds[0]);
    if (ticket) {
      setSelectedTicket(ticket);
      setShowAssignModal(true);
    }
  };

  const handleBulkCancel = (ticketIds: string[]) => {
    setSelectedTicketIds(ticketIds);
    // For now, cancel first ticket (in real app, handle bulk cancel)
    const ticket = tickets.find((t) => t.ticket_id === ticketIds[0]);
    if (ticket) {
      setSelectedTicket(ticket);
      setShowCancelDialog(true);
    }
  };

  return (
    <DashboardLayout
      title={t('title')}
      subtitle={`${filteredTickets.length} ${t('requests')}`}
      onRefresh={handleRefresh}
    >
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="flex gap-4">
          <div className="rounded-lg border bg-red-50 px-4 py-2">
            <span className="text-2xl font-bold text-red-600">{openCount}</span>
            <span className="ml-2 text-sm text-red-700">{t('open')}</span>
          </div>
          <div className="rounded-lg border bg-orange-50 px-4 py-2">
            <span className="text-2xl font-bold text-orange-600">{assignedCount}</span>
            <span className="ml-2 text-sm text-orange-700">{t('assigned')}</span>
          </div>
          <div className="rounded-lg border bg-yellow-50 px-4 py-2">
            <span className="text-2xl font-bold text-yellow-600">{inProgressCount}</span>
            <span className="ml-2 text-sm text-yellow-700">{t('inProgress')}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'ALL')}
                className="border-none bg-transparent text-sm focus:outline-none"
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              {t('exportExcel')}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              {t('createRequest')}
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <TicketTable
            tickets={filteredTickets}
            onAssign={handleAssign}
            onCancel={handleCancel}
            onBulkAssign={handleBulkAssign}
            onBulkCancel={handleBulkCancel}
          />
        )}
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />

      {/* Assign Rescuer Modal */}
      {selectedTicket && (
        <AssignRescuerModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTicket(null);
          }}
          ticket={selectedTicket}
          onSuccess={() => refetch()}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => {
          setShowCancelDialog(false);
          setSelectedTicket(null);
        }}
        onConfirm={() => {
          if (selectedTicket) {
            cancelMutation.mutate(selectedTicket.ticket_id);
          }
        }}
        title={t('cancelConfirmTitle')}
        message={
          selectedTicket
            ? t('cancelConfirmMessage', { id: selectedTicket.ticket_id.slice(-6) })
            : ''
        }
        confirmText={t('cancelButton')}
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </DashboardLayout>
  );
}
