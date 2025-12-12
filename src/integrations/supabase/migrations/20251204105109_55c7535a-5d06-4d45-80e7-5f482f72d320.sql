-- Add RLS policy for salesmen to insert their own leads
CREATE POLICY "Salesmen can create their own leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'salesman'::app_role) 
  AND created_by = auth.uid() 
  AND assigned_to = auth.uid()
);