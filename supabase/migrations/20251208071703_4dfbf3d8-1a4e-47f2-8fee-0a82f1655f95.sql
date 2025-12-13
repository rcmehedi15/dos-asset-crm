-- ===========================================
-- Create notifications table
-- ===========================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'lead_assigned',
    'follow_up_due',
    'priority_update'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- ===========================================
-- Create tasks table
-- ===========================================
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own tasks"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- Create function for lead assignment notifications
-- ===========================================
CREATE OR REPLACE FUNCTION public.notify_lead_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lead assigned
  IF NEW.assigned_to IS NOT NULL 
     AND (OLD.assigned_to IS NULL OR NEW.assigned_to != OLD.assigned_to) THEN
    
    INSERT INTO public.notifications (user_id, lead_id, type, title, message)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'lead_assigned',
      'New Lead Assigned',
      'Lead "' || NEW.name || '" has been assigned to you'
    );
  END IF;

  -- Priority update
  IF NEW.priority_status IS NOT NULL 
     AND NEW.priority_status != COALESCE(OLD.priority_status, '') 
     AND NEW.assigned_to IS NOT NULL THEN
    
    INSERT INTO public.notifications (user_id, lead_id, type, title, message)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'priority_update',
      'Priority Update',
      'Lead "' || NEW.name || '" priority changed to ' || NEW.priority_status
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ===========================================
-- Create trigger for the leads table
-- ===========================================
CREATE TRIGGER on_lead_assignment_change
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_lead_assignment();

-- ===========================================
-- Enable realtime for notifications table
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
