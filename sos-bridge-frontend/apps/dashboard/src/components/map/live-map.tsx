'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, User, Filter } from 'lucide-react';
import type { RescueTicket, Rescuer, TicketStatus } from '@sos-bridge/types';
import { STATUS_COLORS, PRIORITY_COLORS, STATUS_LABELS } from '@sos-bridge/types';

// Dynamic import for Leaflet components
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
// Note: CircleMarker not used anymore, using custom Marker with DivIcon instead

interface LiveMapProps {
  tickets: RescueTicket[];
  rescuers: Rescuer[];
  center?: [number, number];
  zoom?: number;
  onTicketClick?: (ticket: RescueTicket) => void;
  onRescuerClick?: (rescuer: Rescuer) => void;
}

export function LiveMap({
  tickets,
  rescuers,
  center = [16.0544, 108.2022], // Da Nang center
  zoom = 12,
  onTicketClick,
  onRescuerClick,
}: LiveMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showTickets, setShowTickets] = useState(true);
  const [showRescuers, setShowRescuers] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');

  // Store Leaflet reference for custom icons
  const leafletRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
    // Fix Leaflet icon issue and store reference
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      leafletRef.current = L;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    }
  }, []);

  // Create custom div icon for glowing markers
  const createGlowingIcon = (
    type: 'victim' | 'rescuer-online' | 'rescuer-mission',
    priority?: number
  ) => {
    if (!leafletRef.current) return undefined;
    
    const L = leafletRef.current;
    const isHighPriority = type === 'victim' && priority && priority >= 4;
    const size = isHighPriority ? 20 : 16;
    
    const getMarkerClass = () => {
      if (type === 'victim') {
        return isHighPriority ? 'map-marker-victim-high' : 'map-marker-victim';
      }
      if (type === 'rescuer-online') return 'map-marker-rescuer-online';
      return 'map-marker-rescuer-mission';
    };

    const getMarkerColor = () => {
      if (type === 'victim') return isHighPriority ? '#dc2626' : '#ef4444';
      if (type === 'rescuer-online') return '#22c55e';
      return '#3b82f6';
    };

    return L.divIcon({
      className: 'custom-glowing-marker',
      html: `<div class="${getMarkerClass()}" style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${getMarkerColor()};
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const onlineRescuers = rescuers.filter(
    (r) => r.status === 'ONLINE' || r.status === 'ON_MISSION'
  );

  if (!isMounted) {
    return (
      <div className="flex h-full items-center justify-center bg-muted">
        <p className="text-muted-foreground">Đang tải bản đồ...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Filter Controls */}
      <div className="absolute left-4 top-4 z-[1000] flex gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 shadow-md">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'ALL')}
            className="border-none bg-transparent text-sm focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="OPEN">Đang mở</option>
            <option value="ASSIGNED">Đã gán</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="VERIFIED">Đã xác thực</option>
            <option value="COMPLETED">Hoàn thành</option>
          </select>
        </div>
      </div>

      {/* Legend with glowing dots */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-card p-3 shadow-md">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Chú thích</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div 
              className="legend-dot-victim h-3 w-3 rounded-full bg-red-500" 
              style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }}
            />
            <span className="text-xs">Cần cứu hộ</span>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="legend-dot-rescuer-online h-3 w-3 rounded-full bg-green-500"
              style={{ boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)' }}
            />
            <span className="text-xs">Đội cứu hộ online</span>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="legend-dot-rescuer-mission h-3 w-3 rounded-full bg-blue-500"
              style={{ boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)' }}
            />
            <span className="text-xs">Đang làm nhiệm vụ</span>
          </div>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute right-4 top-4 z-[1000] rounded-lg bg-card p-3 shadow-md">
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{filteredTickets.length}</p>
            <p className="text-xs text-muted-foreground">Yêu cầu</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{onlineRescuers.length}</p>
            <p className="text-xs text-muted-foreground">Đội cứu hộ</p>
          </div>
        </div>
      </div>

      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
      />
      
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ticket Markers with Glowing Effect */}
        {showTickets &&
          filteredTickets.map((ticket) => {
            const icon = createGlowingIcon('victim', ticket.priority);
            if (!icon) return null;
            
            return (
              <Marker
                key={ticket.ticket_id}
                position={[ticket.location.lat, ticket.location.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onTicketClick?.(ticket),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle
                        className="h-4 w-4"
                        style={{ color: PRIORITY_COLORS[ticket.priority] }}
                      />
                      <span className="font-semibold">#{ticket.ticket_id.slice(-6)}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs text-white"
                        style={{ backgroundColor: STATUS_COLORS[ticket.status] }}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {ticket.location.address_text}
                    </p>
                    <p className="mt-1 text-sm">
                      <strong>{ticket.victim_info.people_count}</strong> người cần cứu
                    </p>
                    {ticket.victim_info.note && (
                      <p className="mt-1 text-xs text-gray-500">
                        {ticket.victim_info.note}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Rescuer Markers with Glowing Effect */}
        {showRescuers &&
          onlineRescuers.map((rescuer) => {
            const type = rescuer.status === 'ON_MISSION' ? 'rescuer-mission' : 'rescuer-online';
            const icon = createGlowingIcon(type);
            if (!icon) return null;
            
            return (
              <Marker
                key={rescuer.rescuer_id}
                position={[rescuer.location.lat, rescuer.location.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onRescuerClick?.(rescuer),
                }}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <div className="mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold">{rescuer.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{rescuer.phone}</p>
                    <p className="mt-1 text-sm">
                      ⭐ {rescuer.rating.toFixed(1)} • {rescuer.completed_missions} nhiệm vụ
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                        rescuer.status === 'ON_MISSION'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {rescuer.status === 'ON_MISSION' ? 'Đang làm NV' : 'Online'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}






