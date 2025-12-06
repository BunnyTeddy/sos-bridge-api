'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { RescueTicket, TicketStatus } from '@sos-bridge/types';
import { STATUS_LABELS, PRIORITY_LABELS } from '@sos-bridge/types';
import { StatusBadge, PriorityBadge, formatRelativeTime, formatPhone } from '@sos-bridge/ui';

interface TicketTableProps {
  tickets: RescueTicket[];
  onAssign?: (ticket: RescueTicket) => void;
  onCancel?: (ticket: RescueTicket) => void;
  onBulkAssign?: (ticketIds: string[]) => void;
  onBulkCancel?: (ticketIds: string[]) => void;
}

type SortField = 'created_at' | 'priority' | 'status' | 'people_count';
type SortDirection = 'asc' | 'desc';

export function TicketTable({
  tickets,
  onAssign,
  onCancel,
  onBulkAssign,
  onBulkCancel,
}: TicketTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTickets = [...tickets].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'created_at':
        comparison = a.created_at - b.created_at;
        break;
      case 'priority':
        comparison = a.priority - b.priority;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'people_count':
        comparison = a.victim_info.people_count - b.victim_info.people_count;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleSelectAll = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map((t) => t.ticket_id)));
    }
  };

  const toggleSelect = (ticketId: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleBulkAssign = () => {
    if (onBulkAssign && selectedTickets.size > 0) {
      // Filter only OPEN tickets for assignment
      const openTickets = Array.from(selectedTickets).filter((id) => {
        const ticket = tickets.find((t) => t.ticket_id === id);
        return ticket?.status === 'OPEN';
      });
      if (openTickets.length > 0) {
        onBulkAssign(openTickets);
        setSelectedTickets(new Set());
      }
    }
  };

  const handleBulkCancel = () => {
    if (onBulkCancel && selectedTickets.size > 0) {
      // Filter tickets that can be cancelled
      const cancellableTickets = Array.from(selectedTickets).filter((id) => {
        const ticket = tickets.find((t) => t.ticket_id === id);
        return ticket && ticket.status !== 'COMPLETED' && ticket.status !== 'CANCELLED';
      });
      if (cancellableTickets.length > 0) {
        onBulkCancel(cancellableTickets);
        setSelectedTickets(new Set());
      }
    }
  };

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <th
      className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field &&
          (sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          ))}
      </div>
    </th>
  );

  return (
    <div className="rounded-xl border bg-card">
      {/* Bulk Actions */}
      {selectedTickets.size > 0 && (
        <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            Đã chọn {selectedTickets.size} yêu cầu
          </span>
          <button
            onClick={handleBulkAssign}
            className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            Gán đội cứu hộ
          </button>
          <button
            onClick={handleBulkCancel}
            className="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
          >
            Hủy yêu cầu
          </button>
          <button
            onClick={() => setSelectedTickets(new Set())}
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedTickets.size === tickets.length && tickets.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Mã
              </th>
              <SortHeader field="status">Trạng thái</SortHeader>
              <SortHeader field="priority">Mức ưu tiên</SortHeader>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Vị trí
              </th>
              <SortHeader field="people_count">Số người</SortHeader>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Liên hệ
              </th>
              <SortHeader field="created_at">Thời gian</SortHeader>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedTickets.map((ticket) => (
              <tr
                key={ticket.ticket_id}
                className="data-table-row transition-colors"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTickets.has(ticket.ticket_id)}
                    onChange={() => toggleSelect(ticket.ticket_id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/tickets/${ticket.ticket_id}`}
                    className="font-mono text-sm font-medium text-primary hover:underline"
                  >
                    #{ticket.ticket_id.slice(-6)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="max-w-[200px] px-4 py-3">
                  <p className="truncate text-sm text-foreground">
                    {ticket.location.address_text}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium">
                    {ticket.victim_info.people_count}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`tel:${ticket.victim_info.phone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {formatPhone(ticket.victim_info.phone)}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(ticket.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <TicketActions
                    ticket={ticket}
                    onAssign={onAssign}
                    onCancel={onCancel}
                  />
                </td>
              </tr>
            ))}

            {tickets.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  Không có yêu cầu nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketActions({
  ticket,
  onAssign,
  onCancel,
}: {
  ticket: RescueTicket;
  onAssign?: (ticket: RescueTicket) => void;
  onCancel?: (ticket: RescueTicket) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const canAssign = ticket.status === 'OPEN';
  const canCancel = ticket.status !== 'COMPLETED' && ticket.status !== 'CANCELLED';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-1 hover:bg-muted"
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border bg-card py-1 shadow-lg">
            <Link
              href={`/tickets/${ticket.ticket_id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            >
              <Eye className="h-4 w-4" />
              Xem chi tiết
            </Link>
            {canAssign && onAssign && (
              <button
                onClick={() => {
                  onAssign(ticket);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <UserPlus className="h-4 w-4" />
                Gán đội cứu hộ
              </button>
            )}
            {canCancel && onCancel && (
              <button
                onClick={() => {
                  onCancel(ticket);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted"
              >
                <Trash2 className="h-4 w-4" />
                Hủy yêu cầu
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
