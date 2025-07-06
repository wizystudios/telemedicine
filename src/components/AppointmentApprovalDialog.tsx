
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AppointmentApprovalDialogProps {
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
}

export function AppointmentApprovalDialog({ 
  appointment, 
  isOpen, 
  onClose 
}: AppointmentApprovalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [suggestedDate, setSuggestedDate] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ status, reason, suggestedDateTime }: {
      status: string;
      reason?: string;
      suggestedDateTime?: string;
    }) => {
      const updateData: any = { status };
      
      if (reason) updateData.notes = reason;
      if (suggestedDateTime) updateData.suggested_time = suggestedDateTime;

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment.id);

      if (error) throw error;

      // Create notification for patient
      let message = status === 'approved' ? 'Miadi yako imekubaliwa' : 'Miadi yako imekataliwa';
      if (suggestedDateTime) {
        message += `. Muda uliependekezwa: ${format(new Date(suggestedDateTime), 'dd/MM/yyyy HH:mm')}`;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: appointment.patient_id,
          type: 'appointment',
          title: 'Miadi Imesasishwa',
          message,
          appointment_id: appointment.id
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Miadi Imesasishwa',
        description: 'Mwenye miadi atapokea ujumbe',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Hitilafu',
        description: error.message || 'Imeshindwa kusasisha miadi',
        variant: 'destructive'
      });
    }
  });

  const handleApprove = () => {
    updateAppointmentMutation.mutate({ status: 'approved' });
  };

  const handleReject = () => {
    let suggestedDateTime = '';
    if (suggestedDate && suggestedTime) {
      suggestedDateTime = new Date(`${suggestedDate}T${suggestedTime}`).toISOString();
    }

    updateAppointmentMutation.mutate({
      status: 'rejected',
      reason: rejectionReason,
      suggestedDateTime
    });
  };

  if (!appointment) return null;

  const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Miadi ya {patientName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p><strong>Tarehe:</strong> {format(new Date(appointment.appointment_date), 'dd/MM/yyyy HH:mm')}</p>
            <p><strong>Aina:</strong> {appointment.consultation_type}</p>
            <p><strong>Dalili:</strong> {appointment.symptoms}</p>
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={handleApprove}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={updateAppointmentMutation.isPending}
            >
              Kubali
            </Button>
            <Button 
              onClick={handleReject}
              variant="destructive"
              className="flex-1"
              disabled={updateAppointmentMutation.isPending}
            >
              Kataa
            </Button>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div>
              <Label htmlFor="rejection-reason">Sababu ya Kukataa (si lazima)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Eleza sababu..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="suggested-date">Pendekeza Tarehe</Label>
                <Input
                  id="suggested-date"
                  type="date"
                  value={suggestedDate}
                  onChange={(e) => setSuggestedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="suggested-time">Pendekeza Muda</Label>
                <Input
                  id="suggested-time"
                  type="time"
                  value={suggestedTime}
                  onChange={(e) => setSuggestedTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
