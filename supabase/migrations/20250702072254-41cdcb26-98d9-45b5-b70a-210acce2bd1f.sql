
-- Allow everyone to view doctor profiles so they can find doctors
CREATE POLICY "Anyone can view doctors" ON public.profiles
FOR SELECT
USING (role = 'doctor');

-- Allow doctors to view patient profiles so they can see their patients  
CREATE POLICY "Doctors can view patients" ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'patient' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'doctor'
  )
);

-- Allow patients to view their own profile and doctor profiles
CREATE POLICY "Patients can view doctors and own profile" ON public.profiles
FOR SELECT  
TO authenticated
USING (
  (role = 'doctor') 
  OR (id = auth.uid() AND role = 'patient')
);
