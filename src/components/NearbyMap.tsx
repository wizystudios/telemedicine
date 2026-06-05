import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin, Hospital, Pill, TestTube, Navigation, Phone,
  Star, CheckCircle2, AlertCircle, Locate,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RealMap, MapPoint } from '@/components/RealMap';
import { haversineKm } from '@/lib/distance';

interface Location { lat: number; lng: number; }

interface NearbyItem {
  id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  is_verified?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number;
  type: 'hospital' | 'pharmacy' | 'laboratory';
}

export function NearbyMap() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<NearbyItem[]>([]);
  const [pharmacies, setPharmacies] = useState<NearbyItem[]>([]);
  const [laboratories, setLaboratories] = useState<NearbyItem[]>([]);
  const [selectedTab, setSelectedTab] = useState('hospitals');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchNearbyPlaces(); }, []);

  const fetchNearbyPlaces = async () => {
    setIsLoading(true);
    try {
      const db = supabase as any;
      const cols = 'id, name, address, phone, rating, is_verified, latitude, longitude';
      const [hospitalsRes, pharmaciesRes, labsRes] = await Promise.all([
        db.from('hospitals').select(cols).eq('is_verified', true).limit(50),
        db.from('pharmacies').select(cols).eq('is_verified', true).limit(50),
        db.from('laboratories').select(cols).eq('is_verified', true).limit(50),
      ]);

      setHospitals(((hospitalsRes.data as any[]) || []).map((h: any) => ({ ...h, type: 'hospital' as const })));
      setPharmacies(((pharmaciesRes.data as any[]) || []).map((p: any) => ({ ...p, type: 'pharmacy' as const })));
      setLaboratories(((labsRes.data as any[]) || []).map((l: any) => ({ ...l, type: 'laboratory' as const })));
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserLocation = () => {
    setIsLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation haipo katika browser yako');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setLocationError('Imeshindwa kupata mahali pako. Ruhusu GPS kwa kifaa.');
        setIsLocating(false);
      }
    );
  };

  // Add real distance + sort
  const withDistance = (items: NearbyItem[]): NearbyItem[] => {
    if (!userLocation) return items;
    return items
      .map(i => {
        if (i.latitude != null && i.longitude != null) {
          return { ...i, distance: haversineKm(userLocation.lat, userLocation.lng, i.latitude, i.longitude) };
        }
        return i;
      })
      .sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
  };

  const hospitalsD = useMemo(() => withDistance(hospitals), [hospitals, userLocation]);
  const pharmaciesD = useMemo(() => withDistance(pharmacies), [pharmacies, userLocation]);
  const laboratoriesD = useMemo(() => withDistance(laboratories), [laboratories, userLocation]);

  const activeList = selectedTab === 'hospitals' ? hospitalsD : selectedTab === 'pharmacies' ? pharmaciesD : laboratoriesD;

  const mapPoints: MapPoint[] = useMemo(
    () => activeList
      .filter(i => i.latitude != null && i.longitude != null)
      .map(i => ({
        id: i.id,
        lat: i.latitude as number,
        lng: i.longitude as number,
        title: i.name,
        subtitle: i.address,
        type: i.type,
        onClick: () => handleItemClick(i),
      })),
    [activeList]
  );

  const handleItemClick = (item: NearbyItem) => {
    const route =
      item.type === 'hospital' ? `/hospital-profile/${item.id}` :
      item.type === 'pharmacy' ? `/pharmacy-profile/${item.id}` :
      `/laboratory-profile/${item.id}`;
    navigate(route);
  };

  const renderPlaceCard = (item: NearbyItem) => (
    <Card key={item.id} className="cursor-pointer hover:bg-accent/50 transition-all" onClick={() => handleItemClick(item)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
            item.type === 'hospital' ? 'bg-emerald-100 dark:bg-emerald-950' :
            item.type === 'pharmacy' ? 'bg-blue-100 dark:bg-blue-950' :
            'bg-purple-100 dark:bg-purple-950'
          }`}>
            {item.type === 'hospital' && <Hospital className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
            {item.type === 'pharmacy' && <Pill className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            {item.type === 'laboratory' && <TestTube className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate flex items-center gap-1">
                  {item.name}
                  {item.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                </h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.address}</span>
                </p>
              </div>
              {item.distance != null ? (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  <Navigation className="h-3 w-3 mr-1" />
                  {item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}
                </Badge>
              ) : userLocation && (
                <Badge variant="outline" className="shrink-0 text-[10px]">Mahali hakijawekwa</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              {item.phone && (
                <a href={`tel:${item.phone}`} onClick={(e) => e.stopPropagation()}
                   className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <Phone className="h-3 w-3" /> Piga
                </a>
              )}
              {item.rating && item.rating > 0 && (
                <span className="text-xs flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {item.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderList = (items: NearbyItem[], icon: any, emptyText: string) => {
    if (isLoading) {
      return [1, 2, 3].map(i => (
        <Card key={i} className="animate-pulse"><CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 bg-muted rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardContent></Card>
      ));
    }
    if (items.length === 0) {
      const Icon = icon;
      return <div className="text-center py-8 text-muted-foreground"><Icon className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>{emptyText}</p></div>;
    }
    return items.map(renderPlaceCard);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Ramani Halisi
            </CardTitle>
            <Button variant="outline" size="sm" onClick={getUserLocation} disabled={isLocating}>
              {isLocating
                ? <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                : <Locate className="h-4 w-4 mr-2" />}
              {isLocating ? 'Inatafuta...' : 'Mahali Pangu'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {locationError && (
            <div className="flex items-center gap-2 text-destructive text-sm mb-3 p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" /> {locationError}
            </div>
          )}
          <RealMap points={mapPoints} userLocation={userLocation} height="320px" />
          {userLocation && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              Umbali halisi unahesabiwa kutoka mahali pako
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="hospitals" className="text-xs sm:text-sm">
            <Hospital className="h-4 w-4 mr-1" /> Hospitali
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{hospitalsD.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pharmacies" className="text-xs sm:text-sm">
            <Pill className="h-4 w-4 mr-1" /> Dawa
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{pharmaciesD.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="labs" className="text-xs sm:text-sm">
            <TestTube className="h-4 w-4 mr-1" /> Maabara
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{laboratoriesD.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hospitals" className="space-y-3 mt-4">
          {renderList(hospitalsD, Hospital, 'Hakuna hospitali zinazopatikana sasa')}
        </TabsContent>
        <TabsContent value="pharmacies" className="space-y-3 mt-4">
          {renderList(pharmaciesD, Pill, 'Hakuna maduka ya dawa sasa')}
        </TabsContent>
        <TabsContent value="labs" className="space-y-3 mt-4">
          {renderList(laboratoriesD, TestTube, 'Hakuna maabara sasa')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
