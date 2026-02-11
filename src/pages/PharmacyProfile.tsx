import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableSection } from '@/components/ExpandableSection';
import { 
  ArrowLeft, Phone, MapPin, Mail, Star, Clock, Pill,
  Shield, CheckCircle2, AlertCircle, Package
} from 'lucide-react';
import { InsuranceDisplay } from '@/components/InsuranceSelector';

export default function PharmacyProfile() {
  const { pharmacyId } = useParams();
  const navigate = useNavigate();

  const { data: pharmacy, isLoading } = useQuery({
    queryKey: ['pharmacy-profile', pharmacyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacies')
        .select(`*, pharmacy_medicines (id, name, description, price, in_stock, category, dosage, requires_prescription), pharmacy_insurance (insurance_id)`)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
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

  const medicines = pharmacy.pharmacy_medicines || [];
  const insuranceIds = pharmacy.pharmacy_insurance?.map((pi: any) => pi.insurance_id).filter(Boolean) || [];
  const inStockMedicines = medicines.filter((m: any) => m.in_stock);
  const services = pharmacy.services || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Rudi Nyuma
          </Button>
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-4 border-white/20">
              <AvatarImage src={pharmacy.logo_url} />
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                <Pill className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{pharmacy.name}</h1>
              <p className="text-white/80 text-sm mt-1">{pharmacy.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {pharmacy.is_verified && (
                  <Badge className="bg-white/20 text-white border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Imethibitishwa
                  </Badge>
                )}
                {pharmacy.emergency_available && (
                  <Badge className="bg-red-500/80 text-white border-0">
                    <AlertCircle className="w-3 h-3 mr-1" /> Dharura 24/7
                  </Badge>
                )}
              </div>
              {pharmacy.rating > 0 && (
                <div className="flex items-center gap-1 mt-2 text-yellow-300">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-semibold">{pharmacy.rating}</span>
                  <span className="text-white/60 text-sm">({pharmacy.total_reviews || 0} mapitio)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <Package className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{medicines.length}</p>
            <p className="text-xs text-muted-foreground">Dawa</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <CheckCircle2 className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{inStockMedicines.length}</p>
            <p className="text-xs text-muted-foreground">Zinapatikana</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <Star className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{pharmacy.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" /> Mawasiliano
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" /> <span>{pharmacy.address}</span>
            </div>
            {pharmacy.phone && (
              <a href={`tel:${pharmacy.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-4 h-4" /> <span>{pharmacy.phone}</span>
              </a>
            )}
            {pharmacy.email && (
              <a href={`mailto:${pharmacy.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="w-4 h-4" /> <span>{pharmacy.email}</span>
              </a>
            )}
          </div>
          {pharmacy.quote_of_day && (
            <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-sm italic text-muted-foreground">"{pharmacy.quote_of_day}"</p>
            </div>
          )}
        </div>

        {/* Insurance - header only */}
        <ExpandableSection
          title="Bima Zinazokubaliwa"
          count={insuranceIds.length}
          icon={<Shield className="w-4 h-4 text-blue-500" />}
        >
          <InsuranceDisplay insuranceIds={insuranceIds} />
        </ExpandableSection>

        {/* Medicines - header only */}
        <ExpandableSection
          title={`Dawa (${inStockMedicines.length} zinapatikana)`}
          count={medicines.length}
          icon={<Pill className="w-4 h-4" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {medicines.map((medicine: any) => (
              <div key={medicine.id} className={`p-3 rounded-xl border ${medicine.in_stock ? 'bg-muted/30 border-border/50' : 'bg-muted/10 border-border/30 opacity-60'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{medicine.name}</h4>
                      {medicine.requires_prescription && <Badge variant="destructive" className="text-xs py-0 shrink-0">Rx</Badge>}
                    </div>
                    {medicine.dosage && <p className="text-xs text-muted-foreground">{medicine.dosage}</p>}
                  </div>
                  <Badge variant={medicine.in_stock ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
                    {medicine.in_stock ? 'Inapatikana' : 'Haipo'}
                  </Badge>
                </div>
                {medicine.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{medicine.description}</p>}
                <div className="flex items-center justify-between">
                  {medicine.category && <Badge variant="outline" className="text-xs">{medicine.category}</Badge>}
                  {medicine.price && <p className="text-sm font-bold text-primary">TSh {medicine.price.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Services - header only */}
        <ExpandableSection
          title="Huduma Zinazopatikana"
          count={services.length}
          icon={<Clock className="w-4 h-4" />}
        >
          <div className="flex flex-wrap gap-2">
            {services.map((service: string, index: number) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">{service}</Badge>
            ))}
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
}
