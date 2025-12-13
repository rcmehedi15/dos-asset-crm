-- Fix security issues identified in the security review

-- 1. Fix salesmen lead access - remove ability to view unassigned leads
DROP POLICY IF EXISTS "Salesmen can view their assigned leads" ON public.leads;

CREATE POLICY "Salesmen can view their assigned leads" 
ON public.leads 
FOR SELECT 
USING (
  has_role(auth.uid(), 'salesman'::app_role) 
  AND assigned_to = auth.uid()
);

-- 2. Restrict profiles table access - users can only view their own profile
-- Admins can view all profiles for lead assignment purposes
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Strengthen lead_activities access control
DROP POLICY IF EXISTS "Users can view activities for leads they can access" ON public.lead_activities;

CREATE POLICY "Users can view activities for accessible leads" 
ON public.lead_activities 
FOR SELECT 
USING (
  -- Admins can view all activities
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Digital marketers can view all activities
  has_role(auth.uid(), 'digital_marketer'::app_role)
  OR
  -- Salesmen can only view activities for their assigned leads
  (
    has_role(auth.uid(), 'salesman'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_activities.lead_id
      AND leads.assigned_to = auth.uid()
    )
  )
);