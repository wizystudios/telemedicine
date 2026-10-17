CREATE OR REPLACE FUNCTION public._demo_user(_email text, _first text, _last text, _role text, _phone text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM auth.users WHERE email=_email;
  IF _id IS NULL THEN
    _id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    VALUES (_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',_email,
      extensions.crypt('Demo@12345', extensions.gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name',_first,'last_name',_last,'role',_role,'phone',_phone),'','','','');
  END IF;
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
  SELECT gen_random_uuid(), _id, _id::text, 'email', jsonb_build_object('sub',_id::text,'email',_email,'email_verified',true), now(), now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id=_id AND provider='email');
  RETURN _id;
END; $function$;

UPDATE auth.users SET confirmation_token=coalesce(confirmation_token,''), recovery_token=coalesce(recovery_token,''),
  email_change=coalesce(email_change,''), email_change_token_new=coalesce(email_change_token_new,'')
WHERE email LIKE 'demo.%@telemed.test';

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
SELECT gen_random_uuid(), u.id, u.id::text, 'email', jsonb_build_object('sub',u.id::text,'email',u.email,'email_verified',true), now(), now(), now()
FROM auth.users u WHERE u.email LIKE 'demo.%@telemed.test'
AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id=u.id AND i.provider='email');