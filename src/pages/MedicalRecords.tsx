import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Loader2, Upload, Trash2, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const RECORD_TYPES = [
  { value: 'prescription', label: 'Dawa' },
  { value: 'lab_result', label: 'Matokeo ya Maabara' },
  { value: 'xray', label: 'X-Ray/Picha' },
  { value: 'diagnosis', label: 'Uchunguzi' },
  { value: 'vaccination', label: 'Chanjo' },
  { value: 'other', label: 'Nyingine' },
];

export default function MedicalRecords() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', record_type: 'prescription' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['medical-records', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      if (!user?.id || !form.title.trim()) throw new Error('Jaza taarifa');
      const { error } = await supabase.from('medical_records').insert({
        patient_id: user.id,
        title: form.title,
        description: form.description,
        record_type: form.record_type
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setIsAdding(false);
      setForm({ title: '', description: '', record_type: 'prescription' });
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      toast({ title: 'Rekodi imehifadhiwa ✅' });
    },
    onError: (e: any) => toast({ title: 'Kosa', description: e.message, variant: 'destructive' })
  });

  const deleteRecord = async (id: string) => {
    await supabase.from('medical_records').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    toast({ title: 'Imefutwa' });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Rekodi za Afya
        </h1>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-3 w-3 mr-1" /> Ongeza
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Hakuna rekodi za afya</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsAdding(true)}>
            <Plus className="h-3 w-3 mr-1" /> Ongeza Kwanza
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteRecord(r.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {RECORD_TYPES.find(t => t.value === r.record_type)?.label || r.record_type}
                  </Badge>
                  {r.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {format(new Date(r.created_at), 'dd/MM/yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Ongeza Rekodi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Kichwa</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Mfano: Matokeo ya damu" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Aina</Label>
              <Select value={form.record_type} onValueChange={v => setForm({ ...form, record_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Maelezo</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Maelezo zaidi..." className="mt-1" rows={3} />
            </div>
            <Button className="w-full" onClick={() => addRecord.mutate()} disabled={addRecord.isPending}>
              {addRecord.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Hifadhi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
