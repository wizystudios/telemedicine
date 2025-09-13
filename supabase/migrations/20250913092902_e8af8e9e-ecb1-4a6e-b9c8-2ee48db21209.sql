-- Add new user roles for the TeleMed Smart Chatbot System
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typcategory = 'E') THEN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor');
  END IF;
  
  -- Add new values to existing enum
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hospital_owner';
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pharmacy_owner'; 
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lab_owner';
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create hospitals table
CREATE TABLE IF NOT EXISTS public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  services TEXT[],
  is_verified BOOLEAN DEFAULT false,
  is_promoted BOOLEAN DEFAULT false,
  promotion_expires_at TIMESTAMP WITH TIME ZONE,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pharmacies table  
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  services TEXT[],
  medications_available TEXT[],
  is_verified BOOLEAN DEFAULT false,
  is_promoted BOOLEAN DEFAULT false,
  promotion_expires_at TIMESTAMP WITH TIME ZONE,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create laboratories table
CREATE TABLE IF NOT EXISTS public.laboratories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  test_types TEXT[],
  is_verified BOOLEAN DEFAULT false,
  is_promoted BOOLEAN DEFAULT false,
  promotion_expires_at TIMESTAMP WITH TIME ZONE,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update doctor_profiles to link to hospitals (only add if column doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctor_profiles' AND column_name='hospital_id') THEN
    ALTER TABLE public.doctor_profiles 
    ADD COLUMN hospital_id UUID REFERENCES public.hospitals(id);
  END IF;
END $$;

-- Create chatbot conversations table
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promotions/ads table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('hospital', 'pharmacy', 'laboratory')),
  entity_id UUID NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;