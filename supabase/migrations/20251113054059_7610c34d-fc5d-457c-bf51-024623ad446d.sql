-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  area TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Create lead_sources table
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL UNIQUE,
  sub_sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Everyone can view active projects"
  ON public.projects FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Digital marketers can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'digital_marketer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for lead_sources
CREATE POLICY "Everyone can view active lead sources"
  ON public.lead_sources FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage lead sources"
  ON public.lead_sources FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Digital marketers can create lead sources"
  ON public.lead_sources FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'digital_marketer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert some default data
INSERT INTO public.projects (name, category, area) VALUES
  ('Residential Project A', 'Residential', 'Dhaka'),
  ('Commercial Project B', 'Commercial', 'Chittagong'),
  ('Mixed Use Project C', 'Mixed Use', 'Sylhet')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.lead_sources (source_name, sub_sources) VALUES
  ('Website', ARRAY['Contact Form', 'Landing Page', 'Chat Widget']),
  ('Social Media', ARRAY['Facebook', 'Instagram', 'LinkedIn']),
  ('Referral', ARRAY['Client Referral', 'Agent Referral', 'Partner Referral']),
  ('Direct', ARRAY['Walk-in', 'Phone Call', 'Email'])
ON CONFLICT (source_name) DO NOTHING;