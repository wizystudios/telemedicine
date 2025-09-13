-- Create RLS policies for the new tables

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

-- RLS Policies for promotions (separate policies for different operations)
CREATE POLICY "Admins can manage all promotions" 
ON public.promotions FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Owners can view their own promotions" 
ON public.promotions FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can create their own promotions" 
ON public.promotions FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own promotions" 
ON public.promotions FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Anyone can view active promotions" 
ON public.promotions FOR SELECT 
USING (is_active = true AND start_date <= now() AND end_date >= now());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hospitals_verified ON public.hospitals(is_verified);
CREATE INDEX IF NOT EXISTS idx_hospitals_promoted ON public.hospitals(is_promoted);
CREATE INDEX IF NOT EXISTS idx_pharmacies_verified ON public.pharmacies(is_verified);
CREATE INDEX IF NOT EXISTS idx_pharmacies_promoted ON public.pharmacies(is_promoted);
CREATE INDEX IF NOT EXISTS idx_laboratories_verified ON public.laboratories(is_verified);
CREATE INDEX IF NOT EXISTS idx_laboratories_promoted ON public.laboratories(is_promoted);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user ON public.chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session ON public.chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active, start_date, end_date);