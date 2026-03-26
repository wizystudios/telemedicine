-- Reviews table (if not exists)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Anyone can view reviews') THEN
    CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Patients can create reviews') THEN
    CREATE POLICY "Patients can create reviews" ON public.reviews FOR INSERT WITH CHECK (patient_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Patients can update own reviews') THEN
    CREATE POLICY "Patients can update own reviews" ON public.reviews FOR UPDATE USING (patient_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Patients can delete own reviews') THEN
    CREATE POLICY "Patients can delete own reviews" ON public.reviews FOR DELETE USING (patient_id = auth.uid());
  END IF;
END $$;

-- Prescriptions table
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  diagnosis text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can create prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "Doctors can update their prescriptions" ON public.prescriptions FOR UPDATE USING (doctor_id = auth.uid());
CREATE POLICY "Patients can view their prescriptions" ON public.prescriptions FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Doctors can view prescriptions they wrote" ON public.prescriptions FOR SELECT USING (doctor_id = auth.uid());

-- Specialties table (needed by doctor registration forms)
CREATE TABLE IF NOT EXISTS public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'specialties' AND policyname = 'Anyone can view specialties') THEN
    CREATE POLICY "Anyone can view specialties" ON public.specialties FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'specialties' AND policyname = 'Admins can manage specialties') THEN
    CREATE POLICY "Admins can manage specialties" ON public.specialties FOR ALL USING (is_super_admin(auth.uid()));
  END IF;
END $$;

-- Insert default specialties if empty
INSERT INTO public.specialties (name, description) 
SELECT * FROM (VALUES 
  ('General Practice', 'Daktari wa jumla'),
  ('Cardiology', 'Moyo na mishipa'),
  ('Dermatology', 'Ngozi'),
  ('Neurology', 'Ubongo na mfumo wa neva'),
  ('Pediatrics', 'Watoto'),
  ('Gynecology', 'Wanawake'),
  ('Orthopedics', 'Mifupa'),
  ('ENT', 'Masikio, Pua na Koo'),
  ('Ophthalmology', 'Macho'),
  ('Dentistry', 'Meno'),
  ('Psychiatry', 'Afya ya akili'),
  ('Surgery', 'Upasuaji')
) AS t(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.specialties LIMIT 1);

-- Trigger to notify patient when prescription is created
CREATE OR REPLACE FUNCTION public.notify_patient_new_prescription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    NEW.patient_id,
    'Dawa Zimeandikwa ✅',
    'Daktari ameandika dawa zako. Tazama na agiza kutoka famasi.',
    'prescription',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_prescription ON public.prescriptions;
CREATE TRIGGER on_new_prescription
  AFTER INSERT ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_patient_new_prescription();