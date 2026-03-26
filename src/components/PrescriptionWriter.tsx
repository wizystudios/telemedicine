import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Med {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionWriterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onSuccess?: () => void;
}

export function PrescriptionWriter({ open, onOpenChange, patientId, patientName, appointmentId, onSuccess }: PrescriptionWriterProps) {
  const { user } = useAuth();
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<Med[]>([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const [saving, setSaving] = useState(false);

  const addMed = () => setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const removeMed = (i: number) => setMedications(medications.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof Med, value: string) => {
    const updated = [...medications];
    updated[i][field] = value;
    setMedications(updated);
  };

  const handleSubmit = async () => {
    if (!user?.id || !patientId) return;
    const validMeds = medications.filter(m => m.name.trim());
    if (validMeds.length === 0) {
      toast({ title: 'Ongeza dawa angalau moja', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('prescriptions').insert({
      doctor_id: user.id,
      patient_id: patientId,
      appointment_id: appointmentId || null,
      diagnosis,
      notes,
      medications: validMeds,
      status: 'active'
    } as any);

    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } else {
      // Also update appointment prescription field if linked
      if (appointmentId) {
        await supabase.from('appointments').update({ 
          prescription: validMeds.map(m => `${m.name} ${m.dosage} - ${m.frequency}`).join(', '),
          status: 'completed'
        }).eq('id', appointmentId);
      }
      toast({ title: 'Dawa Zimeandikwa ✅', description: `Cheti kimetumwa kwa ${patientName}` });
      onOpenChange(false);
      setDiagnosis('');
      setNotes('');
      setMedications([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
      onSuccess?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Andika Dawa — {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Uchunguzi (Diagnosis)</Label>
            <Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Mfano: Malaria, Homa..." className="mt-1" rows={2} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Dawa</Label>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addMed}>
                <Plus className="h-3 w-3 mr-1" /> Ongeza
              </Button>
            </div>

            {medications.map((med, i) => (
              <div key={i} className="p-3 rounded-lg border border-border mb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">Dawa {i + 1}</Badge>
                  {medications.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => removeMed(i)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <Input placeholder="Jina la dawa" value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} className="h-8 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Kipimo (mfano: 500mg)" value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="Mara (mfano: 3x/siku)" value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Muda (mfano: siku 7)" value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="Maelekezo" value={med.instructions} onChange={e => updateMed(i, 'instructions', e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label className="text-xs">Maelezo ya Ziada</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mfano: Rudi baada ya siku 3..." className="mt-1" rows={2} />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Tuma Cheti cha Dawa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
