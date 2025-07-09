-- Add message status tracking to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Add real-time subscription for chat_messages
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Enable real-time for chat_messages table
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;