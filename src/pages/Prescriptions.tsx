import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, Pill, Clock, Loader2, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Prescriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Try as patient first, then as doctor
      const { data: patientData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      
      const { data: doctorData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });

      const all = [...(patientData || []), ...(doctorData || [])];
      // Deduplicate
      const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      
      // Fetch related profiles
      const userIds = [...new Set(unique.flatMap(p => [p.doctor_id, p.patient_id]))];
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      
      return unique.map(p => ({
        ...p,
        doctor: profileMap[p.doctor_id],
        patient: profileMap[p.patient_id],
        medications: typeof p.medications === 'string' ? JSON.parse(p.medications) : p.medications
      }));
    },
    enabled: !!user?.id
  });

  const isDoctor = prescriptions.some(p => p.doctor_id === user?.id);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
      <h1 className="text-lg font-bold mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Vyeti vya Dawa
      </h1>

      {prescriptions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Hakuna vyeti vya dawa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx: any) => {
            const otherUser = isDoctor ? rx.patient : rx.doctor;
            const meds = Array.isArray(rx.medications) ? rx.medications : [];
            
            return (
              <Card key={rx.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={otherUser?.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {otherUser?.first_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {isDoctor ? 'Kwa' : 'Kutoka Dk.'} {otherUser?.first_name} {otherUser?.last_name}
                        </p>
                        <Badge variant={rx.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                          {rx.status === 'active' ? 'Hai' : 'Imekwisha'}
                        </Badge>
                      </div>
                      
                      {rx.diagnosis && (
                        <p className="text-[11px] text-muted-foreground mt-1">Uchunguzi: {rx.diagnosis}</p>
                      )}

                      <div className="mt-2 space-y-1">
                        {meds.slice(0, 3).map((med: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <Pill className="h-3 w-3 text-primary shrink-0" />
                            <span className="font-medium">{med.name}</span>
                            <span className="text-muted-foreground">{med.dosage} • {med.frequency}</span>
                          </div>
                        ))}
                        {meds.length > 3 && (
                          <p className="text-[10px] text-muted-foreground">+{meds.length - 3} zaidi</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(rx.created_at), 'dd/MM/yyyy')}
                        </p>
                        {!isDoctor && rx.status === 'active' && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => navigate('/nearby')}>
                            <ShoppingCart className="h-3 w-3 mr-1" /> Agiza Dawa
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
