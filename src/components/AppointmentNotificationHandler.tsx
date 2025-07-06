
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function AppointmentNotificationHandler() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Listen for new appointments (for doctors)
    const appointmentsChannel = supabase
      .channel('appointments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New appointment received:', payload);
          
          // Get patient info
          const { data: patient } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', payload.new.patient_id)
            .single();

          toast({
            title: 'Ombi Jipya la Miadi',
            description: `${patient?.first_name} ${patient?.last_name} ameomba miadi`,
          });

          // Create notification for doctor
          const { error: doctorNotificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'appointment',
              title: 'Ombi Jipya la Miadi',
              message: `${patient?.first_name} ${patient?.last_name} ameomba miadi`,
              appointment_id: payload.new.id
            });

          if (doctorNotificationError) {
            console.error('Failed to create doctor notification:', doctorNotificationError);
          }

          // Create confirmation notification for patient
          const { error: patientNotificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: payload.new.patient_id,
              type: 'appointment',
              title: 'Ombi la Miadi Limetumwa',
              message: 'Ombi lako la miadi limetumwa. Subiri jibu la daktari.',
              appointment_id: payload.new.id
            });

          if (patientNotificationError) {
            console.error('Failed to create patient notification:', patientNotificationError);
          }

          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Appointment updated:', payload);
          
          if (payload.new.status !== payload.old.status) {
            let message = '';
            if (payload.new.status === 'approved') {
              message = 'Miadi yako imekubaliwa';
            } else if (payload.new.status === 'rejected') {
              message = 'Miadi yako imekataliwa';
            }

            if (message) {
              toast({
                title: 'Miadi Imesasishwa',
                description: message,
              });

              // Create notification for patient
              await supabase
                .from('notifications')
                .insert({
                  user_id: user.id,
                  type: 'appointment',
                  title: 'Miadi Imesasishwa',
                  message,
                  appointment_id: payload.new.id
                });
            }
          }

          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
    };
  }, [user, toast, queryClient]);

  return null;
}
