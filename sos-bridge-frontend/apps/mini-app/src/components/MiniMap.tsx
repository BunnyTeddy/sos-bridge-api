'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

interface MiniMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  showMarker?: boolean;
  markerLabel?: string;
  className?: string;
}

// Dynamically import Leaflet components to avoid SSR issues
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

function MiniMapInner({
  lat,
  lng,
  zoom = 15,
  showMarker = true,
  markerLabel,
  className = '',
}: MiniMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Fix Leaflet icon issue
    const L = require('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className={`map-container ${className}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        ref={(map) => {
          if (map) mapRef.current = map;
        }}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showMarker && (
          <Marker position={[lat, lng]}>
            {markerLabel && (
              <Popup>
                <span className="font-medium">{markerLabel}</span>
              </Popup>
            )}
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export function MiniMap(props: MiniMapProps) {
  return (
    <div className={props.className || 'h-[200px] w-full rounded-xl overflow-hidden'}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
      />
      <MiniMapInner {...props} />
    </div>
  );
}

// Loading placeholder
export function MiniMapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-xl bg-gray-100 ${className || 'h-[200px]'}`}>
      <div className="text-sm text-gray-400">Đang tải bản đồ...</div>
    </div>
  );
}

