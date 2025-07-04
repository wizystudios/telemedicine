
-- Create patient_problems table
CREATE TABLE public.patient_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  problem_text TEXT NOT NULL,
  category TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.patient_problems ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Patients can create their own problems" 
  ON public.patient_problems 
  FOR INSERT 
  WITH CHECK (patient_id = auth.uid() AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'patient'));

CREATE POLICY "Patients can view their own problems" 
  ON public.patient_problems 
  FOR SELECT 
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view all patient problems" 
  ON public.patient_problems 
  FOR SELECT 
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'doctor'));

CREATE POLICY "Doctors can update patient problems" 
  ON public.patient_problems 
  FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'doctor'));

-- Add related_id column to notifications table for linking to patient problems
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;

-- Create index for better performance
CREATE INDEX idx_patient_problems_status ON public.patient_problems(status);
CREATE INDEX idx_patient_problems_urgency ON public.patient_problems(urgency_level);
CREATE INDEX idx_patient_problems_created_at ON public.patient_problems(created_at DESC);
