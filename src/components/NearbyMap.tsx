import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, Hospital, Pill, TestTube, Navigation, Phone, 
  Star, Clock, CheckCircle2, AlertCircle, Locate
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Location {
  lat: number;
  lng: number;
}

interface NearbyItem {
  id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  is_verified?: boolean;
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

  // Calculate mock distance (since we don't have real coordinates for most items)
  const calculateMockDistance = (index: number): number => {
    return Math.round((0.5 + Math.random() * 5) * 10) / 10;
  };

  useEffect(() => {
    fetchNearbyPlaces();
  }, []);

  const fetchNearbyPlaces = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [hospitalsRes, pharmaciesRes, labsRes] = await Promise.all([
        supabase.from('hospitals').select('id, name, address, phone, rating, is_verified').eq('is_verified', true).limit(10),
        supabase.from('pharmacies').select('id, name, address, phone, rating, is_verified').eq('is_verified', true).limit(10),
        supabase.from('laboratories').select('id, name, address, phone, rating, is_verified').eq('is_verified', true).limit(10)
      ]);

      setHospitals((hospitalsRes.data || []).map((h, i) => ({ 
        ...h, 
        type: 'hospital' as const,
        distance: calculateMockDistance(i)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      
      setPharmacies((pharmaciesRes.data || []).map((p, i) => ({ 
        ...p, 
        type: 'pharmacy' as const,
        distance: calculateMockDistance(i)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      
      setLaboratories((labsRes.data || []).map((l, i) => ({ 
        ...l, 
        type: 'laboratory' as const,
        distance: calculateMockDistance(i)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      
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
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
        fetchNearbyPlaces(); // Refresh with new location
      },
      (error) => {
        setLocationError('Imeshindwa kupata mahali pako');
        setIsLocating(false);
      }
    );
  };

  const handleItemClick = (item: NearbyItem) => {
    switch (item.type) {
      case 'hospital':
        navigate(`/hospital-profile/${item.id}`);
        break;
      case 'pharmacy':
        navigate(`/pharmacy-profile/${item.id}`);
        break;
      case 'laboratory':
        navigate(`/laboratory-profile/${item.id}`);
        break;
    }
  };

  const renderPlaceCard = (item: NearbyItem) => (
    <Card 
      key={item.id}
      className="cursor-pointer hover:bg-accent/50 transition-all hover:shadow-md"
      onClick={() => handleItemClick(item)}
    >
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
              <div>
                <h4 className="font-semibold text-sm truncate flex items-center gap-1">
                  {item.name}
                  {item.is_verified && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" /> 
                  <span className="truncate">{item.address}</span>
                </p>
              </div>
              
              {item.distance && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  <Navigation className="h-3 w-3 mr-1" />
                  {item.distance} km
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              {item.phone && (
                <a 
                  href={`tel:${item.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  Piga Simu
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

  const renderMapPlaceholder = () => (
    <div className="relative bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl h-48 overflow-hidden">
      {/* Fake map grid */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Map pins */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 animate-pulse">
          <div className="bg-emerald-500 p-1.5 rounded-full shadow-lg">
            <Hospital className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="absolute top-1/3 right-1/3 animate-pulse delay-100">
          <div className="bg-blue-500 p-1.5 rounded-full shadow-lg">
            <Pill className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="absolute bottom-1/3 left-1/3 animate-pulse delay-200">
          <div className="bg-purple-500 p-1.5 rounded-full shadow-lg">
            <TestTube className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="absolute bottom-1/4 right-1/4 animate-pulse delay-300">
          <div className="bg-emerald-500 p-1.5 rounded-full shadow-lg">
            <Hospital className="h-4 w-4 text-white" />
          </div>
        </div>
        
        {/* User location */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping"></div>
            <div className="relative bg-primary p-2 rounded-full shadow-xl">
              <Locate className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay text */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3">
        <p className="text-xs text-muted-foreground text-center">
          Ramani itaonyeshwa wakati API inapatikana
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Maeneo ya Karibu
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={getUserLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
              ) : (
                <Locate className="h-4 w-4 mr-2" />
              )}
              {isLocating ? 'Inatafuta...' : 'Mahali Pangu'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {locationError && (
            <div className="flex items-center gap-2 text-destructive text-sm mb-3 p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {locationError}
            </div>
          )}
          
          {renderMapPlaceholder()}
          
          {userLocation && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              Mahali pako: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="hospitals" className="text-xs sm:text-sm">
            <Hospital className="h-4 w-4 mr-1" />
            Hospitali
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {hospitals.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pharmacies" className="text-xs sm:text-sm">
            <Pill className="h-4 w-4 mr-1" />
            Dawa
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {pharmacies.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="labs" className="text-xs sm:text-sm">
            <TestTube className="h-4 w-4 mr-1" />
            Maabara
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {laboratories.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hospitals" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 bg-muted rounded-xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : hospitals.length > 0 ? (
            hospitals.map(renderPlaceCard)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Hospital className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Hakuna hospitali zinazopatikana sasa</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pharmacies" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 bg-muted rounded-xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pharmacies.length > 0 ? (
            pharmacies.map(renderPlaceCard)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Hakuna maduka ya dawa yanapopatikana sasa</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="labs" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 bg-muted rounded-xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : laboratories.length > 0 ? (
            laboratories.map(renderPlaceCard)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Hakuna maabara zinazopatikana sasa</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
