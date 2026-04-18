import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Phone, MapPin, Mail, Star, Globe,
  Stethoscope, Shield, CheckCircle2, Ambulance, HeartPulse, Hospital, FileText
} from 'lucide-react';
import { InsuranceDisplay } from '@/components/InsuranceSelector';
import { ReviewsSection } from '@/components/ReviewsSection';

export default function HospitalProfile() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  const { data: hospital, isLoading } = useQuery({
    queryKey: ['hospital-profile', hospitalId],
    queryFn: async () => {
      const { data: h, error: hErr } = await supabase
        .from('hospitals').select('*').eq('id', hospitalId).maybeSingle();
      if (hErr) throw hErr;
      if (!h) return null;

      const [servicesRes, insRes, docsRes, contentRes] = await Promise.all([
        supabase.from('hospital_services').select('*').eq('hospital_id', hospitalId),
        supabase.from('hospital_insurance').select('insurance_id').eq('hospital_id', hospitalId),
        supabase.from('doctor_profiles')
          .select('user_id, bio, experience_years, consultation_fee, doctor_type, is_available')
          .eq('hospital_id', hospitalId),
        supabase.from('institution_content')
          .select('*').eq('institution_id', hospitalId).eq('is_published', true)
          .order('created_at', { ascending: false }),
      ]);

      const doctorIds = (docsRes.data || []).map((d: any) => d.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      if (doctorIds.length) {
        const { data: profs } = await supabase
          .from('profiles').select('id, first_name, last_name, avatar_url').in('id', doctorIds);
        profilesMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      }
      const doctor_profiles = (docsRes.data || []).map((d: any) => ({
        ...d, profiles: profilesMap[d.user_id] || null,
      }));

      return {
        ...h,
        hospital_services: servicesRes.data || [],
        hospital_insurance: insRes.data || [],
        doctor_profiles,
        content: contentRes.data || [],
      };
    },
    enabled: !!hospitalId
  });

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );

  if (!hospital) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h3 className="text-lg font-medium">Hospitali haijapatikana</h3>
        <Button onClick={() => navigate('/')} className="mt-4">Rudi Nyumbani</Button>
      </div>
    </div>
  );

  const doctors = hospital.doctor_profiles || [];
  const services = hospital.hospital_services || [];
  const content = hospital.content || [];
  const insuranceIds = hospital.hospital_insurance?.map((hi: any) => hi.insurance_id).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl space-y-3 px-3 pt-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
        </Button>

        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={hospital.logo_url} alt={hospital.name} />
              <AvatarFallback className="bg-primary/10 text-primary"><Hospital className="h-6 w-6" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{hospital.name}</h1>
              {hospital.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{hospital.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hospital.is_verified && <Badge variant="secondary" className="h-6 px-2 text-[11px]"><CheckCircle2 className="mr-1 h-3 w-3" /> Imethibitishwa</Badge>}
                {hospital.has_ambulance && <Badge variant="destructive" className="h-6 px-2 text-[11px]"><Ambulance className="mr-1 h-3 w-3" /> Ambulance</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {hospital.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current text-primary" />
                    <span className="font-semibold text-foreground">{hospital.rating}</span>
                    <span>({hospital.total_reviews || 0})</span>
                  </div>
                )}
                <span>{doctors.length} madaktari</span>
                <span>{services.length} huduma</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="info" className="flex-1 text-xs">Maelezo</TabsTrigger>
            <TabsTrigger value="services" className="flex-1 text-xs">Huduma</TabsTrigger>
            <TabsTrigger value="doctors" className="flex-1 text-xs">Madaktari</TabsTrigger>
            <TabsTrigger value="content" className="flex-1 text-xs">Maudhui</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 mt-3">
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /><span>{hospital.address}</span></div>
              {hospital.phone && <a href={`tel:${hospital.phone}`} className="flex items-center gap-2 text-primary"><Phone className="h-4 w-4" />{hospital.phone}</a>}
              {hospital.email && <a href={`mailto:${hospital.email}`} className="flex items-center gap-2 text-primary"><Mail className="h-4 w-4" />{hospital.email}</a>}
              {hospital.website && <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary"><Globe className="h-4 w-4" />Website</a>}
              {hospital.has_ambulance && hospital.ambulance_phone && (
                <a href={`tel:${hospital.ambulance_phone}`} className="flex items-center gap-2 text-destructive font-medium pt-2 border-t border-border">
                  <Ambulance className="h-4 w-4" />Ambulance: {hospital.ambulance_phone}
                </a>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Shield className="h-4 w-4 text-primary" /> Bima Zinazokubaliwa
              </div>
              <InsuranceDisplay insuranceIds={insuranceIds} />
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-2 mt-3">
            {services.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">Hakuna huduma.</p>}
            {services.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  {s.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{s.description}</p>}
                  {s.category && <Badge variant="outline" className="mt-1 text-[10px]">{s.category}</Badge>}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <Badge variant={s.is_available ? "default" : "secondary"} className="text-[10px]">
                    {s.is_available ? 'Inapatikana' : 'Haipo'}
                  </Badge>
                  {s.price && <p className="text-xs font-semibold text-primary mt-1">TSh {s.price.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="doctors" className="space-y-2 mt-3">
            {doctors.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">Hakuna madaktari.</p>}
            {doctors.map((doc: any) => (
              <div key={doc.user_id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Avatar className="h-10 w-10"><AvatarImage src={doc.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {doc.profiles?.first_name?.[0]}{doc.profiles?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Dkt. {doc.profiles?.first_name} {doc.profiles?.last_name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{doc.doctor_type || 'Daktari wa Jumla'}</span>
                    {doc.consultation_fee && <span className="text-primary font-medium">TSh {doc.consultation_fee.toLocaleString()}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => navigate(`/doctor-profile/${doc.user_id}`)}>
                  Tazama
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="content" className="space-y-2 mt-3">
            {content.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">Hakuna maudhui.</p>}
            {content.map((c: any) => (
              <div key={c.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-primary mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    {c.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <ReviewsSection entityType="hospital" entityId={hospitalId || ''} entityName={hospital.name} showForm={false} />
      </div>
    </div>
  );
}
