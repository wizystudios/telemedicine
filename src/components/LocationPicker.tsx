import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Locate, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onSave: (lat: number, lng: number) => Promise<void> | void;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export function LocationPicker({ initialLat, initialLng, onSave }: LocationPickerProps) {
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);
  const [saving, setSaving] = useState(false);
  const center: [number, number] = [lat ?? -6.7924, lng ?? 39.2083];

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation haipo kwenye kifaa');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => toast.error('Imeshindwa kupata mahali pako')
    );
  };

  const save = async () => {
    if (lat == null || lng == null) {
      toast.error('Chagua mahali kwenye ramani');
      return;
    }
    setSaving(true);
    try {
      await onSave(lat, lng);
      toast.success('Mahali kimehifadhiwa');
    } catch (e: any) {
      toast.error(e?.message || 'Imeshindwa kuhifadhi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        Bofya kwenye ramani kuweka mahali halisi pa shirika lako.
      </p>

      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 300 }}>
        <MapContainer center={center} zoom={lat ? 14 : 6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={(la, ln) => { setLat(la); setLng(ln); }} />
          {lat != null && lng != null && <Marker position={[lat, lng]} />}
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          step="0.000001"
          placeholder="Latitude"
          value={lat ?? ''}
          onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : null)}
        />
        <Input
          type="number"
          step="0.000001"
          placeholder="Longitude"
          value={lng ?? ''}
          onChange={(e) => setLng(e.target.value ? parseFloat(e.target.value) : null)}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={useMyLocation} className="flex-1">
          <Locate className="h-4 w-4 mr-2" />
          Tumia mahali pangu
        </Button>
        <Button onClick={save} disabled={saving || lat == null || lng == null} className="flex-1">
          {saving ? 'Inahifadhi...' : 'Hifadhi'}
        </Button>
      </div>
    </div>
  );
}
