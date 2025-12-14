-- =========================================================
-- 1️⃣ ENUMS
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'digital_marketer', 'salesman');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_source AS ENUM ('website', 'referral', 'social_media', 'phone_call', 'walk_in', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================
-- 2️⃣ USER ROLES TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- =========================================================
-- 3️⃣ PROFILES TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 4️⃣ LEADS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status public.lead_status DEFAULT 'new' NOT NULL,
  source public.lead_source DEFAULT 'website' NOT NULL,
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  property_type TEXT,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 5️⃣ LEAD ACTIVITIES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  activity_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- 6️⃣ ENABLE RLS
-- =========================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 7️⃣ ROLE HELPER FUNCTIONS
-- =========================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id;
$$;

-- =========================================================
-- 8️⃣ RLS POLICIES
-- =========================================================

-- user_roles
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- profiles
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert own" ON public.profiles;

CREATE POLICY "Profiles select"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profiles update own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Profiles insert own"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- leads
CREATE POLICY "Admins view leads"
ON public.leads
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Marketers view leads"
ON public.leads
FOR SELECT
USING (public.has_role(auth.uid(), 'digital_marketer'));

CREATE POLICY "Salesman view assigned"
ON public.leads
FOR SELECT
USING (
  public.has_role(auth.uid(), 'salesman')
  AND (assigned_to = auth.uid() OR assigned_to IS NULL)
);

CREATE POLICY "Create leads"
ON public.leads
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'digital_marketer')
);

-- =========================================================
-- 9️⃣ UPDATED_AT TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 🔟 CREATE PROFILE ON SIGNUP
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 🔥 AUTO ROLE ASSIGN (ADMIN FIRST USER)
-- =========================================================

CREATE OR REPLACE FUNCTION public.assign_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_users
  FROM auth.users
  WHERE id <> NEW.id;

  IF existing_users = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'salesman');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_user_role ON auth.users;

CREATE TRIGGER trigger_assign_user_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_user_role();

-- =========================================================
-- 🧹 EXISTING USERS ROLE BACKFILL
-- =========================================================

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
ORDER BY created_at
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'salesman'::public.app_role
FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM public.user_roles
)
ON CONFLICT DO NOTHING;
