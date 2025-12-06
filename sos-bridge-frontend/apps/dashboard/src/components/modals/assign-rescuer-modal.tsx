'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Phone,
  Star,
  MapPin,
  Navigation,
  Search,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './modal';
import { Button, Spinner, StatusBadge, formatPhone } from '@sos-bridge/ui';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { Rescuer, RescueTicket } from '@sos-bridge/types';
import { VEHICLE_TYPE_NAMES, VEHICLE_TYPE_EMOJIS } from '@sos-bridge/types';

export interface AssignRescuerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RescueTicket;
  onSuccess?: () => void;
}

export function AssignRescuerModal({
  isOpen,
  onClose,
  ticket,
  onSuccess,
}: AssignRescuerModalProps) {
  const [selectedRescuerId, setSelectedRescuerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch all rescuers
  const { data: rescuersData, isLoading } = useQuery({
    queryKey: queryKeys.rescuers.all,
    queryFn: () => apiClient.getRescuers({ limit: 100 }),
    enabled: isOpen,
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: (rescuerId: string) => apiClient.assignRescuer(ticket.ticket_id, rescuerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticket.ticket_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rescuers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      onSuccess?.();
      onClose();
    },
  });

  const rescuers = rescuersData?.data?.data || [];

  // Filter rescuers: only ONLINE or IDLE status
  const availableRescuers = rescuers.filter(
    (r) => r.status === 'ONLINE' || r.status === 'IDLE'
  );

  // Filter by search query
  const filteredRescuers = availableRescuers.filter((rescuer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rescuer.name.toLowerCase().includes(query) ||
      rescuer.phone.includes(query) ||
      VEHICLE_TYPE_NAMES[rescuer.vehicle_type].toLowerCase().includes(query)
    );
  });

  // Calculate distance from ticket location
  const rescuersWithDistance = filteredRescuers.map((rescuer) => {
    const distance = calculateDistance(
      ticket.location.lat,
      ticket.location.lng,
      rescuer.location.lat,
      rescuer.location.lng
    );
    return { ...rescuer, distance };
  }).sort((a, b) => a.distance - b.distance);

  const handleAssign = () => {
    if (selectedRescuerId) {
      assignMutation.mutate(selectedRescuerId);
    }
  };

  const handleClose = () => {
    setSelectedRescuerId(null);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Gán đội cứu hộ"
      subtitle={`Yêu cầu #${ticket.ticket_id.slice(-6)} - ${ticket.location.address_text}`}
      size="lg"
    >
      <ModalBody>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, loại xe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Rescuer list */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : rescuersWithDistance.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <User className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>Không có đội cứu hộ nào khả dụng</p>
            <p className="text-sm">Vui lòng thử lại sau</p>
          </div>
        ) : (
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {rescuersWithDistance.map((rescuer) => (
              <RescuerItem
                key={rescuer.rescuer_id}
                rescuer={rescuer}
                distance={rescuer.distance}
                isSelected={selectedRescuerId === rescuer.rescuer_id}
                onSelect={() => setSelectedRescuerId(rescuer.rescuer_id)}
              />
            ))}
          </div>
        )}

        {/* Info text */}
        {availableRescuers.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Hiển thị {rescuersWithDistance.length}/{availableRescuers.length} đội cứu hộ khả dụng, sắp xếp theo khoảng cách
          </p>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Hủy
        </Button>
        <Button
          onClick={handleAssign}
          disabled={!selectedRescuerId}
          isLoading={assignMutation.isPending}
        >
          Gán đội cứu hộ
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface RescuerItemProps {
  rescuer: Rescuer;
  distance: number;
  isSelected: boolean;
  onSelect: () => void;
}

function RescuerItem({ rescuer, distance, isSelected, onSelect }: RescuerItemProps) {
  const isOnline = rescuer.status === 'ONLINE' || rescuer.status === 'IDLE';

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{rescuer.name}</span>
            <StatusBadge status={rescuer.status} />
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {VEHICLE_TYPE_EMOJIS[rescuer.vehicle_type]} {VEHICLE_TYPE_NAMES[rescuer.vehicle_type]}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              {rescuer.rating.toFixed(1)}
            </span>
            <span>{rescuer.completed_missions} nhiệm vụ</span>
          </div>
        </div>

        {/* Distance */}
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm font-medium text-foreground">
            <Navigation className="h-4 w-4 text-blue-500" />
            {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatPhone(rescuer.phone)}
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
        )}
      </div>
    </div>
  );
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

