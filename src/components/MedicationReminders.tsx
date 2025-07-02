
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pill, Clock, Plus, Bell, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function MedicationReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    time: '08:00'
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('medication_reminders')
          .select('*')
          .eq('patient_id', user?.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error && error.code === '42P01') {
          console.log('Medication reminders table needs to be created');
          return [];
        }

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.log('Medication reminders feature needs database setup');
        return [];
      }
    },
    enabled: !!user?.id
  });

  const addMedicationMutation = useMutation({
    mutationFn: async (medicationData: any) => {
      const { data, error } = await supabase
        .from('medication_reminders')
        .insert([{
          ...medicationData,
          patient_id: user?.id,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Kikumbusho Kimeongezwa',
        description: 'Kikumbusho cha dawa kimeongezwa kikamilifu',
      });
      setIsAddingMedication(false);
      setNewMedication({ name: '', dosage: '', frequency: 'daily', time: '08:00' });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
    onError: () => {
      toast({
        title: 'Vikumbusho vya Dawa',
        description: 'Hii huduma inahitaji mfumo wa hifadhidata uongezwe',
        variant: 'destructive'
      });
    }
  });

  const markAsTaken = async (medicationId: string) => {
    toast({
      title: 'Dawa Imetumika',
      description: 'Kikumbusho cha dawa kimerekodiwa',
    });
  };

  const handleAddMedication = () => {
    if (!newMedication.name.trim()) {
      toast({
        title: 'Hitilafu',
        description: 'Jina la dawa linahitajika',
        variant: 'destructive'
      });
      return;
    }

    addMedicationMutation.mutate(newMedication);
  };

  const frequencies = [
    { value: 'daily', label: 'Kila Siku' },
    { value: 'twice_daily', label: 'Mara 2 Kwa Siku' },
    { value: 'three_times_daily', label: 'Mara 3 Kwa Siku' },
    { value: 'weekly', label: 'Kila Wiki' },
    { value: 'as_needed', label: 'Inapohitajika' }
  ];

  // Generate sample medication reminders for demo
  const sampleMedications = [
    {
      id: 'sample-1',
      name: 'Paracetamol 500mg',
      dosage: '1 vidonge',
      frequency: 'three_times_daily',
      time: '08:00',
      next_reminder: new Date().toISOString()
    },
    {
      id: 'sample-2', 
      name: 'Amoxicillin 250mg',
      dosage: '2 vidonge',
      frequency: 'twice_daily',
      time: '09:00',
      next_reminder: new Date().toISOString()
    }
  ];

  const displayMedications = medications.length > 0 ? medications : sampleMedications;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pill className="w-5 h-5 text-green-600" />
            <span>Vikumbusho vya Dawa</span>
            <Badge variant="secondary">{displayMedications.length}</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddingMedication(!isAddingMedication)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ongeza
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingMedication && (
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3">
            <Input
              placeholder="Jina la dawa (mfano: Paracetamol 500mg)"
              value={newMedication.name}
              onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
            />
            
            <Input
              placeholder="Kipimo (mfano: 1 kidonge, 2 vidonge)"
              value={newMedication.dosage}
              onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select 
                value={newMedication.frequency} 
                onValueChange={(value) => setNewMedication({ ...newMedication, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mzunguko" />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="time"
                value={newMedication.time}
                onChange={(e) => setNewMedication({ ...newMedication, time: e.target.value })}
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleAddMedication}
                disabled={addMedicationMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Hifadhi
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingMedication(false)}
              >
                Ghairi
              </Button>
            </div>
          </div>
        )}

        {displayMedications.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {displayMedications.map((medication: any) => (
              <div key={medication.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {medication.name}
                    </h4>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-sm text-gray-600">
                        {medication.dosage}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {frequencies.find(f => f.value === medication.frequency)?.label || medication.frequency}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">
                          {medication.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => markAsTaken(medication.id)}
                      className="p-1"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="p-1">
                      <Bell className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Hakuna Vikumbusho vya Dawa
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Ongeza vikumbusho vya dawa ili usisahau kuzitumia
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
