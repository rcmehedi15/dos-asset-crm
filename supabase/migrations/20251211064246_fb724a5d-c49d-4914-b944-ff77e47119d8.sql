-- ===============================
-- 1. app_role enum (if not exists)
-- ===============================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'digital_marketer', 'salesman');
  END IF;
END$$;

-- ===============================
-- 2. user_roles table (assumed)
-- ===============================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- ===============================
-- 3. SAFE has_role() function (🔥 FIX)
-- ===============================
CREATE OR REPLACE FUNCTION public.has_role(
  uid uuid,
  role_name app_role
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = uid
      AND role = role_name
  );
$$;

-- ===============================
-- 4. System Settings table
-- ===============================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage system settings"
ON public.system_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and DMs view system settings"
ON public.system_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'digital_marketer')
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===============================
-- 5. Chat Groups
-- ===============================
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_chat_groups_updated_at
BEFORE UPDATE ON public.chat_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===============================
-- 6. Chat Group Members
-- ===============================
CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

-- ===============================
-- 7. Chat Messages
-- ===============================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ===============================
-- 8. RLS: chat_groups (SAFE)
-- ===============================
CREATE POLICY "Admins and DMs create groups"
ON public.chat_groups
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'digital_marketer')
);

CREATE POLICY "Members view groups"
ON public.chat_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_group_members m
    WHERE m.group_id = chat_groups.id
      AND m.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'digital_marketer')
);

CREATE POLICY "Admins and DMs update groups"
ON public.chat_groups
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'digital_marketer')
);

CREATE POLICY "Admins and DMs delete groups"
ON public.chat_groups
FOR DELETE
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'digital_marketer')
);

-- ===============================
-- 9. RLS: chat_group_members
-- ===============================
CREATE POLICY "Admins and DMs manage members"
ON public.chat_group_members
FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'digital_marketer')
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'digital_marketer')
);

CREATE POLICY "Members view own membership"
ON public.chat_group_members
FOR SELECT
USING (user_id = auth.uid());

-- ===============================
-- 10. RLS: chat_messages
-- ===============================
CREATE POLICY "Members send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.chat_group_members m
    WHERE m.group_id = chat_messages.group_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members view messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_group_members m
    WHERE m.group_id = chat_messages.group_id
      AND m.user_id = auth.uid()
  )
);

-- ===============================
-- 11. Default system settings
-- ===============================
INSERT INTO public.system_settings (setting_key, setting_value) VALUES
  ('company', '{"name":"DOS ASSET DEVELOPMENT LTD"}'),
  ('notifications', '{"email_enabled":true,"whatsapp_enabled":false}'),
  ('appearance', '{"primary_color":"#6366f1"}')
ON CONFLICT (setting_key) DO NOTHING;
