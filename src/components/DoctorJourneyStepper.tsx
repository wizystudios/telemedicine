import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MessageCircle, FileText, Flag, Circle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Status = 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

interface Props {
  appointmentId: string;
  patientId: string;
  patientName: string;
  status: Status | string;
  onWritePrescription: () => void;
  onChanged?: () => void;
}

const STEPS = [
  { key: 'approved', label: 'Kubali', icon: CheckCircle2 },
  { key: 'in_progress', label: 'Mazungumzo', icon: MessageCircle },
  { key: 'prescribed', label: 'Andika Dawa', icon: FileText },
  { key: 'completed', label: 'Kamilisha', icon: Flag },
];

function stepIndex(status: string) {
  if (status === 'completed') return 4;
  if (status === 'in_progress') return 2;
  if (status === 'approved') return 1;
  return 0;
}

export function DoctorJourneyStepper({
  appointmentId, patientId, patientName, status, onWritePrescription, onChanged,
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const idx = stepIndex(status);

  const advance = async (nextStatus: Status) => {
    setBusy(true);
    const { error } = await supabase
      .from('appointments')
      .update({ status: nextStatus })
      .eq('id', appointmentId);
    setBusy(false);
    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imesasishwa', description: `Hatua imesogezwa: ${nextStatus}` });
      onChanged?.();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Safari ya Mgonjwa: <span className="text-muted-foreground">{patientName}</span></p>
        <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-4 gap-1">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[9px] text-center ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Actions per current step */}
      <div className="flex flex-wrap gap-2">
        {status === 'pending' && (
          <Button size="sm" className="flex-1 h-8 text-xs" disabled={busy} onClick={() => advance('approved')}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Kubali Miadi
          </Button>
        )}
        {(status === 'approved' || status === 'in_progress') && (
          <>
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => navigate(`/messages?patient=${patientId}`)}>
              <MessageCircle className="h-3.5 w-3.5 mr-1" /> Ongea
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={onWritePrescription}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Andika Dawa
            </Button>
            {status !== 'in_progress' && (
              <Button size="sm" className="flex-1 h-8 text-xs" disabled={busy} onClick={() => advance('in_progress')}>
                Anza Mazungumzo
              </Button>
            )}
            <Button size="sm" className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => advance('completed')}>
              <Flag className="h-3.5 w-3.5 mr-1" /> Kamilisha Miadi
            </Button>
          </>
        )}
        {status === 'completed' && (
          <div className="w-full text-center text-[11px] text-emerald-600 flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Miadi imekamilika
          </div>
        )}
      </div>
    </div>
  );
}
