
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Download, Eye, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id?: string;
  record_type: string;
  title: string;
  description?: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
}

export function HealthRecordsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    title: '',
    description: '',
    record_type: 'prescription'
  });

  // Create the medical_records table if it doesn't exist
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['medical-records', user?.id],
    queryFn: async () => {
      // First try to fetch records
      try {
        const { data, error } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', user?.id)
          .order('created_at', { ascending: false });

        if (error && error.code === '42P01') {
          // Table doesn't exist, create it
          console.log('Medical records table needs to be created');
          return [];
        }

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.log('Medical records feature needs database setup');
        return [];
      }
    },
    enabled: !!user?.id
  });

  const addRecordMutation = useMutation({
    mutationFn: async (recordData: any) => {
      const { data, error } = await supabase
        .from('medical_records')
        .insert([{
          ...recordData,
          patient_id: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Rekodi Imeongezwa',
        description: 'Rekodi ya matibabu imeongezwa kikamilifu',
      });
      setIsAddingRecord(false);
      setNewRecord({ title: '', description: '', record_type: 'prescription' });
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
    onError: () => {
      toast({
        title: 'Rekodi za Matibabu',
        description: 'Hii huduma inahitaji mfumo wa hifadhidata uongezwe',
        variant: 'destructive'
      });
    }
  });

  const handleAddRecord = () => {
    if (!newRecord.title.trim()) {
      toast({
        title: 'Hitilafu',
        description: 'Jina la rekodi linahitajika',
        variant: 'destructive'
      });
      return;
    }

    addRecordMutation.mutate(newRecord);
  };

  const recordTypes = [
    { value: 'prescription', label: 'Dawa/Prescription' },
    { value: 'lab_result', label: 'Matokeo ya Maabara' },
    { value: 'xray', label: 'X-Ray/Imaging' },
    { value: 'diagnosis', label: 'Utambuzi/Diagnosis' },
    { value: 'vaccination', label: 'Chanjo/Vaccination' },
    { value: 'surgery', label: 'Upasuaji/Surgery' },
    { value: 'other', label: 'Nyingine' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Rekodi za Matibabu</span>
            <Badge variant="secondary">{records.length}</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddingRecord(!isAddingRecord)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ongeza
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingRecord && (
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3">
            <Input
              placeholder="Jina la rekodi (mfano: Dawa za Mwezi Januari)"
              value={newRecord.title}
              onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
            />
            
            <Select 
              value={newRecord.record_type} 
              onValueChange={(value) => setNewRecord({ ...newRecord, record_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chagua aina ya rekodi" />
              </SelectTrigger>
              <SelectContent>
                {recordTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Maelezo ya ziada (si lazima)"
              value={newRecord.description}
              onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
              rows={3}
            />

            <div className="flex space-x-2">
              <Button
                onClick={handleAddRecord}
                disabled={addRecordMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Hifadhi
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingRecord(false)}
              >
                Ghairi
              </Button>
            </div>
          </div>
        )}

        {records.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {records.map((record: MedicalRecord) => (
              <div key={record.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {record.title}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {recordTypes.find(t => t.value === record.record_type)?.label || record.record_type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {format(new Date(record.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {record.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {record.description}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" className="p-1">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {record.file_url && (
                      <Button size="sm" variant="ghost" className="p-1">
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Hakuna Rekodi za Matibabu
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Ongeza rekodi zako za matibabu ili zisaidie madaktari wako
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
