import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from '@/hooks/useCart';
import {
  ArrowLeft, Phone, MapPin, Mail, Star, Pill,
  Shield, CheckCircle2, AlertCircle, ShoppingCart, Plus
} from 'lucide-react';
import { InsuranceDisplay } from '@/components/InsuranceSelector';

export default function PharmacyProfile() {
  const { pharmacyId } = useParams();
  const navigate = useNavigate();
  const { addToCart, totalCount } = useCart();

  const { data: pharmacy, isLoading } = useQuery({
    queryKey: ['pharmacy-profile', pharmacyId],
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from('pharmacies').select('*').eq('id', pharmacyId).maybeSingle();
      if (error) throw error;
      if (!p) return null;
      const [medsRes, insRes] = await Promise.all([
        supabase.from('pharmacy_medicines').select('*').eq('pharmacy_id', pharmacyId),
        supabase.from('pharmacy_insurance').select('insurance_id').eq('pharmacy_id', pharmacyId),
      ]);
      return {
        ...p,
        pharmacy_medicines: medsRes.data || [],
        pharmacy_insurance: insRes.data || [],
      };
    },
    enabled: !!pharmacyId
  });

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );

  if (!pharmacy) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h3 className="text-lg font-medium">Duka la dawa halijapatikana</h3>
        <Button onClick={() => navigate('/')} className="mt-4">Rudi Nyumbani</Button>
      </div>
    </div>
  );

  const medicines = pharmacy.pharmacy_medicines || [];
  const insuranceIds = pharmacy.pharmacy_insurance?.map((pi: any) => pi.insurance_id).filter(Boolean) || [];
  const inStockMedicines = medicines.filter((m: any) => m.in_stock);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl space-y-3 px-3 pt-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
          </Button>
          <Button size="sm" variant="outline" className="relative" onClick={() => navigate('/cart')}>
            <ShoppingCart className="h-4 w-4" />
            {totalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center px-1">
                {totalCount}
              </span>
            )}
          </Button>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={pharmacy.logo_url} alt={pharmacy.name} />
              <AvatarFallback className="bg-primary/10 text-primary"><Pill className="h-6 w-6" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{pharmacy.name}</h1>
              {pharmacy.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{pharmacy.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pharmacy.is_verified && <Badge variant="secondary" className="h-6 px-2 text-[11px]"><CheckCircle2 className="mr-1 h-3 w-3" /> Imethibitishwa</Badge>}
                {pharmacy.emergency_available && <Badge variant="destructive" className="h-6 px-2 text-[11px]"><AlertCircle className="mr-1 h-3 w-3" /> Dharura 24/7</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {pharmacy.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current text-primary" />
                    <span className="font-semibold text-foreground">{pharmacy.rating}</span>
                    <span>({pharmacy.total_reviews || 0})</span>
                  </div>
                )}
                <span>{inStockMedicines.length} dawa zinapatikana</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="medicines">
          <TabsList className="w-full">
            <TabsTrigger value="medicines" className="flex-1">Dawa</TabsTrigger>
            <TabsTrigger value="info" className="flex-1">Maelezo</TabsTrigger>
            <TabsTrigger value="insurance" className="flex-1">Bima</TabsTrigger>
          </TabsList>

          <TabsContent value="medicines" className="space-y-2 mt-3">
            {medicines.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">Hakuna dawa.</p>}
            {medicines.map((med: any) => (
              <div key={med.id} className={`flex items-center gap-3 rounded-xl border p-3 ${med.in_stock ? 'border-border' : 'border-border/50 opacity-60'}`}>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Pill className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{med.name}</p>
                    {med.requires_prescription && <Badge variant="destructive" className="text-[10px] py-0 shrink-0">Rx</Badge>}
                  </div>
                  {med.dosage && <p className="text-[11px] text-muted-foreground">{med.dosage}</p>}
                  {med.price && <p className="text-xs font-semibold text-primary mt-0.5">TSh {med.price.toLocaleString()}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  disabled={!med.in_stock}
                  onClick={() => addToCart(med.id, pharmacy.id, 1)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Ongeza
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="info" className="space-y-2 mt-3">
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /><span>{pharmacy.address}</span>
              </div>
              {pharmacy.phone && (
                <a href={`tel:${pharmacy.phone}`} className="flex items-center gap-2 text-primary"><Phone className="h-4 w-4" /><span>{pharmacy.phone}</span></a>
              )}
              {pharmacy.email && (
                <a href={`mailto:${pharmacy.email}`} className="flex items-center gap-2 text-primary"><Mail className="h-4 w-4" /><span>{pharmacy.email}</span></a>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insurance" className="mt-3">
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Shield className="h-4 w-4 text-primary" /> Bima Zinazokubaliwa
              </div>
              <InsuranceDisplay insuranceIds={insuranceIds} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
