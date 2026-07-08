CREATE POLICY "Org owners can view appointments for their doctors"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.doctor_profiles dp
    LEFT JOIN public.hospitals h ON h.id = dp.hospital_id
    LEFT JOIN public.polyclinics pc ON pc.id = dp.polyclinic_id
    WHERE dp.user_id = appointments.doctor_id
      AND (h.owner_id = auth.uid() OR pc.owner_id = auth.uid())
  )
);

CREATE POLICY "Org owners can view appointment patient profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'patient'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctor_profiles dp ON dp.user_id = a.doctor_id
    LEFT JOIN public.hospitals h ON h.id = dp.hospital_id
    LEFT JOIN public.polyclinics pc ON pc.id = dp.polyclinic_id
    WHERE a.patient_id = profiles.id
      AND (h.owner_id = auth.uid() OR pc.owner_id = auth.uid())
  )
);