
-- Create medical_records table
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medication_reminders table
CREATE TABLE public.medication_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_reminder TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for medical_records
CREATE POLICY "Patients can view their own medical records" 
  ON public.medical_records 
  FOR SELECT 
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create their own medical records" 
  ON public.medical_records 
  FOR INSERT 
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own medical records" 
  ON public.medical_records 
  FOR UPDATE 
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete their own medical records" 
  ON public.medical_records 
  FOR DELETE 
  USING (auth.uid() = patient_id);

-- Create RLS policies for medication_reminders
CREATE POLICY "Patients can view their own medication reminders" 
  ON public.medication_reminders 
  FOR SELECT 
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create their own medication reminders" 
  ON public.medication_reminders 
  FOR INSERT 
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own medication reminders" 
  ON public.medication_reminders 
  FOR UPDATE 
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete their own medication reminders" 
  ON public.medication_reminders 
  FOR DELETE 
  USING (auth.uid() = patient_id);
