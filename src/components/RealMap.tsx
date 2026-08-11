import { useEffect, useMemo, useRef } from 'react';
import L, { type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  type?: 'hospital' | 'pharmacy' | 'laboratory' | 'polyclinic';
  onClick?: () => void;
}

interface RealMapProps {
  center?: [number, number];
  zoom?: number;
  points?: MapPoint[];
  userLocation?: { lat: number; lng: number } | null;
  height?: string;
  className?: string;
}

const colorByType = (type?: string) => {
  switch (type) {
    case 'hospital': return '#10b981';
    case 'pharmacy': return '#3b82f6';
    case 'laboratory': return '#e11d48';
    case 'polyclinic': return '#f59e0b';
    default: return '#64748b';
  }
};

const markerIcon = (color: string) => new L.DivIcon({
  className: '',
  html: `<span style="display:block;width:18px;height:18px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function RealMap({
  center = [-6.7924, 39.2083],
  zoom = 12,
  points = [],
  userLocation,
  height = '320px',
  className = '',
}: RealMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const validPoints = useMemo(
    () => points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    [points],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialCenter: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : center;
    const map = L.map(container).setView(initialCenter, zoom);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], { icon: markerIcon('#0ea5e9') })
        .addTo(map)
        .bindPopup('Uko hapa');
    }

    validPoints.forEach((point) => {
      const marker = L.marker([point.lat, point.lng], { icon: markerIcon(colorByType(point.type)) })
        .addTo(map)
        .bindPopup(`<strong>${point.title}</strong>${point.subtitle ? `<br>${point.subtitle}` : ''}`);
      if (point.onClick) marker.on('click', point.onClick);
    });

    const coordinates = validPoints.map((point) => L.latLng(point.lat, point.lng));
    if (userLocation) coordinates.push(L.latLng(userLocation.lat, userLocation.lng));
    if (coordinates.length > 1) map.fitBounds(L.latLngBounds(coordinates), { padding: [30, 30], maxZoom: 14 });
    else if (coordinates.length === 1) map.setView(coordinates[0], 14);

    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, validPoints, userLocation, zoom]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl overflow-hidden border border-border ${className}`}
      style={{ height }}
      aria-label="Ramani ya vituo vya afya"
    />
  );
}