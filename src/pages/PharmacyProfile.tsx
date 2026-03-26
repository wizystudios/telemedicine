import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableSection } from '@/components/ExpandableSection';
import {
  ArrowLeft, Phone, MapPin, Mail, Star, Pill,
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
      <div className="mx-auto max-w-2xl space-y-3 px-3 pt-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
        </Button>

        {/* Main Card */}
        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={pharmacy.logo_url} alt={pharmacy.name} />
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                <Pill className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{pharmacy.name}</h1>
              {pharmacy.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{pharmacy.description}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {pharmacy.is_verified && (
                  <Badge variant="secondary" className="h-6 px-2 text-[11px]">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Imethibitishwa
                  </Badge>
                )}
                {pharmacy.emergency_available && (
                  <Badge variant="destructive" className="h-6 px-2 text-[11px]">
                    <AlertCircle className="mr-1 h-3 w-3" /> Dharura 24/7
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {pharmacy.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current text-primary" />
                    <span className="font-semibold text-foreground">{pharmacy.rating}</span>
                    <span>({pharmacy.total_reviews || 0})</span>
                  </div>
                )}
                <span>{medicines.length} dawa</span>
                <span>{inStockMedicines.length} zinapatikana</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-primary" /> Mawasiliano
          </h2>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{pharmacy.address}</span>
            </div>
            {pharmacy.phone && (
              <a href={`tel:${pharmacy.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="h-4 w-4" />
                <span>{pharmacy.phone}</span>
              </a>
            )}
            {pharmacy.email && (
              <a href={`mailto:${pharmacy.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="h-4 w-4" />
                <span>{pharmacy.email}</span>
              </a>
            )}
          </div>
          {(pharmacy as any).quote_of_day && (
            <p className="mt-2 text-xs italic text-muted-foreground border-t border-border pt-2">
              "{(pharmacy as any).quote_of_day}"
            </p>
          )}
        </div>

        {/* Insurance */}
        <ExpandableSection title="Bima Zinazokubaliwa" count={insuranceIds.length} icon={<Shield className="h-4 w-4" />} className="shadow-none">
          <InsuranceDisplay insuranceIds={insuranceIds} />
        </ExpandableSection>

        {/* Medicines */}
        <ExpandableSection title={`Dawa (${inStockMedicines.length} zinapatikana)`} count={medicines.length} icon={<Pill className="h-4 w-4" />} className="shadow-none">
          <div className="space-y-2">
            {medicines.map((medicine: any) => (
              <div key={medicine.id} className={`flex items-center justify-between rounded-xl border p-3 ${medicine.in_stock ? 'border-border' : 'border-border/50 opacity-60'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{medicine.name}</p>
                    {medicine.requires_prescription && <Badge variant="destructive" className="text-[10px] py-0 shrink-0">Rx</Badge>}
                  </div>
                  {medicine.dosage && <p className="text-[11px] text-muted-foreground">{medicine.dosage}</p>}
                  {medicine.category && <Badge variant="outline" className="mt-1 text-[10px]">{medicine.category}</Badge>}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <Badge variant={medicine.in_stock ? "default" : "secondary"} className="text-[10px]">
                    {medicine.in_stock ? 'Inapatikana' : 'Haipo'}
                  </Badge>
                  {medicine.price && <p className="text-xs font-semibold text-primary mt-1">TSh {medicine.price.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Services */}
        {services.length > 0 && (
          <ExpandableSection title="Huduma" count={services.length} icon={<Package className="h-4 w-4" />} className="shadow-none">
            <div className="flex flex-wrap gap-2">
              {services.map((service: string, index: number) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">{service}</Badge>
              ))}
            </div>
          </ExpandableSection>
        )}
      </div>
    </div>
  );
}