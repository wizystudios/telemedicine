import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Video, Phone, MessageCircle, MapPin, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AppointmentApprovalDialog } from '@/components/AppointmentApprovalDialog';
import { UniversalSearch } from '@/components/UniversalSearch';

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [search, setSearch] = useState('');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select(`*, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url), patient:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url)`)
        .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
        .neq('consultation_type', 'chat')
        .order('appointment_date', { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
  });

  const isDoctor = appointments.some(a => a.doctor_id === user?.id);
  const now = new Date();

  // Apply search across both upcoming + past lists
  const filterFn = (a: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const otherName = a.patient_id === user?.id
      ? `${a.doctor?.first_name || ''} ${a.doctor?.last_name || ''}`
      : `${a.patient?.first_name || ''} ${a.patient?.last_name || ''}`;
    return `${otherName} ${a.symptoms || ''} ${a.consultation_type || ''} ${a.status || ''}`
      .toLowerCase().includes(q);
  };

  const upcoming = useMemo(
    () => appointments.filter(a => new Date(a.appointment_date) >= now).filter(filterFn),
    [appointments, search, now]
  );
  const past = useMemo(
    () => appointments.filter(a => new Date(a.appointment_date) < now).filter(filterFn),
    [appointments, search, now]
  );

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

  const renderRow = (apt: any, opts?: { isUpcoming?: boolean }) => {
    const isPatient = apt.patient_id === user?.id;
    const other = isPatient ? apt.doctor : apt.patient;
    const status = statusMap[apt.status] || statusMap.scheduled;
    const upcomingStyle = opts?.isUpcoming
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : 'bg-card border-border';

    return (
      <div key={apt.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${upcomingStyle}`}>
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

        {!isPatient && apt.status === 'scheduled' && (
          <Button size="sm" variant="outline" className="shrink-0 text-xs h-7"
            onClick={() => { setSelectedAppointment(apt); setShowApprovalDialog(true); }}>
            Jibu
          </Button>
        )}

        {apt.status === 'approved' && (
          <Button size="sm" variant="ghost" className="shrink-0 h-7 w-7 p-0"
            onClick={() => navigate(`/messages?${isPatient ? 'doctor' : 'patient'}=${isPatient ? apt.doctor_id : apt.patient_id}`)}>
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Miadi</h1>
        {!isDoctor && (
          <Button size="sm" onClick={() => navigate('/doctors-list')}>+ Panga</Button>
        )}
      </div>

      <UniversalSearch
        placeholder="Tafuta miadi, daktari, dalili..."
        onLocalFilter={setSearch}
        global={true}
      />

      {/* Upcoming section with green coming banner */}
      <section className="space-y-2">
        <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Inakuja
            </p>
          </div>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">{upcoming.length} miadi</span>
        </div>

        {upcoming.length > 0 ? (
          upcoming.map(apt => renderRow(apt, { isUpcoming: true }))
        ) : (
          <div className="text-center py-6 rounded-2xl border border-dashed border-border">
            <p className="text-xs text-muted-foreground">Hakuna miadi inayokuja</p>
          </div>
        )}
      </section>

      {/* Past section */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-muted-foreground">Zilizopita</p>
          <span className="text-[10px] text-muted-foreground">{past.length}</span>
        </div>
        {past.length > 0 ? (
          past.map(apt => renderRow(apt))
        ) : (
          <div className="text-center py-4">
            <p className="text-[11px] text-muted-foreground">Hakuna miadi iliyopita</p>
          </div>
        )}
      </section>

      {appointments.length === 0 && (
        <div className="text-center py-12">
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
