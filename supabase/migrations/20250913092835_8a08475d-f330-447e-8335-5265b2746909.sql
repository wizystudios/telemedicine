-- Add new user roles for the TeleMed Smart Chatbot System
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hospital_owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pharmacy_owner'; 
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lab_owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Create hospitals table
CREATE TABLE public.hospitals (
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
CREATE TABLE public.pharmacies (
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
CREATE TABLE public.laboratories (
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

-- Update doctor_profiles to link to hospitals
ALTER TABLE public.doctor_profiles 
ADD COLUMN hospital_id UUID REFERENCES public.hospitals(id);

-- Create chatbot conversations table
CREATE TABLE public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promotions/ads table
CREATE TABLE public.promotions (
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

-- RLS Policies for hospitals
CREATE POLICY "Anyone can view verified hospitals" 
ON public.hospitals FOR SELECT 
USING (is_verified = true);

CREATE POLICY "Hospital owners can manage their hospitals" 
ON public.hospitals FOR ALL 
USING (owner_id = auth.uid());

-- RLS Policies for pharmacies
CREATE POLICY "Anyone can view verified pharmacies" 
ON public.pharmacies FOR SELECT 
USING (is_verified = true);

CREATE POLICY "Pharmacy owners can manage their pharmacies" 
ON public.pharmacies FOR ALL 
USING (owner_id = auth.uid());

-- RLS Policies for laboratories
CREATE POLICY "Anyone can view verified laboratories" 
ON public.laboratories FOR SELECT 
USING (is_verified = true);

CREATE POLICY "Lab owners can manage their laboratories" 
ON public.laboratories FOR ALL 
USING (owner_id = auth.uid());

-- RLS Policies for chatbot conversations
CREATE POLICY "Users can manage their own chatbot conversations" 
ON public.chatbot_conversations FOR ALL 
USING (user_id = auth.uid() OR user_id IS NULL);

-- RLS Policies for promotions
CREATE POLICY "Admins can manage all promotions" 
ON public.promotions FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Owners can manage their own promotions" 
ON public.promotions FOR SELECT, INSERT, UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Anyone can view active promotions" 
ON public.promotions FOR SELECT 
USING (is_active = true AND start_date <= now() AND end_date >= now());

-- Create indexes for better performance
CREATE INDEX idx_hospitals_verified ON public.hospitals(is_verified);
CREATE INDEX idx_hospitals_promoted ON public.hospitals(is_promoted);
CREATE INDEX idx_pharmacies_verified ON public.pharmacies(is_verified);
CREATE INDEX idx_pharmacies_promoted ON public.pharmacies(is_promoted);
CREATE INDEX idx_laboratories_verified ON public.laboratories(is_verified);
CREATE INDEX idx_laboratories_promoted ON public.laboratories(is_promoted);
CREATE INDEX idx_chatbot_conversations_user ON public.chatbot_conversations(user_id);
CREATE INDEX idx_chatbot_conversations_session ON public.chatbot_conversations(session_id);
CREATE INDEX idx_promotions_active ON public.promotions(is_active, start_date, end_date);

-- Create functions for updating timestamps
CREATE TRIGGER update_hospitals_updated_at
BEFORE UPDATE ON public.hospitals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacies_updated_at
BEFORE UPDATE ON public.pharmacies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_laboratories_updated_at
BEFORE UPDATE ON public.laboratories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_conversations_updated_at
BEFORE UPDATE ON public.chatbot_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();