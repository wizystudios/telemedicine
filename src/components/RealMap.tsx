import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons (Vite doesn't bundle them automatically)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

function FitBounds({ points, userLocation }: { points: MapPoint[]; userLocation?: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = points.map(p => [p.lat, p.lng]);
    if (userLocation) coords.push([userLocation.lat, userLocation.lng]);
    if (coords.length > 1) {
      map.fitBounds(coords as any, { padding: [30, 30], maxZoom: 14 });
    } else if (coords.length === 1) {
      map.setView(coords[0], 14);
    }
  }, [points, userLocation, map]);
  return null;
}

const colorByType = (t?: string) => {
  switch (t) {
    case 'hospital':   return '#10b981';
    case 'pharmacy':   return '#3b82f6';
    case 'laboratory': return '#8b5cf6';
    case 'polyclinic': return '#f59e0b';
    default:           return '#64748b';
  }
};

export function RealMap({
  center = [-6.7924, 39.2083], // Dar es Salaam default
  zoom = 12,
  points = [],
  userLocation,
  height = '320px',
  className = '',
}: RealMapProps) {
  const validPoints = useMemo(
    () => points.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [points]
  );

  return (
    <div className={`rounded-2xl overflow-hidden border border-border ${className}`} style={{ height }}>
      <MapContainer
        center={userLocation ? [userLocation.lat, userLocation.lng] : center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={validPoints} userLocation={userLocation} />

        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={9}
            pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.9, weight: 3 }}
          >
            <Popup>Uko hapa</Popup>
          </CircleMarker>
        )}

        {validPoints.map(p => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={10}
            pathOptions={{
              color: colorByType(p.type),
              fillColor: colorByType(p.type),
              fillOpacity: 0.85,
              weight: 2,
            }}
            eventHandlers={{ click: () => p.onClick?.() }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{p.title}</div>
                {p.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{p.subtitle}</div>}
                {p.onClick && (
                  <button
                    onClick={p.onClick}
                    className="mt-2 text-xs text-primary underline"
                  >
                    Fungua
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
