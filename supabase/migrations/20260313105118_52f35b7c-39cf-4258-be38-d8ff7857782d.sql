-- Allow users to update messages in their appointments (mark as read)
CREATE POLICY "Users can update messages in their appointments"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = chat_messages.appointment_id
    AND (appointments.patient_id = auth.uid() OR appointments.doctor_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = chat_messages.appointment_id
    AND (appointments.patient_id = auth.uid() OR appointments.doctor_id = auth.uid())
  )
);