'use client';

import * as React from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './modal';
import { Button, StatusBadge } from '@sos-bridge/ui';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { RescueTicket, TicketStatus } from '@sos-bridge/types';
import { STATUS_LABELS } from '@sos-bridge/types';

export interface UpdateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RescueTicket;
  onSuccess?: () => void;
}

// Status flow - each status can transition to certain other statuses
const statusFlow: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN', 'CANCELLED'],
  IN_PROGRESS: ['VERIFIED', 'ASSIGNED', 'CANCELLED'],
  VERIFIED: ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED: [], // Terminal state
  CANCELLED: ['OPEN'], // Can reopen
};

export function UpdateStatusModal({
  isOpen,
  onClose,
  ticket,
  onSuccess,
}: UpdateStatusModalProps) {
  const t = useTranslations('modal.updateStatus');
  const tc = useTranslations('common');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | null>(null);
  const queryClient = useQueryClient();

  const getStatusDescription = (status: TicketStatus): string => {
    return t(`statusDescriptions.${status}`);
  };

  // Available statuses for current ticket
  const availableStatuses = statusFlow[ticket.status] || [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (newStatus: TicketStatus) =>
      apiClient.updateTicket(ticket.ticket_id, {
        status: newStatus,
        ...(newStatus === 'COMPLETED' ? { completed_at: Date.now() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticket.ticket_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      onSuccess?.();
      handleClose();
    },
  });

  const handleClose = () => {
    setSelectedStatus(null);
    onClose();
  };

  const handleUpdate = () => {
    if (selectedStatus) {
      updateMutation.mutate(selectedStatus);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('title')}
      subtitle={t('subtitle', { id: ticket.ticket_id.slice(-6) })}
      size="md"
    >
      <ModalBody>
        {/* Current status */}
        <div className="mb-4 rounded-lg bg-muted p-3">
          <p className="mb-1 text-xs text-muted-foreground">{t('currentStatus')}</p>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <span className="text-sm text-muted-foreground">
              {getStatusDescription(ticket.status)}
            </span>
          </div>
        </div>

        {/* Available statuses */}
        {availableStatuses.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-500" />
            <p>{t('finalState')}</p>
            <p className="text-sm">{t('cannotChange')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-sm font-medium">{t('selectNewStatus')}</p>
            {availableStatuses.map((status) => (
              <StatusOption
                key={status}
                status={status}
                currentStatus={ticket.status}
                isSelected={selectedStatus === status}
                onSelect={() => setSelectedStatus(status)}
                description={getStatusDescription(status)}
              />
            ))}
          </div>
        )}

        {/* Warning for cancel */}
        {selectedStatus === 'CANCELLED' && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {t('cancelWarning')}
          </div>
        )}

        {/* Error message */}
        {updateMutation.isError && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {t('updateError')}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          {tc('cancel')}
        </Button>
        <Button
          onClick={handleUpdate}
          disabled={!selectedStatus || availableStatuses.length === 0}
          isLoading={updateMutation.isPending}
          variant={selectedStatus === 'CANCELLED' ? 'destructive' : 'default'}
        >
          {t('updateButton')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface StatusOptionProps {
  status: TicketStatus;
  currentStatus: TicketStatus;
  isSelected: boolean;
  onSelect: () => void;
  description: string;
}

function StatusOption({ status, currentStatus, isSelected, onSelect, description }: StatusOptionProps) {
  const isCancel = status === 'CANCELLED';

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        isSelected
          ? isCancel
            ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
            : 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Status flow indicator */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <StatusBadge status={currentStatus} />
          <ArrowRight className="h-4 w-4" />
          <StatusBadge status={status} />
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <CheckCircle className={`ml-auto h-5 w-5 ${isCancel ? 'text-red-500' : 'text-primary'}`} />
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}


