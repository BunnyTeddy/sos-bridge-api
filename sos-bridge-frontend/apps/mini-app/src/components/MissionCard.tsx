'use client';

import { motion } from 'framer-motion';
import { MapPin, Users, Clock, Navigation, Phone, AlertTriangle } from 'lucide-react';
import type { RescueTicket } from '@sos-bridge/types';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@sos-bridge/types';
import { formatRelativeTime, formatDistance, formatPhone } from '@sos-bridge/ui';
import { PriorityBadge, StatusBadge } from '@sos-bridge/ui';

interface MissionCardProps {
  ticket: RescueTicket;
  distance?: number; // in km
  onAccept?: () => void;
  onDecline?: () => void;
  onNavigate?: () => void;
  onCall?: () => void;
  isAccepting?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

export function MissionCard({
  ticket,
  distance,
  onAccept,
  onDecline,
  onNavigate,
  onCall,
  isAccepting = false,
  showActions = true,
  compact = false,
}: MissionCardProps) {
  const priorityColor = PRIORITY_COLORS[ticket.priority];
  const isUrgent = ticket.priority >= 4;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-xl bg-white p-3 shadow-sm ${
          isUrgent ? 'ring-2 ring-red-300' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: `${priorityColor}20` }}
            >
              <AlertTriangle
                className="h-5 w-5"
                style={{ color: priorityColor }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">
                  {ticket.victim_info.people_count} người
                </span>
                <PriorityBadge priority={ticket.priority} />
              </div>
              <p className="text-sm text-gray-500 line-clamp-1">
                {ticket.location.address_text}
              </p>
            </div>
          </div>
          {distance !== undefined && (
            <div className="text-right">
              <p className="font-bold text-blue-600">{formatDistance(distance)}</p>
              <p className="text-xs text-gray-400">Cách bạn</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-white shadow-md ${
        isUrgent ? 'ring-2 ring-red-400' : ''
      }`}
    >
      {/* Urgent Banner */}
      {isUrgent && (
        <div className="rounded-t-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-center">
          <span className="text-sm font-bold text-white">
            ⚡ {PRIORITY_LABELS[ticket.priority].toUpperCase()} - Cần hỗ trợ ngay!
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {formatRelativeTime(ticket.created_at)}
            </p>
          </div>
          {distance !== undefined && (
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {formatDistance(distance)}
              </p>
              <p className="text-xs text-gray-400">Cách bạn</p>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="mb-3 flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-gray-700">{ticket.location.address_text}</p>
        </div>

        {/* Info Row */}
        <div className="mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{ticket.victim_info.people_count} người</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{formatPhone(ticket.victim_info.phone)}</span>
          </div>
        </div>

        {/* Special Needs Indicators */}
        {(ticket.victim_info.has_elderly ||
          ticket.victim_info.has_children ||
          ticket.victim_info.has_disabled) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {ticket.victim_info.has_elderly && (
              <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                👴 Có người già
              </span>
            )}
            {ticket.victim_info.has_children && (
              <span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-medium text-pink-700">
                👶 Có trẻ em
              </span>
            )}
            {ticket.victim_info.has_disabled && (
              <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                ♿ Có người khuyết tật
              </span>
            )}
          </div>
        )}

        {/* Note */}
        {ticket.victim_info.note && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-gray-600">{ticket.victim_info.note}</p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {onDecline && (
              <button
                onClick={onDecline}
                className="flex-1 rounded-lg border border-gray-300 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50"
                disabled={isAccepting}
              >
                Từ chối
              </button>
            )}
            {onAccept && (
              <button
                onClick={onAccept}
                disabled={isAccepting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 py-3 font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
              >
                {isAccepting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang xử lý...
                  </>
                ) : (
                  <>Nhận nhiệm vụ</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Navigation Actions */}
        {(onNavigate || onCall) && (
          <div className="mt-3 flex gap-2">
            {onNavigate && (
              <button
                onClick={onNavigate}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 font-medium text-white"
              >
                <Navigation className="h-4 w-4" />
                Chỉ đường
              </button>
            )}
            {onCall && (
              <button
                onClick={onCall}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 font-medium text-white"
              >
                <Phone className="h-4 w-4" />
                Gọi điện
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}






