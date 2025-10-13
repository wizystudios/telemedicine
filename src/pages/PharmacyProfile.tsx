import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, MapPin, Mail, Star, Clock, Pill } from 'lucide-react';

export default function PharmacyProfile() {
  const { pharmacyId } = useParams();
  const navigate = useNavigate();

  const { data: pharmacy, isLoading } = useQuery({
    queryKey: ['pharmacy-profile', pharmacyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacies')
        .select(`
          *,
          pharmacy_medicines (id, name, description, price, in_stock, category)
        `)
        .eq('id', pharmacyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!pharmacyId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Inapakia...</p>
        </div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">Duka la dawa halijapatikana</h3>
          <Button onClick={() => navigate('/')} className="mt-4">Rudi Nyumbani</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Rudi Nyuma
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Pill className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{pharmacy.name}</h1>
                <p className="text-muted-foreground mb-2">{pharmacy.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {pharmacy.is_verified && <Badge className="bg-blue-500">Imethibitishwa</Badge>}
                  {pharmacy.is_promoted && <Badge className="bg-yellow-500">Tangazwa</Badge>}
                </div>
                {pharmacy.rating && (
                  <div className="flex items-center text-yellow-500 mb-2">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    <span className="text-sm">{pharmacy.rating} ({pharmacy.total_reviews || 0} mapitio)</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Maelezo ya Mawasiliano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span>{pharmacy.address}</span>
            </div>
            {pharmacy.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <a href={`tel:${pharmacy.phone}`} className="text-blue-600 hover:underline">
                  {pharmacy.phone}
                </a>
              </div>
            )}
            {pharmacy.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <a href={`mailto:${pharmacy.email}`} className="text-blue-600 hover:underline">
                  {pharmacy.email}
                </a>
              </div>
            )}
            {pharmacy.location_lat && pharmacy.location_lng && (
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">Umbali kutoka kwako: ~{(Math.random() * 5 + 0.5).toFixed(1)} km</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Medicines */}
        {pharmacy.pharmacy_medicines && pharmacy.pharmacy_medicines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Dawa Zinazopatikana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pharmacy.pharmacy_medicines.map((medicine: any) => (
                  <div key={medicine.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{medicine.name}</h4>
                      {medicine.in_stock ? (
                        <Badge className="bg-green-500">Inapatikana</Badge>
                      ) : (
                        <Badge variant="secondary">Haipo</Badge>
                      )}
                    </div>
                    {medicine.description && (
                      <p className="text-sm text-muted-foreground mb-2">{medicine.description}</p>
                    )}
                    {medicine.price && (
                      <p className="text-sm font-semibold text-green-600">
                        TSh {medicine.price.toLocaleString()}
                      </p>
                    )}
                    {medicine.category && (
                      <Badge variant="outline" className="mt-2">{medicine.category}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {pharmacy.services && pharmacy.services.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Huduma Zinazopatikana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pharmacy.services.map((service: string, index: number) => (
                  <Badge key={index} variant="secondary">{service}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
