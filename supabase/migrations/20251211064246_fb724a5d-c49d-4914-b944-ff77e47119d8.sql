-- System Settings table (admin-only for global settings)
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system settings
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Digital marketers and admins can view settings
CREATE POLICY "Managers can view system settings"
  ON public.system_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Chat Groups table
CREATE TABLE public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

-- Chat group members table
CREATE TABLE public.chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.chat_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.chat_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- RLS Policies for chat_groups
CREATE POLICY "Admins and DMs can create groups"
  ON public.chat_groups FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role));

CREATE POLICY "Members can view their groups"
  ON public.chat_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members 
      WHERE group_id = chat_groups.id AND user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'digital_marketer'::app_role)
  );

CREATE POLICY "Admins and DMs can update groups"
  ON public.chat_groups FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role));

CREATE POLICY "Admins and DMs can delete groups"
  ON public.chat_groups FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role));

-- RLS Policies for chat_group_members
CREATE POLICY "Admins and DMs can manage members"
  ON public.chat_group_members FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role));

CREATE POLICY "Members can view group membership"
  ON public.chat_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members m
      WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid()
    )
  );

-- RLS Policies for chat_messages
CREATE POLICY "Members can send messages to their groups"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_group_members 
      WHERE group_id = chat_messages.group_id AND user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Members can view messages in their groups"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members 
      WHERE group_id = chat_messages.group_id AND user_id = auth.uid()
    )
  );

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value) VALUES
  ('company', '{"name": "DOS ASSET DEVELOPMENT LTD", "website": "", "email": "", "phone": "", "address": ""}'),
  ('notifications', '{"email_enabled": true, "whatsapp_enabled": false, "followup_reminders": true, "daily_summary": false, "daily_summary_time": "09:00"}'),
  ('integrations', '{"whatsapp": {"provider": "", "api_key": "", "instance_id": ""}, "smtp": {"host": "", "port": "587", "username": "", "password": ""}, "telegram": {"bot_token": "", "chat_id": ""}}'),
  ('appearance', '{"primary_color": "#6366f1", "accent_color": "#22c55e", "sidebar_bg": "", "text_color": ""}')
ON CONFLICT (setting_key) DO NOTHING;