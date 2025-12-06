'use client';

import * as React from 'react';
import { cn } from '../utils';
import { Badge } from './Badge';
import type { TicketStatus, RescuerStatus } from '@sos-bridge/types';
import { STATUS_LABELS } from '@sos-bridge/types';

export interface StatusBadgeProps {
  status: TicketStatus | RescuerStatus;
  className?: string;
}

const ticketStatusStyles: Record<TicketStatus, string> = {
  OPEN: 'bg-red-100 text-red-800',
  ASSIGNED: 'bg-orange-100 text-orange-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  VERIFIED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const rescuerStatusStyles: Record<RescuerStatus, string> = {
  ONLINE: 'bg-green-100 text-green-800',
  OFFLINE: 'bg-gray-100 text-gray-800',
  IDLE: 'bg-yellow-100 text-yellow-800',
  BUSY: 'bg-orange-100 text-orange-800',
  ON_MISSION: 'bg-blue-100 text-blue-800',
};

const rescuerStatusLabels: Record<RescuerStatus, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  IDLE: 'Rảnh',
  BUSY: 'Bận',
  ON_MISSION: 'Đang làm NV',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isTicketStatus = status in ticketStatusStyles;
  const styles = isTicketStatus
    ? ticketStatusStyles[status as TicketStatus]
    : rescuerStatusStyles[status as RescuerStatus];
  const label = isTicketStatus
    ? STATUS_LABELS[status as TicketStatus]
    : rescuerStatusLabels[status as RescuerStatus];

  return (
    <Badge className={cn(styles, className)}>
      {label}
    </Badge>
  );
}






