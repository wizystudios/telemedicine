import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  ArrowLeft, Phone, MapPin, Mail, Star, Clock, 
  FlaskConical, Globe, Shield, CheckCircle2, AlertCircle, ChevronDown
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
        .select(`
          *,
          laboratory_services (id, name, description, price, category, is_available, waiting_hours, preparation_required),
          laboratory_insurance (insurance_id)
        `)
        .eq('id', labId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!labId
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

  if (!laboratory) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  // Render service card
  const renderServiceCard = (service: any) => (
    <div 
      key={service.id} 
      className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{service.name}</h4>
            <Badge variant={service.is_available ? "default" : "secondary"} className="text-xs shrink-0">
              {service.is_available ? 'Inapatikana' : 'Haipo'}
            </Badge>
          </div>
          {service.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            {service.waiting_hours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Matokeo: {service.waiting_hours} saa
              </span>
            )}
            {service.preparation_required && (
              <span className="text-amber-600">⚠️ {service.preparation_required}</span>
            )}
          </div>
        </div>
        {service.price && (
          <div className="text-right shrink-0 ml-2">
            <p className="font-bold text-primary">
              TSh {service.price.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto p-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Rudi Nyuma
          </Button>
          
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-4 border-white/20">
              <AvatarImage src={laboratory.logo_url} />
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                <FlaskConical className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{laboratory.name}</h1>
              <p className="text-white/80 text-sm mt-1">{laboratory.description}</p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {laboratory.is_verified && (
                  <Badge className="bg-white/20 text-white border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Imethibitishwa
                  </Badge>
                )}
                {laboratory.emergency_available && (
                  <Badge className="bg-red-500/80 text-white border-0">
                    <AlertCircle className="w-3 h-3 mr-1" /> Dharura 24/7
                  </Badge>
                )}
              </div>
              
              {laboratory.rating > 0 && (
                <div className="flex items-center gap-1 mt-2 text-yellow-300">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-semibold">{laboratory.rating}</span>
                  <span className="text-white/60 text-sm">({laboratory.total_reviews || 0} mapitio)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <FlaskConical className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{services.length}</p>
            <p className="text-xs text-muted-foreground">Vipimo</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <CheckCircle2 className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{availableServices.length}</p>
            <p className="text-xs text-muted-foreground">Vinapatikana</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <Star className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{laboratory.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Mawasiliano
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{laboratory.address}</span>
            </div>
            {laboratory.phone && (
              <a href={`tel:${laboratory.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-4 h-4" />
                <span>{laboratory.phone}</span>
              </a>
            )}
            {laboratory.email && (
              <a href={`mailto:${laboratory.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="w-4 h-4" />
                <span>{laboratory.email}</span>
              </a>
            )}
            {laboratory.website && (
              <a href={laboratory.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <Globe className="w-4 h-4" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>

        {/* Insurance Providers - Show 3 with View All */}
        {insuranceIds.length > 0 && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              Bima Zinazokubaliwa ({insuranceIds.length})
            </h3>
            <InsuranceDisplay insuranceIds={insuranceIds.slice(0, 3)} />
            {insuranceIds.length > 3 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 text-sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Ona Bima Zote ({insuranceIds.length})
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      Bima Zinazokubaliwa ({insuranceIds.length})
                    </SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100%-60px)]">
                    <InsuranceDisplay insuranceIds={insuranceIds} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}

        {/* Test Services - Show 3 with View All Bottom Sheet */}
        {services.length > 0 && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              Vipimo Vinavyopatikana ({availableServices.length})
            </h3>
            <div className="space-y-3">
              {services.slice(0, 3).map(renderServiceCard)}
            </div>
            {services.length > 3 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 text-sm">
                    <FlaskConical className="w-4 h-4 mr-2" />
                    Ona Vipimo Vyote ({services.length})
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-primary" />
                      Vipimo Vyote ({services.length})
                    </SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100%-60px)] space-y-3 pr-2">
                    {services.map(renderServiceCard)}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}

        {/* Test Types - Show 3 with View All */}
        {laboratory.test_types?.length > 0 && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              Aina za Vipimo ({laboratory.test_types.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {laboratory.test_types.slice(0, 5).map((type: string, index: number) => (
                <Badge key={index} variant="outline" className="px-3 py-1">
                  {type}
                </Badge>
              ))}
            </div>
            {laboratory.test_types.length > 5 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 text-sm">
                    <FlaskConical className="w-4 h-4 mr-2" />
                    Ona Aina Zote ({laboratory.test_types.length})
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-primary" />
                      Aina za Vipimo Vyote ({laboratory.test_types.length})
                    </SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100%-60px)]">
                    <div className="flex flex-wrap gap-2">
                      {laboratory.test_types.map((type: string, index: number) => (
                        <Badge key={index} variant="outline" className="px-3 py-1">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
