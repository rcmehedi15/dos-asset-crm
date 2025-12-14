-- Add 'notice' to notifications.type check constraint
-- This migration drops the existing constraint and re-creates it including 'notice'

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'lead_assigned',
  'follow_up_due',
  'priority_update',
  'notice'
));

-- Ensure realtime publication still includes the table (no-op if already present)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
