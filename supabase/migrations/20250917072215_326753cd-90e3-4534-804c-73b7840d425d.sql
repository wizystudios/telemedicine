-- Make kharifanadhiru01@gmail.com a superadmin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'kharifanadhiru01@gmail.com';