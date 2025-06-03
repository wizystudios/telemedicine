
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useCallSession() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [callSessions, setCallSessions] = useState<any[]>([]);
  const [activeCall, setActiveCall] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchCallSessions = async () => {
      const { data } = await supabase
        .from('call_sessions')
        .select(`
          *,
          patient:profiles!call_sessions_patient_id_fkey(first_name, last_name, avatar_url),
          doctor:profiles!call_sessions_doctor_id_fkey(first_name, last_name, avatar_url)
        `)
        .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      setCallSessions(data || []);
      
      // Find active call
      const active = data?.find(session => session.status === 'ongoing');
      setActiveCall(active);
    };

    fetchCallSessions();

    // Real-time subscription for call updates
    const channel = supabase
      .channel('call-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions'
        },
        (payload) => {
          console.log('Call session update:', payload);
          fetchCallSessions();
          
          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            const isForCurrentUser = payload.new.patient_id === user.id || payload.new.doctor_id === user.id;
            if (isForCurrentUser && payload.new.patient_id !== user.id) {
              toast({
                title: 'Incoming Call Request',
                description: `You have a new ${payload.new.call_type} call request`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const initiateCall = async (doctorId: string, callType: 'audio' | 'video' | 'chat') => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        patient_id: user.id,
        doctor_id: doctorId,
        call_type: callType,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error initiating call:', error);
      return null;
    }

    toast({
      title: 'Call Request Sent',
      description: `Your ${callType} call request has been sent to the doctor`,
    });

    return data;
  };

  const respondToCall = async (sessionId: string, accept: boolean) => {
    const status = accept ? 'accepted' : 'rejected';
    const updates: any = { status };
    
    if (accept) {
      updates.started_at = new Date().toISOString();
      updates.room_id = `room_${sessionId}`;
    }

    const { error } = await supabase
      .from('call_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      console.error('Error responding to call:', error);
      return;
    }

    toast({
      title: accept ? 'Call Accepted' : 'Call Rejected',
      description: accept ? 'The call is starting...' : 'You rejected the call',
    });
  };

  const endCall = async (sessionId: string) => {
    const { error } = await supabase
      .from('call_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending call:', error);
      return;
    }

    setActiveCall(null);
  };

  return {
    callSessions,
    activeCall,
    initiateCall,
    respondToCall,
    endCall
  };
}
