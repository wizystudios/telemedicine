
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSavedDoctors() {
  const { user } = useAuth();
  const [savedDoctors, setSavedDoctors] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'patient') return;

    const fetchSavedDoctors = async () => {
      const { data } = await supabase
        .from('saved_doctors')
        .select(`
          *,
          doctor:profiles!saved_doctors_doctor_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)
        .eq('patient_id', user.id);
      
      setSavedDoctors(data || []);
    };

    fetchSavedDoctors();
  }, [user]);

  const toggleSaveDoctor = async (doctorId: string) => {
    if (!user || user.role !== 'patient') return;

    const existing = savedDoctors.find(saved => saved.doctor_id === doctorId);
    
    if (existing) {
      const { error } = await supabase
        .from('saved_doctors')
        .delete()
        .eq('id', existing.id);
      
      if (!error) {
        setSavedDoctors(prev => prev.filter(saved => saved.id !== existing.id));
      }
    } else {
      const { data, error } = await supabase
        .from('saved_doctors')
        .insert({
          patient_id: user.id,
          doctor_id: doctorId
        })
        .select(`
          *,
          doctor:profiles!saved_doctors_doctor_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)
        .single();
      
      if (!error && data) {
        setSavedDoctors(prev => [...prev, data]);
      }
    }
  };

  return { savedDoctors, toggleSaveDoctor };
}
