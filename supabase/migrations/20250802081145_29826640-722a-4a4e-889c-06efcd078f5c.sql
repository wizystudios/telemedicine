-- Fix missing user profile for the current user
INSERT INTO public.profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  phone, 
  country,
  created_at,
  updated_at
) VALUES (
  '13621d44-3cb8-4845-90e9-6516235494fc',
  'saidiibrahimu49@gmail.com',
  'said',
  'ibrahim',
  'patient',
  '0613204560',
  'Tanzania',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  country = EXCLUDED.country,
  updated_at = NOW();