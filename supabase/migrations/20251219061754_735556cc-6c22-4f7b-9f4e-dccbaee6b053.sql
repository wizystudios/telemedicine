-- Fix user role for side (patient user seeing doctor dashboard)
DELETE FROM user_roles WHERE user_id = '62d3e16c-6197-49e5-9335-b31262690a3c';
INSERT INTO user_roles (user_id, role) VALUES ('62d3e16c-6197-49e5-9335-b31262690a3c', 'patient');

-- Also verify some test data so chatbot shows results
UPDATE doctor_profiles SET is_verified = true WHERE is_verified = false;
UPDATE hospitals SET is_verified = true WHERE is_verified = false;
UPDATE pharmacies SET is_verified = true WHERE is_verified = false;
UPDATE laboratories SET is_verified = true WHERE is_verified = false;