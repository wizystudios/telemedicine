import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableSection } from '@/components/ExpandableSection';
import {
  ArrowLeft, Phone, MapPin, Mail, Star, Clock,
  FlaskConical, Globe, Shield, CheckCircle2, AlertCircle
} from 'lucide-react';
import { InsuranceDisplay } from '@/components/InsuranceSelector';

export default function LaboratoryProfile() {
  const { labId } = useParams();
  const navigate = useNavigate();

  const { data: laboratory, isLoading } = useQuery({
    queryKey: ['laboratory-profile', labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('laboratories')
        .select(`*, laboratory_services (id, name, description, price, category, is_available, waiting_hours, preparation_required), laboratory_insurance (insurance_id)`)
        .eq('id', labId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!labId
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!laboratory) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h3 className="text-lg font-medium">Maabara haijapatikana</h3>
          <Button onClick={() => navigate('/')} className="mt-4">Rudi Nyumbani</Button>
        </div>
      </div>
    );
  }

  const insuranceIds = laboratory.laboratory_insurance?.map((li: any) => li.insurance_id).filter(Boolean) || [];
  const services = laboratory.laboratory_services || [];
  const availableServices = services.filter((s: any) => s.is_available);

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
              <AvatarImage src={laboratory.logo_url} alt={laboratory.name} />
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                <FlaskConical className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{laboratory.name}</h1>
              {laboratory.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{laboratory.description}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {laboratory.is_verified && (
                  <Badge variant="secondary" className="h-6 px-2 text-[11px]">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Imethibitishwa
                  </Badge>
                )}
                {laboratory.emergency_available && (
                  <Badge variant="destructive" className="h-6 px-2 text-[11px]">
                    <AlertCircle className="mr-1 h-3 w-3" /> Dharura 24/7
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {laboratory.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current text-primary" />
                    <span className="font-semibold text-foreground">{laboratory.rating}</span>
                    <span>({laboratory.total_reviews || 0})</span>
                  </div>
                )}
                <span>{services.length} vipimo</span>
                <span>{availableServices.length} vinapatikana</span>
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
              <span>{laboratory.address}</span>
            </div>
            {laboratory.phone && (
              <a href={`tel:${laboratory.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="h-4 w-4" />
                <span>{laboratory.phone}</span>
              </a>
            )}
            {laboratory.email && (
              <a href={`mailto:${laboratory.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="h-4 w-4" />
                <span>{laboratory.email}</span>
              </a>
            )}
            {laboratory.website && (
              <a href={laboratory.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <Globe className="h-4 w-4" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>

        {/* Insurance */}
        <ExpandableSection title="Bima Zinazokubaliwa" count={insuranceIds.length} icon={<Shield className="h-4 w-4" />} className="shadow-none">
          <InsuranceDisplay insuranceIds={insuranceIds} />
        </ExpandableSection>

        {/* Lab Services */}
        <ExpandableSection title={`Vipimo (${availableServices.length} vinapatikana)`} count={services.length} icon={<FlaskConical className="h-4 w-4" />} className="shadow-none">
          <div className="space-y-2">
            {services.map((service: any) => (
              <div key={service.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{service.name}</p>
                    {service.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                      {service.waiting_hours && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {service.waiting_hours} saa</span>
                      )}
                      {service.preparation_required && (
                        <span className="text-amber-600">⚠️ {service.preparation_required}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <Badge variant={service.is_available ? "default" : "secondary"} className="text-[10px]">
                      {service.is_available ? 'Inapatikana' : 'Haipo'}
                    </Badge>
                    {service.price && <p className="text-xs font-semibold text-primary mt-1">TSh {service.price.toLocaleString()}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Test Types */}
        {laboratory.test_types?.length > 0 && (
          <ExpandableSection title="Aina za Vipimo" count={laboratory.test_types.length} icon={<FlaskConical className="h-4 w-4" />} className="shadow-none">
            <div className="flex flex-wrap gap-2">
              {laboratory.test_types.map((type: string, index: number) => (
                <Badge key={index} variant="outline" className="px-3 py-1">{type}</Badge>
              ))}
            </div>
          </ExpandableSection>
        )}
      </div>
    </div>
  );
}