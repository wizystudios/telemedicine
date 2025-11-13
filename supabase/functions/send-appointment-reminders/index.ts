import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Get pending reminders that need to be sent
    const { data: reminders, error: remindersError } = await supabase
      .from('appointment_reminders')
      .select(`
        id,
        reminder_type,
        appointment_id,
        appointments (
          id,
          appointment_date,
          patient_id,
          doctor_id,
          profiles!appointments_doctor_id_fkey (
            first_name,
            last_name
          )
        )
      `)
      .eq('status', 'pending')
      .is('sent_at', null);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} pending reminders`);

    for (const reminder of reminders || []) {
      const appointment = reminder.appointments as any;
      if (!appointment) continue;

      const appointmentDate = new Date(appointment.appointment_date);
      let shouldSend = false;

      // Check if it's time to send the reminder
      if (reminder.reminder_type === '24_hours') {
        const timeDiff = Math.abs(appointmentDate.getTime() - twentyFourHoursFromNow.getTime());
        shouldSend = timeDiff < 30 * 60 * 1000; // Within 30 minutes of 24 hours before
      } else if (reminder.reminder_type === '1_hour') {
        const timeDiff = Math.abs(appointmentDate.getTime() - oneHourFromNow.getTime());
        shouldSend = timeDiff < 5 * 60 * 1000; // Within 5 minutes of 1 hour before
      }

      if (shouldSend) {
        console.log(`Sending ${reminder.reminder_type} reminder for appointment ${appointment.id}`);

        const doctorName = appointment.profiles 
          ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
          : 'your doctor';

        const reminderMessage = reminder.reminder_type === '24_hours'
          ? `Reminder: You have an appointment with ${doctorName} tomorrow at ${new Date(appointment.appointment_date).toLocaleTimeString()}`
          : `Reminder: Your appointment with ${doctorName} is in 1 hour!`;

        // Create notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: appointment.patient_id,
            title: reminder.reminder_type === '24_hours' ? 'Appointment Tomorrow' : 'Appointment Soon',
            message: reminderMessage,
            type: 'appointment_reminder',
            related_id: appointment.id,
            appointment_id: appointment.id
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('appointment_reminders')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id);

        if (updateError) {
          console.error('Error updating reminder:', updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: reminders?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-appointment-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});