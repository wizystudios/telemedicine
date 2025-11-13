-- Add message status tracking to chat_messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));

-- Create appointment reminders table
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('24_hours', '1_hour')),
  sent_at timestamp with time zone,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for appointment reminders
CREATE POLICY "Users can view their appointment reminders"
ON appointment_reminders FOR SELECT
USING (
  appointment_id IN (
    SELECT id FROM appointments 
    WHERE patient_id = auth.uid() OR doctor_id = auth.uid()
  )
);

-- Create function to schedule reminders
CREATE OR REPLACE FUNCTION schedule_appointment_reminders()
RETURNS trigger AS $$
BEGIN
  -- Insert 24-hour reminder
  INSERT INTO appointment_reminders (appointment_id, reminder_type)
  VALUES (NEW.id, '24_hours');
  
  -- Insert 1-hour reminder
  INSERT INTO appointment_reminders (appointment_id, reminder_type)
  VALUES (NEW.id, '1_hour');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new appointments
DROP TRIGGER IF EXISTS create_appointment_reminders ON appointments;
CREATE TRIGGER create_appointment_reminders
AFTER INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION schedule_appointment_reminders();

-- Enable replica identity for realtime updates
ALTER TABLE chat_messages REPLICA IDENTITY FULL;