DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.user_role'::regtype
      AND enumlabel = 'polyclinic_owner'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'polyclinic_owner';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  raw_role text;
  profile_role public.user_role;
  app_role_value public.app_role;
BEGIN
  raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');

  IF raw_role NOT IN ('patient','doctor','admin','hospital_owner','pharmacy_owner','lab_owner','polyclinic_owner') THEN
    raw_role := 'patient';
  END IF;

  profile_role := raw_role::public.user_role;
  app_role_value := raw_role::public.app_role;

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    username,
    phone,
    country_code,
    country
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    profile_role,
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'country_code', ''),
    NULLIF(NEW.raw_user_meta_data->>'country', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.profiles.last_name),
    role = EXCLUDED.role,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, app_role_value)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile/role for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Admins can create managed user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Admins can view managed user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Admins can create managed profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Admins can update managed profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_or_super_admin(auth.uid()))
WITH CHECK (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "Admins can view managed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin_or_super_admin(auth.uid()));