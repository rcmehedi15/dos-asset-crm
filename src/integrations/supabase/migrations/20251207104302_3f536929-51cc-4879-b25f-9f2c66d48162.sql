-- Add RLS policy for digital marketers to view all profiles (for AGENT column and Activity user names)
CREATE POLICY "Digital marketers can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'digital_marketer'::app_role));

-- Add RLS policy for salesmen to view profiles of other team members (for Activity user names)
CREATE POLICY "Salesmen can view profiles for assigned leads" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'salesman'::app_role) 
  AND (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = profiles.id 
      AND (role = 'admin'::app_role OR role = 'digital_marketer'::app_role)
    )
  )
);