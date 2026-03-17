import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Video, Phone, MessageCircle, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AppointmentApprovalDialog } from '@/components/AppointmentApprovalDialog';

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select(`*, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url), patient:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url)`)
        .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
        .order('appointment_date', { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id
  });

  const now = new Date();
  const filtered = appointments.filter(a => {
    if (filter === 'upcoming') return new Date(a.appointment_date) >= now;
    if (filter === 'past') return new Date(a.appointment_date) < now;
    return true;
  });

  const isDoctor = appointments.some(a => a.doctor_id === user?.id);

  const statusMap: Record<string, { label: string; class: string }> = {
    scheduled: { label: 'Inasubiri', class: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' },
    confirmed: { label: 'Imeidhinishwa', class: 'bg-primary/10 text-primary border-primary/20' },
    approved: { label: 'Imekubaliwa', class: 'bg-primary/10 text-primary border-primary/20' },
    completed: { label: 'Imekamilika', class: 'bg-muted text-muted-foreground border-border' },
    cancelled: { label: 'Imeghairiwa', class: 'bg-destructive/10 text-destructive border-destructive/20' },
    rejected: { label: 'Imekataliwa', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  };

  const typeIcon: Record<string, React.ReactNode> = {
    video: <Video className="h-3 w-3" />,
    audio: <Phone className="h-3 w-3" />,
    chat: <MessageCircle className="h-3 w-3" />,
    'in-person': <MapPin className="h-3 w-3" />,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Miadi</h1>
        {!isDoctor && (
          <Button size="sm" onClick={() => navigate('/doctors-list')}>
            + Panga
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {f === 'upcoming' ? 'Ijayo' : f === 'past' ? 'Zilizopita' : 'Zote'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((apt) => {
          const isPatient = apt.patient_id === user?.id;
          const other = isPatient ? apt.doctor : apt.patient;
          const status = statusMap[apt.status] || statusMap.scheduled;

          return (
            <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={other?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {other?.first_name?.[0]}{other?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {isPatient ? 'Dk.' : ''} {other?.first_name} {other?.last_name}
                  </p>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${status.class}`}>
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(apt.appointment_date), 'dd MMM')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(apt.appointment_date), 'HH:mm')}
                  </span>
                  <span className="flex items-center gap-1">
                    {typeIcon[apt.consultation_type] || typeIcon.video}
                    <span className="capitalize">{apt.consultation_type}</span>
                  </span>
                </div>
              </div>

              {/* Doctor action: respond to pending */}
              {!isPatient && apt.status === 'scheduled' && (
                <Button size="sm" variant="outline" className="shrink-0 text-xs h-7"
                  onClick={() => { setSelectedAppointment(apt); setShowApprovalDialog(true); }}>
                  Jibu
                </Button>
              )}

              {/* Chat action for approved */}
              {apt.status === 'approved' && (
                <Button size="sm" variant="ghost" className="shrink-0 h-7 w-7 p-0"
                  onClick={() => navigate(`/messages?${isPatient ? 'doctor' : 'patient'}=${isPatient ? apt.doctor_id : apt.patient_id}`)}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Hakuna miadi</p>
          <p className="text-xs text-muted-foreground mb-4">
            {isDoctor ? 'Miadi zitaonekana hapa' : 'Panga miadi na daktari'}
          </p>
          {!isDoctor && (
            <Button size="sm" onClick={() => navigate('/doctors-list')}>Tafuta Daktari</Button>
          )}
        </div>
      )}

      <AppointmentApprovalDialog
        appointment={selectedAppointment}
        isOpen={showApprovalDialog}
        onClose={() => { setShowApprovalDialog(false); setSelectedAppointment(null); }}
      />
    </div>
  );
}
