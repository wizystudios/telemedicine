-- Add RLS policy to allow notifications to be inserted by the system
ALTER POLICY "Users can view their own notifications" ON public.notifications USING (user_id = auth.uid());

-- Create policy to allow inserting notifications (needed for the notification system)
CREATE POLICY "Allow notification creation" ON public.notifications
FOR INSERT WITH CHECK (true);