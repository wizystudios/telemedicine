import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Calendar, Pill, Stethoscope, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MedicalRecord {
  id: string;
  patient_id: string;
  record_type: string;
  title: string;
  description: string;
  file_url?: string;
  doctor_id?: string;
  created_at: string;
  updated_at: string;
}

export function MedicalHistoryTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newRecord, setNewRecord] = useState({
    title: '',
    record_type: 'general',
    description: ''
  });

  // Fetch medical records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['medical-records', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MedicalRecord[];
    },
    enabled: !!user?.id
  });

  // Add record mutation
  const addMutation = useMutation({
    mutationFn: async (record: typeof newRecord) => {
      const { data, error } = await supabase
        .from('medical_records')
        .insert([{
          patient_id: user?.id,
          ...record
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', user?.id] });
      setIsAdding(false);
      setNewRecord({ title: '', record_type: 'general', description: '' });
      toast({ title: 'Success', description: 'Medical record added' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add record', variant: 'destructive' });
    }
  });

  const handleAdd = () => {
    if (!newRecord.title) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    addMutation.mutate(newRecord);
  };

  const recordTypes = [
    { value: 'general', label: 'General', icon: FileText },
    { value: 'diagnosis', label: 'Diagnosis', icon: Stethoscope },
    { value: 'prescription', label: 'Prescription', icon: Pill },
    { value: 'lab_result', label: 'Lab Result', icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Medical History</CardTitle>
          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            variant={isAdding ? 'outline' : 'default'}
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdding && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={newRecord.title}
                onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                placeholder="E.g. Annual Checkup"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {recordTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setNewRecord({ ...newRecord, record_type: type.value })}
                    className={`p-2 rounded-lg text-xs flex items-center gap-2 border transition-all ${
                      newRecord.record_type === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <type.icon className="w-3 h-3" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={newRecord.description}
                onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                placeholder="Details..."
                className="text-sm min-h-[60px]"
              />
            </div>
            <Button onClick={handleAdd} size="sm" className="w-full h-8">
              Save Record
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No records yet</p>
          ) : (
            records.map((record) => (
              <div key={record.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{record.title}</h4>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {record.record_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {record.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {record.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(record.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
